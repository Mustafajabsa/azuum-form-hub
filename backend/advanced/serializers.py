from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import SearchQuery, SavedSearch, SearchSuggestion, FileVersion, BulkOperation

User = get_user_model()


class SearchQuerySerializer(serializers.ModelSerializer):
    """Serializer for search queries"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = SearchQuery
        fields = [
            'id', 'user', 'user_email', 'query', 'filters', 'results_count',
            'execution_time', 'search_type', 'created_at'
        ]
        read_only_fields = ['user', 'results_count', 'execution_time', 'created_at']


class SavedSearchSerializer(serializers.ModelSerializer):
    """Serializer for saved searches"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = SavedSearch
        fields = [
            'id', 'user', 'user_email', 'name', 'query', 'filters',
            'search_type', 'is_public', 'usage_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'usage_count', 'created_at', 'updated_at']


class SearchSuggestionSerializer(serializers.ModelSerializer):
    """Serializer for search suggestions"""
    
    class Meta:
        model = SearchSuggestion
        fields = [
            'id', 'query', 'search_type', 'popularity_score',
            'is_active', 'created_at', 'updated_at'
        ]


class FileVersionSerializer(serializers.ModelSerializer):
    """Serializer for file versions"""
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    file_name = serializers.CharField(source='file.name', read_only=True)
    
    class Meta:
        model = FileVersion
        fields = [
            'id', 'file', 'file_name', 'version_number', 'file_path',
            'file_size', 'checksum', 'change_description', 'created_by',
            'created_by_email', 'created_at', 'is_current', 'is_deleted'
        ]
        read_only_fields = [
            'file', 'version_number', 'file_size', 'checksum', 'created_by',
            'created_at', 'is_current'
        ]


class BulkOperationSerializer(serializers.ModelSerializer):
    """Serializer for bulk operations"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    progress_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = BulkOperation
        fields = [
            'id', 'user', 'user_email', 'operation_type', 'status',
            'target_items', 'target_location', 'total_items', 'processed_items',
            'failed_items', 'result_data', 'error_message', 'progress_percentage',
            'created_at', 'started_at', 'completed_at'
        ]
        read_only_fields = [
            'user', 'processed_items', 'failed_items', 'result_data',
            'error_message', 'progress_percentage', 'created_at', 'started_at', 'completed_at'
        ]


class AdvancedSearchSerializer(serializers.Serializer):
    """Advanced search request serializer"""
    query = serializers.CharField(max_length=500, required=False, allow_blank=True)
    search_type = serializers.ChoiceField(
        choices=['files', 'folders', 'forms', 'submissions', 'global'],
        default='global'
    )
    filters = serializers.DictField(default=dict)
    sort_by = serializers.CharField(max_length=50, default='created_at')
    sort_order = serializers.ChoiceField(choices=['asc', 'desc'], default='desc')
    page = serializers.IntegerField(default=1, min_value=1)
    page_size = serializers.IntegerField(default=20, min_value=1, max_value=100)
    
    # Advanced filters
    date_range = serializers.DictField(default=dict)
    size_range = serializers.DictField(default=dict)
    file_types = serializers.ListField(child=serializers.CharField(), default=list)
    tags = serializers.ListField(child=serializers.CharField(), default=list)
    
    def validate_filters(self, value):
        """Validate filter structure"""
        allowed_filters = [
            'owner', 'created_at', 'updated_at', 'file_size', 
            'mime_type', 'status', 'is_shared'
        ]
        
        for key in value.keys():
            if key not in allowed_filters:
                raise serializers.ValidationError(f"Invalid filter: {key}")
        
        return value


class SearchResultSerializer(serializers.Serializer):
    """Search result serializer"""
    query_info = SearchQuerySerializer(read_only=True)
    results = serializers.ListField(read_only=True)
    total_count = serializers.IntegerField(read_only=True)
    page_info = serializers.DictField(read_only=True)
    suggestions = SearchSuggestionSerializer(many=True, read_only=True)
    filters_applied = serializers.DictField(read_only=True)
    execution_time = serializers.FloatField(read_only=True)
