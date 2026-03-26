from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum, Q, F
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
from collections import defaultdict

from config.cache_utils import dashboard_cache, user_cache, CacheManager
from .models import DashboardStats, UserActivitySummary, SystemWideStats
from .serializers import (
    DashboardStatsSerializer, UserActivitySummarySerializer, 
    SystemWideStatsSerializer, DashboardOverviewSerializer
)
from storage.models import Folder, File, UserActivity
from forms.models import Form
from submissions.models import Submission

User = get_user_model()


class DashboardStatsViewSet(viewsets.ModelViewSet):
    """ViewSet for dashboard statistics"""
    serializer_class = DashboardStatsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DashboardStats.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Create or update dashboard stats for user"""
        stats, created = DashboardStats.objects.get_or_create(
            user=self.request.user,
            defaults=serializer.validated_data
        )
        
        if not created:
            # Update existing stats
            for key, value in serializer.validated_data.items():
                setattr(stats, key, value)
            stats.save()
        
        return stats
    
    @action(detail=False, methods=['get'])
    @dashboard_cache(timeout='short')
    def overview(self, request):
        """Get complete dashboard overview"""
        # Get or create user stats
        user_stats, created = DashboardStats.objects.get_or_create(
            user=request.user,
            defaults={
                'total_folders': 0,
                'total_files': 0,
                'total_storage_used': 0,
                'total_forms_created': 0,
                'total_submissions_received': 0,
                'total_logins': 0,
            }
        )
        
        # Update real-time stats
        self._update_user_stats(user_stats)
        
        # Get recent activities
        recent_activities = UserActivitySummary.objects.filter(
            user=request.user
        ).order_by('-date')[:30]
        
        # Get storage breakdown
        storage_breakdown = self._get_storage_breakdown(request.user)
        
        # Get activity chart data
        activity_chart_data = self._get_activity_chart_data(request.user)
        
        # Serialize data
        data = {
            'user_stats': DashboardStatsSerializer(user_stats).data,
            'recent_activities': UserActivitySummarySerializer(recent_activities, many=True).data,
            'storage_breakdown': storage_breakdown,
            'activity_chart_data': activity_chart_data,
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    @user_cache(timeout='medium')
    def storage_analytics(self, request):
        """Get detailed storage analytics"""
        user = request.user
        
        # File type breakdown
        file_types = (
            File.objects.filter(owner=user, is_deleted=False)
            .values('mime_type')
            .annotate(count=Count('id'), size=Sum('file_size'))
            .order_by('-size')
        )
        
        # Storage growth over time
        storage_growth = self._get_storage_growth_data(user)
        
        # Largest files
        largest_files = (
            File.objects.filter(owner=user, is_deleted=False)
            .order_by('-file_size')[:10]
            .values('name', 'file_size', 'mime_type', 'uploaded_at')
        )
        
        return Response({
            'file_types': list(file_types),
            'storage_growth': storage_growth,
            'largest_files': list(largest_files),
        })
    
    def _update_user_stats(self, stats):
        """Update user statistics with real-time data"""
        user = stats.user
        
        # Update storage stats
        stats.total_folders = Folder.objects.filter(
            owner=user, is_deleted=False
        ).count()
        
        stats.total_files = File.objects.filter(
            owner=user, is_deleted=False
        ).count()
        
        stats.total_storage_used = File.objects.filter(
            owner=user, is_deleted=False
        ).aggregate(total=Sum('file_size'))['total'] or 0
        
        # Update form stats
        stats.total_forms_created = Form.objects.filter(
            creator=user
        ).count()
        
        stats.total_submissions_received = Submission.objects.filter(
            form__creator=user
        ).count()
        
        # Update login stats
        if user.last_login and user.last_login > stats.updated_at:
            stats.last_login = user.last_login
            stats.total_logins += 1
        
        stats.save()
    
    def _get_storage_breakdown(self, user):
        """Get storage breakdown by file type"""
        files = File.objects.filter(owner=user, is_deleted=False)
        
        # Group by file type
        breakdown = defaultdict(lambda: {'count': 0, 'size': 0})
        
        for file_obj in files:
            file_type = file_obj.mime_type or 'unknown'
            breakdown[file_type]['count'] += 1
            breakdown[file_type]['size'] += file_obj.file_size
        
        return dict(breakdown)
    
    def _get_activity_chart_data(self, user):
        """Get activity data for charts"""
        # Get last 30 days of activity
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        activities = UserActivitySummary.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        return UserActivitySummarySerializer(activities, many=True).data
    
    def _get_storage_growth_data(self, user):
        """Get storage growth over time"""
        # Get last 12 months of storage data
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=365)
        
        activities = UserActivitySummary.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        growth_data = []
        cumulative_storage = 0
        
        for activity in activities:
            cumulative_storage += activity.storage_added - activity.storage_removed
            growth_data.append({
                'date': activity.date,
                'storage_used': cumulative_storage
            })
        
        return growth_data


class SystemStatsViewSet(viewsets.ModelViewSet):
    """ViewSet for system-wide statistics (admin only)"""
    serializer_class = SystemWideStatsSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    
    def get_queryset(self):
        return SystemWideStats.objects.all().order_by('-date')
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get system-wide overview"""
        today = timezone.now().date()
        
        # Get or create today's stats
        stats, created = SystemWideStats.objects.get_or_create(
            date=today,
            defaults=self._calculate_system_stats()
        )
        
        if not created:
            # Update today's stats
            for key, value in self._calculate_system_stats().items():
                setattr(stats, key, value)
            stats.save()
        
        # Get historical data
        historical_stats = SystemWideStats.objects.filter(
            date__gte=today - timedelta(days=30)
        ).order_by('date')
        
        return Response({
            'current_stats': SystemWideStatsSerializer(stats).data,
            'historical_stats': SystemWideStatsSerializer(historical_stats, many=True).data,
        })
    
    def _calculate_system_stats(self):
        """Calculate current system statistics"""
        # User statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(
            last_login__gte=timezone.now() - timedelta(days=30)
        ).count()
        new_users = User.objects.filter(
            date_joined__date=timezone.now().date()
        ).count()
        
        # Content statistics
        total_forms = Form.objects.count()
        total_submissions = Submission.objects.count()
        total_files = File.objects.filter(is_deleted=False).count()
        total_storage = File.objects.filter(is_deleted=False).aggregate(
            total=Sum('file_size')
        )['total'] or 0
        
        return {
            'total_users': total_users,
            'active_users': active_users,
            'new_users': new_users,
            'total_forms': total_forms,
            'total_submissions': total_submissions,
            'total_files': total_files,
            'total_storage': total_storage,
            'total_logins': 0,  # Would need to track this separately
            'total_api_calls': 0,  # Would need to track this separately
        }
