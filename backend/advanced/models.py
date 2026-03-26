from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class SearchQuery(models.Model):
    """Store user search queries for analytics and optimization"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='search_queries')
    query = models.TextField()
    filters = models.JSONField(default=dict)  # Store applied filters
    results_count = models.IntegerField(default=0)
    execution_time = models.FloatField(help_text="Query execution time in seconds")
    
    # Search metadata
    search_type = models.CharField(
        max_length=20,
        choices=[
            ('files', 'Files'),
            ('folders', 'Folders'),
            ('forms', 'Forms'),
            ('submissions', 'Submissions'),
            ('global', 'Global'),
        ],
        default='global'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Search Query'
        verbose_name_plural = 'Search Queries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['search_type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.search_type} search"


class SavedSearch(models.Model):
    """User-saved search queries for quick access"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_searches')
    name = models.CharField(max_length=255)
    query = models.TextField()
    filters = models.JSONField(default=dict)
    search_type = models.CharField(max_length=20, default='global')
    
    is_public = models.BooleanField(default=False)  # Share with other users
    usage_count = models.IntegerField(default=0)  # Track usage
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Saved Search'
        verbose_name_plural = 'Saved Searches'
        ordering = ['-usage_count', 'name']
        unique_together = ['user', 'name']
    
    def __str__(self):
        return f"{self.user.email} - {self.name}"


class SearchSuggestion(models.Model):
    """Search suggestions based on popular queries"""
    query = models.CharField(max_length=255)
    search_type = models.CharField(max_length=20, default='global')
    popularity_score = models.IntegerField(default=0)  # Based on usage
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Search Suggestion'
        verbose_name_plural = 'Search Suggestions'
        ordering = ['-popularity_score']
        unique_together = ['query', 'search_type']
    
    def __str__(self):
        return f"{self.query} ({self.search_type})"


class FileVersion(models.Model):
    """File versioning system"""
    file = models.ForeignKey('storage.File', on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    file_path = models.FileField(upload_to='storage/versions/')
    file_size = models.BigIntegerField()
    checksum = models.CharField(max_length=64)  # SHA-256 hash
    
    # Version metadata
    change_description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Version flags
    is_current = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = 'File Version'
        verbose_name_plural = 'File Versions'
        ordering = ['-version_number']
        unique_together = ['file', 'version_number']
        indexes = [
            models.Index(fields=['file', '-version_number']),
            models.Index(fields=['created_by', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.file.name} v{self.version_number}"


class BulkOperation(models.Model):
    """Track bulk operations for progress and logging"""
    OPERATION_TYPES = [
        ('delete', 'Delete'),
        ('move', 'Move'),
        ('copy', 'Copy'),
        ('share', 'Share'),
        ('download', 'Download'),
        ('compress', 'Compress'),
    ]
    
    OPERATION_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bulk_operations')
    operation_type = models.CharField(max_length=20, choices=OPERATION_TYPES)
    status = models.CharField(max_length=20, choices=OPERATION_STATUS, default='pending')
    
    # Operation details
    target_items = models.JSONField(default=list)  # List of item IDs
    target_location = models.CharField(max_length=255, blank=True)  # For move/copy operations
    
    # Progress tracking
    total_items = models.IntegerField(default=0)
    processed_items = models.IntegerField(default=0)
    failed_items = models.IntegerField(default=0)
    
    # Results and metadata
    result_data = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Bulk Operation'
        verbose_name_plural = 'Bulk Operations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.operation_type} ({self.status})"
    
    @property
    def progress_percentage(self):
        """Calculate progress percentage"""
        if self.total_items == 0:
            return 0
        return (self.processed_items / self.total_items) * 100
