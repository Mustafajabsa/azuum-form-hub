from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Sum
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
from django.core.paginator import Paginator
import hashlib
import time

from .models import SearchQuery, SavedSearch, SearchSuggestion, FileVersion, BulkOperation
from .serializers import (
    SearchQuerySerializer, SavedSearchSerializer, SearchSuggestionSerializer,
    FileVersionSerializer, BulkOperationSerializer, AdvancedSearchSerializer,
    SearchResultSerializer
)
from storage.models import Folder, File
from forms.models import Form
from submissions.models import Submission

User = get_user_model()


class AdvancedSearchViewSet(viewsets.ViewSet):
    """ViewSet for advanced search functionality"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """Perform advanced search across all content types"""
        start_time = time.time()
        
        serializer = AdvancedSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        query = serializer.validated_data['query']
        search_type = serializer.validated_data['search_type']
        filters = serializer.validated_data['filters']
        sort_by = serializer.validated_data['sort_by']
        sort_order = serializer.validated_data['sort_order']
        page = serializer.validated_data['page']
        page_size = serializer.validated_data['page_size']
        
        # Build search query
        results = []
        total_count = 0
        
        if search_type in ['files', 'global']:
            file_results = self._search_files(
                request.user, query, filters, sort_by, sort_order
            )
            results.extend(file_results)
            total_count += len(file_results)
        
        if search_type in ['folders', 'global']:
            folder_results = self._search_folders(
                request.user, query, filters, sort_by, sort_order
            )
            results.extend(folder_results)
            total_count += len(folder_results)
        
        if search_type in ['forms', 'global']:
            form_results = self._search_forms(
                request.user, query, filters, sort_by, sort_order
            )
            results.extend(form_results)
            total_count += len(form_results)
        
        if search_type in ['submissions', 'global']:
            submission_results = self._search_submissions(
                request.user, query, filters, sort_by, sort_order
            )
            results.extend(submission_results)
            total_count += len(submission_results)
        
        # Sort results
        if sort_order == 'desc':
            results.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        else:
            results.sort(key=lambda x: x.get('created_at', ''))
        
        # Paginate results
        paginator = Paginator(results, page_size)
        page_obj = paginator.get_page(page)
        
        # Calculate execution time
        execution_time = time.time() - start_time
        
        # Log search query
        search_query = SearchQuery.objects.create(
            user=request.user,
            query=query,
            filters=filters,
            results_count=total_count,
            execution_time=execution_time,
            search_type=search_type
        )
        
        # Update search suggestions
        self._update_search_suggestions(query, search_type)
        
        # Get search suggestions
        suggestions = SearchSuggestion.objects.filter(
            search_type=search_type,
            is_active=True
        ).order_by('-popularity_score')[:10]
        
        # Prepare response
        response_data = {
            'query_info': SearchQuerySerializer(search_query).data,
            'results': list(page_obj),
            'total_count': total_count,
            'page_info': {
                'current_page': page,
                'total_pages': paginator.num_pages,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'page_size': page_size
            },
            'suggestions': SearchSuggestionSerializer(suggestions, many=True).data,
            'filters_applied': filters,
            'execution_time': execution_time
        }
        
        return Response(response_data)
    
    def _search_files(self, user, query, filters, sort_by, sort_order):
        """Search files"""
        queryset = File.objects.filter(owner=user, is_deleted=False)
        
        # Apply text search
        if query:
            queryset = queryset.filter(
                Q(name__icontains=query) |
                Q(original_name__icontains=query)
            )
        
        # Apply filters
        if 'mime_type' in filters:
            queryset = queryset.filter(mime_type=filters['mime_type'])
        
        if 'file_size' in filters:
            size_filter = filters['file_size']
            if 'min' in size_filter:
                queryset = queryset.filter(file_size__gte=size_filter['min'])
            if 'max' in size_filter:
                queryset = queryset.filter(file_size__lte=size_filter['max'])
        
        if 'created_at' in filters:
            date_filter = filters['created_at']
            if 'start' in date_filter:
                queryset = queryset.filter(created_at__gte=date_filter['start'])
            if 'end' in date_filter:
                queryset = queryset.filter(created_at__lte=date_filter['end'])
        
        # Apply sorting
        if sort_by == 'name':
            queryset = queryset.order_by(f'{"-" if sort_order == "desc" else ""}name')
        elif sort_by == 'size':
            queryset = queryset.order_by(f'{"-" if sort_order == "desc" else ""}file_size')
        else:
            queryset = queryset.order_by(f'{"-" if sort_order == "desc" else ""}uploaded_at')
        
        # Serialize results
        return [
            {
                'type': 'file',
                'id': str(file.id),
                'name': file.name,
                'original_name': file.original_name,
                'file_size': file.file_size,
                'mime_type': file.mime_type,
                'folder': file.folder.name if file.folder else None,
                'uploaded_at': file.uploaded_at.isoformat(),
                'updated_at': file.uploaded_at.isoformat(),
            }
            for file in queryset[:50]  # Limit to 50 results per type
        ]
    
    def _search_folders(self, user, query, filters, sort_by, sort_order):
        """Search folders"""
        queryset = Folder.objects.filter(owner=user, is_deleted=False)
        
        # Apply text search
        if query:
            queryset = queryset.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query)
            )
        
        # Apply filters
        if 'created_at' in filters:
            date_filter = filters['created_at']
            if 'start' in date_filter:
                queryset = queryset.filter(created_at__gte=date_filter['start'])
            if 'end' in date_filter:
                queryset = queryset.filter(created_at__lte=date_filter['end'])
        
        # Apply sorting
        if sort_by == 'name':
            queryset = queryset.order_by(f'{"-" if sort_order == "desc" else ""}name')
        else:
            queryset = queryset.order_by(f'{"-" if sort_order == "desc" else ""}created_at')
        
        # Serialize results
        return [
            {
                'type': 'folder',
                'id': str(folder.id),
                'name': folder.name,
                'description': folder.description,
                'parent': folder.parent.name if folder.parent else None,
                'file_count': folder.files.filter(is_deleted=False).count(),
                'created_at': folder.created_at.isoformat(),
                'updated_at': folder.updated_at.isoformat(),
            }
            for folder in queryset[:50]
        ]
    
    def _search_forms(self, user, query, filters, sort_by, sort_order):
        """Search forms"""
        queryset = Form.objects.filter(creator=user)
        
        # Apply text search
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query) |
                Q(description__icontains=query)
            )
        
        # Apply filters
        if 'status' in filters:
            queryset = queryset.filter(status=filters['status'])
        
        # Apply sorting
        if sort_by == 'title':
            queryset = queryset.order_by(f'{"-" if sort_order == "desc" else ""}title')
        else:
            queryset = queryset.order_by(f'{"-" if sort_order == "desc" else ""}created_at')
        
        # Serialize results
        return [
            {
                'type': 'form',
                'id': str(form.id),
                'title': form.title,
                'description': form.description,
                'status': form.status,
                'submission_count': form.submissions.count(),
                'created_at': form.created_at.isoformat(),
                'updated_at': form.updated_at.isoformat(),
            }
            for form in queryset[:50]
        ]
    
    def _search_submissions(self, user, query, filters, sort_by, sort_order):
        """Search submissions"""
        queryset = Submission.objects.filter(
            Q(submitter=user) | Q(form__creator=user)
        ).distinct()
        
        # Apply text search (search in form data JSON)
        if query:
            queryset = queryset.filter(
                Q(form__title__icontains=query) |
                Q(data__icontains=query)
            )
        
        # Apply sorting
        if sort_by == 'submitted_at':
            queryset = queryset.order_by(f'{"-" if sort_order == "desc" else ""}submitted_at')
        else:
            queryset = queryset.order_by(f'{"-" if sort_order == "desc" else ""}submitted_at')
        
        # Serialize results
        return [
            {
                'type': 'submission',
                'id': str(submission.id),
                'form_title': submission.form.title,
                'submitter': submission.submitter.email,
                'submitted_at': submission.submitted_at.isoformat(),
                'data_keys': list(submission.data.keys())[:5],  # First 5 field names
            }
            for submission in queryset[:50]
        ]
    
    def _update_search_suggestions(self, query, search_type):
        """Update search suggestions based on query"""
        if len(query) < 3:  # Only update for queries with 3+ characters
            return
        
        suggestion, created = SearchSuggestion.objects.get_or_create(
            query=query.lower(),
            search_type=search_type,
            defaults={'popularity_score': 1}
        )
        
        if not created:
            suggestion.popularity_score += 1
            suggestion.save()
    
    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """Get search suggestions"""
        search_type = request.query_params.get('type', 'global')
        query = request.query_params.get('q', '')
        
        suggestions = SearchSuggestion.objects.filter(
            search_type=search_type,
            is_active=True
        ).filter(
            query__icontains=query
        ).order_by('-popularity_score')[:10]
        
        return Response(SearchSuggestionSerializer(suggestions, many=True).data)


class SavedSearchViewSet(viewsets.ModelViewSet):
    """ViewSet for saved searches"""
    serializer_class = SavedSearchSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SavedSearch.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute a saved search"""
        saved_search = self.get_object()
        
        # Increment usage count
        saved_search.usage_count += 1
        saved_search.save()
        
        # Execute the search using the saved parameters
        search_data = {
            'query': saved_search.query,
            'search_type': saved_search.search_type,
            'filters': saved_search.filters,
        }
        
        # Use the search endpoint logic
        search_viewset = AdvancedSearchViewSet()
        search_viewset.request = request
        search_viewset.format_kwarg = None
        
        return search_viewset.search(request)


class FileVersionViewSet(viewsets.ModelViewSet):
    """ViewSet for file versioning"""
    serializer_class = FileVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FileVersion.objects.filter(
            file__owner=self.request.user,
            is_deleted=False
        )
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore a file version"""
        version = self.get_object()
        file_obj = version.file
        
        # Create new version with current file
        current_version_number = file_obj.versions.filter(is_current=True).first()
        if current_version_number:
            current_version_number.is_current = False
            current_version_number.save()
        
        # Create new version from restored version
        new_version = FileVersion.objects.create(
            file=file_obj,
            version_number=current_version_number.version_number + 1 if current_version_number else 1,
            file_path=version.file_path,
            file_size=version.file_size,
            checksum=version.checksum,
            change_description=f"Restored from version {version.version_number}",
            created_by=request.user,
            is_current=True
        )
        
        return Response(FileVersionSerializer(new_version).data)


class BulkOperationViewSet(viewsets.ModelViewSet):
    """ViewSet for bulk operations"""
    serializer_class = BulkOperationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return BulkOperation.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def delete_items(self, request):
        """Bulk delete items"""
        item_ids = request.data.get('items', [])
        item_type = request.data.get('type', 'files')  # files, folders, forms
        
        operation = BulkOperation.objects.create(
            user=request.user,
            operation_type='delete',
            target_items=item_ids,
            total_items=len(item_ids),
            status='processing'
        )
        
        # Process bulk delete asynchronously (in real app, use Celery)
        self._process_bulk_delete(operation, item_ids, item_type)
        
        return Response(BulkOperationSerializer(operation).data)
    
    def _process_bulk_delete(self, operation, item_ids, item_type):
        """Process bulk delete operation"""
        operation.status = 'processing'
        operation.started_at = timezone.now()
        operation.save()
        
        processed = 0
        failed = 0
        
        try:
            if item_type == 'files':
                for item_id in item_ids:
                    try:
                        file_obj = File.objects.get(
                            id=item_id, 
                            owner=operation.user, 
                            is_deleted=False
                        )
                        file_obj.is_deleted = True
                        file_obj.save()
                        processed += 1
                    except File.DoesNotExist:
                        failed += 1
            
            elif item_type == 'folders':
                for item_id in item_ids:
                    try:
                        folder = Folder.objects.get(
                            id=item_id,
                            owner=operation.user,
                            is_deleted=False
                        )
                        folder.is_deleted = True
                        folder.save()
                        processed += 1
                    except Folder.DoesNotExist:
                        failed += 1
            
            operation.status = 'completed'
            operation.processed_items = processed
            operation.failed_items = failed
            operation.completed_at = timezone.now()
            operation.save()
            
        except Exception as e:
            operation.status = 'failed'
            operation.error_message = str(e)
            operation.completed_at = timezone.now()
            operation.save()
