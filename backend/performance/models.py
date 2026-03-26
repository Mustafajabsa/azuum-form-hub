from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class PerformanceMetric(models.Model):
    """Store performance metrics for monitoring"""
    
    METRIC_TYPES = [
        ('api_call', 'API Call'),
        ('query', 'Database Query'),
        ('cache_hit', 'Cache Hit'),
        ('cache_miss', 'Cache Miss'),
        ('file_upload', 'File Upload'),
        ('file_download', 'File Download'),
        ('search', 'Search Query'),
    ]
    
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPES)
    endpoint = models.CharField(max_length=255, blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Performance data
    execution_time = models.FloatField(help_text="Execution time in seconds")
    memory_usage = models.BigIntegerField(null=True, blank=True, help_text="Memory usage in bytes")
    
    # Additional metadata
    request_size = models.IntegerField(null=True, blank=True, help_text="Request size in bytes")
    response_size = models.IntegerField(null=True, blank=True, help_text="Response size in bytes")
    status_code = models.IntegerField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Performance Metric'
        verbose_name_plural = 'Performance Metrics'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['metric_type', '-created_at']),
            models.Index(fields=['endpoint', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.metric_type} - {self.endpoint} ({self.execution_time:.3f}s)"


class CacheStatistics(models.Model):
    """Track cache performance statistics"""
    
    date = models.DateField()
    cache_key_pattern = models.CharField(max_length=255)
    
    # Statistics
    total_requests = models.IntegerField(default=0)
    cache_hits = models.IntegerField(default=0)
    cache_misses = models.IntegerField(default=0)
    
    # Performance metrics
    avg_response_time = models.FloatField(default=0.0)
    avg_cache_hit_time = models.FloatField(default=0.0)
    avg_cache_miss_time = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Cache Statistics'
        verbose_name_plural = 'Cache Statistics'
        unique_together = ['date', 'cache_key_pattern']
        ordering = ['-date']
    
    def __str__(self):
        return f"Cache Stats - {self.date} - {self.cache_key_pattern}"
    
    @property
    def hit_rate(self):
        """Calculate cache hit rate"""
        if self.total_requests == 0:
            return 0.0
        return (self.cache_hits / self.total_requests) * 100


class SystemHealth(models.Model):
    """Track system health metrics"""
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Database metrics
    db_connections = models.IntegerField(default=0)
    db_queries_per_second = models.FloatField(default=0.0)
    avg_query_time = models.FloatField(default=0.0)
    
    # Cache metrics
    cache_memory_usage = models.BigIntegerField(default=0)
    cache_hit_rate = models.FloatField(default=0.0)
    
    # System metrics
    cpu_usage = models.FloatField(default=0.0)
    memory_usage = models.FloatField(default=0.0)
    disk_usage = models.FloatField(default=0.0)
    
    # Application metrics
    active_users = models.IntegerField(default=0)
    requests_per_second = models.FloatField(default=0.0)
    avg_response_time = models.FloatField(default=0.0)
    
    class Meta:
        verbose_name = 'System Health'
        verbose_name_plural = 'System Health'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"System Health - {self.timestamp}"


class APIEndpointMetrics(models.Model):
    """Track API endpoint performance"""
    
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10)  # GET, POST, PUT, DELETE
    
    # Performance metrics
    total_requests = models.IntegerField(default=0)
    avg_response_time = models.FloatField(default=0.0)
    min_response_time = models.FloatField(default=0.0)
    max_response_time = models.FloatField(default=0.0)
    
    # Error tracking
    error_count = models.IntegerField(default=0)
    error_rate = models.FloatField(default=0.0)
    
    # Status codes
    status_200 = models.IntegerField(default=0)
    status_400 = models.IntegerField(default=0)
    status_401 = models.IntegerField(default=0)
    status_403 = models.IntegerField(default=0)
    status_404 = models.IntegerField(default=0)
    status_500 = models.IntegerField(default=0)
    
    # Timestamps
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'API Endpoint Metrics'
        verbose_name_plural = 'API Endpoint Metrics'
        unique_together = ['endpoint', 'method', 'date']
        ordering = ['-date', '-total_requests']
    
    def __str__(self):
        return f"{self.method} {self.endpoint} - {self.date}"
    
    @property
    def success_rate(self):
        """Calculate success rate (2xx status codes)"""
        if self.total_requests == 0:
            return 0.0
        return (self.status_200 / self.total_requests) * 100
