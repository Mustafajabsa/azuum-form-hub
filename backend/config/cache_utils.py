from django.core.cache import cache
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.decorators import action
from rest_framework.response import Response
from functools import wraps
import hashlib
import json
import time

class CacheManager:
    """Advanced caching manager for API responses and data"""
    
    CACHE_TIMEOUTS = {
        'short': 60 * 5,      # 5 minutes
        'medium': 60 * 30,    # 30 minutes
        'long': 60 * 60 * 2, # 2 hours
        'daily': 60 * 60 * 24, # 24 hours
    }
    
    @staticmethod
    def get_cache_key(prefix, user_id, *args, **kwargs):
        """Generate consistent cache key"""
        key_parts = [prefix, str(user_id)]
        
        # Add arguments to key
        for arg in args:
            key_parts.append(str(arg))
        
        # Add keyword arguments to key
        for k, v in sorted(kwargs.items()):
            key_parts.append(f"{k}:{v}")
        
        # Create hash for long keys
        key_string = ":".join(key_parts)
        if len(key_string) > 250:
            key_hash = hashlib.md5(key_string.encode()).hexdigest()
            return f"{prefix}:{user_id}:{key_hash}"
        
        return key_string
    
    @staticmethod
    def cache_response(cache_key, data, timeout='medium'):
        """Cache response data"""
        timeout_seconds = CacheManager.CACHE_TIMEOUTS.get(timeout, CacheManager.CACHE_TIMEOUTS['medium'])
        cache.set(cache_key, data, timeout_seconds)
    
    @staticmethod
    def get_cached_response(cache_key):
        """Get cached response"""
        return cache.get(cache_key)
    
    @staticmethod
    def invalidate_cache_pattern(pattern):
        """Invalidate cache keys matching pattern"""
        # This would require Redis or similar for pattern matching
        # For now, we'll use a simple approach
        cache.delete_many([key for key in cache._cache.keys() if pattern in key])


def api_cache(timeout='medium', key_prefix='api'):
    """Decorator for caching API responses"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Only cache GET requests
            if request.method != 'GET':
                return func(self, request, *args, **kwargs)
            
            # Generate cache key
            user_id = getattr(request.user, 'id', 'anonymous')
            cache_key = CacheManager.get_cache_key(
                key_prefix, user_id, 
                request.path, 
                request.GET.dict(),
                *args, **kwargs
            )
            
            # Try to get cached response
            cached_data = CacheManager.get_cached_response(cache_key)
            if cached_data is not None:
                return Response(cached_data)
            
            # Execute function and cache result
            response = func(self, request, *args, **kwargs)
            
            if response.status_code == 200:
                CacheManager.cache_response(cache_key, response.data, timeout)
            
            return response
        
        return wrapper
    return decorator


def user_cache(timeout='medium'):
    """Decorator for caching user-specific data"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            if not request.user.is_authenticated:
                return func(self, request, *args, **kwargs)
            
            # Generate cache key for user
            cache_key = CacheManager.get_cache_key(
                'user', request.user.id,
                func.__name__, *args, **kwargs
            )
            
            # Try to get cached data
            cached_data = CacheManager.get_cached_response(cache_key)
            if cached_data is not None:
                return Response(cached_data)
            
            # Execute function and cache result
            response = func(self, request, *args, **kwargs)
            
            if response.status_code == 200:
                CacheManager.cache_response(cache_key, response.data, timeout)
            
            return response
        
        return wrapper
    return decorator


def dashboard_cache(timeout='short'):
    """Decorator for caching dashboard data"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            if not request.user.is_authenticated:
                return func(self, request, *args, **kwargs)
            
            # Dashboard data changes frequently, use short cache
            cache_key = CacheManager.get_cache_key(
                'dashboard', request.user.id,
                func.__name__, *args, **kwargs
            )
            
            # Try to get cached data
            cached_data = CacheManager.get_cached_response(cache_key)
            if cached_data is not None:
                return Response(cached_data)
            
            # Execute function and cache result
            response = func(self, request, *args, **kwargs)
            
            if response.status_code == 200:
                CacheManager.cache_response(cache_key, response.data, timeout)
            
            return response
        
        return wrapper
    return decorator


class CacheInvalidationMixin:
    """Mixin for automatic cache invalidation"""
    
    def invalidate_user_cache(self, user_id):
        """Invalidate all cache for a user"""
        patterns = [
            f'user:{user_id}:*',
            f'dashboard:{user_id}:*',
            f'api:{user_id}:*'
        ]
        
        for pattern in patterns:
            CacheManager.invalidate_cache_pattern(pattern)
    
    def invalidate_object_cache(self, obj_type, obj_id):
        """Invalidate cache for specific object"""
        cache_key = f'{obj_type}:{obj_id}'
        cache.delete(cache_key)


class QueryOptimizer:
    """Optimize database queries for better performance"""
    
    @staticmethod
    def optimize_queryset(queryset, select_related=None, prefetch_related=None):
        """Apply query optimizations"""
        if select_related:
            queryset = queryset.select_related(*select_related)
        
        if prefetch_related:
            queryset = queryset.prefetch_related(*prefetch_related)
        
        return queryset
    
    @staticmethod
    def get_queryset_with_counts(queryset, count_fields=None):
        """Get queryset with optimized counts"""
        if count_fields:
            for field in count_fields:
                queryset = queryset.annotate(**{f'{field}_count': Count(field)})
        
        return queryset


class PerformanceMonitor:
    """Monitor API performance and cache hit rates"""
    
    @staticmethod
    def log_cache_hit(cache_key, hit=True):
        """Log cache hit/miss"""
        log_data = {
            'cache_key': cache_key,
            'hit': hit,
            'timestamp': time.time()
        }
        
        # In production, this would go to a monitoring system
        # For now, we'll just print it
        print(f"Cache {'HIT' if hit else 'MISS'}: {cache_key}")
    
    @staticmethod
    def log_query_performance(query, execution_time):
        """Log query performance"""
        log_data = {
            'query': str(query),
            'execution_time': execution_time,
            'timestamp': time.time()
        }
        
        print(f"Query Performance: {execution_time:.4f}s - {query[:100]}...")
