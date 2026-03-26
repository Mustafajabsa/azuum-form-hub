from rest_framework import serializers
from .models import PerformanceMetric, CacheStatistics, SystemHealth, APIEndpointMetrics


class PerformanceMetricSerializer(serializers.ModelSerializer):
    """Serializer for performance metrics"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = PerformanceMetric
        fields = [
            'id', 'metric_type', 'endpoint', 'user', 'user_email',
            'execution_time', 'memory_usage', 'request_size', 'response_size',
            'status_code', 'created_at'
        ]


class CacheStatisticsSerializer(serializers.ModelSerializer):
    """Serializer for cache statistics"""
    hit_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = CacheStatistics
        fields = [
            'id', 'date', 'cache_key_pattern', 'total_requests',
            'cache_hits', 'cache_misses', 'hit_rate', 'avg_response_time',
            'avg_cache_hit_time', 'avg_cache_miss_time', 'created_at', 'updated_at'
        ]


class SystemHealthSerializer(serializers.ModelSerializer):
    """Serializer for system health metrics"""
    
    class Meta:
        model = SystemHealth
        fields = [
            'id', 'timestamp', 'db_connections', 'db_queries_per_second',
            'avg_query_time', 'cache_memory_usage', 'cache_hit_rate',
            'cpu_usage', 'memory_usage', 'disk_usage', 'active_users',
            'requests_per_second', 'avg_response_time'
        ]


class APIEndpointMetricsSerializer(serializers.ModelSerializer):
    """Serializer for API endpoint metrics"""
    success_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = APIEndpointMetrics
        fields = [
            'id', 'endpoint', 'method', 'total_requests', 'avg_response_time',
            'min_response_time', 'max_response_time', 'error_count', 'error_rate',
            'success_rate', 'status_200', 'status_400', 'status_401',
            'status_403', 'status_404', 'status_500', 'date',
            'created_at', 'updated_at'
        ]


class PerformanceOverviewSerializer(serializers.Serializer):
    """Combined performance overview serializer"""
    system_health = SystemHealthSerializer(read_only=True)
    top_slow_endpoints = APIEndpointMetricsSerializer(many=True, read_only=True)
    cache_statistics = CacheStatisticsSerializer(many=True, read_only=True)
    recent_metrics = PerformanceMetricSerializer(many=True, read_only=True)
    
    def validate(self, data):
        return data
