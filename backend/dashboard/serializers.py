from rest_framework import serializers
from .models import DashboardStats, UserActivitySummary, SystemWideStats


class DashboardStatsSerializer(serializers.ModelSerializer):
    """Serializer for dashboard statistics"""
    storage_used_percentage = serializers.ReadOnlyField()
    storage_used_display = serializers.ReadOnlyField()
    storage_limit_display = serializers.ReadOnlyField()
    
    class Meta:
        model = DashboardStats
        fields = [
            'total_folders', 'total_files', 'total_storage_used', 
            'total_storage_limit', 'total_forms_created', 
            'total_submissions_received', 'last_login', 'total_logins',
            'storage_used_percentage', 'storage_used_display', 
            'storage_limit_display', 'created_at', 'updated_at'
        ]


class UserActivitySummarySerializer(serializers.ModelSerializer):
    """Serializer for user activity summaries"""
    
    class Meta:
        model = UserActivitySummary
        fields = [
            'date', 'files_uploaded', 'files_downloaded', 
            'folders_created', 'forms_created', 'submissions_made',
            'storage_added', 'storage_removed', 'created_at'
        ]


class SystemWideStatsSerializer(serializers.ModelSerializer):
    """Serializer for system-wide statistics"""
    
    class Meta:
        model = SystemWideStats
        fields = [
            'date', 'total_users', 'active_users', 'new_users',
            'total_forms', 'total_submissions', 'total_files',
            'total_storage', 'total_logins', 'total_api_calls',
            'created_at'
        ]


class DashboardOverviewSerializer(serializers.Serializer):
    """Combined dashboard overview serializer"""
    user_stats = DashboardStatsSerializer()
    recent_activities = UserActivitySummarySerializer(many=True)
    storage_breakdown = serializers.DictField()
    activity_chart_data = serializers.ListField()
    
    def validate(self, data):
        return data
