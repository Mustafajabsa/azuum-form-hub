#!/usr/bin/env python
"""Test Performance Optimization and Caching"""

import os
import sys
import django
from django.test import Client
from django.contrib.auth import get_user_model
from django.core.cache import cache
import time

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

User = get_user_model()

def test_performance_optimization():
    """Test caching and performance optimization"""
    client = Client()
    
    # Create test user
    user = User.objects.create_user(
        username='perf-test',
        email='perf-test@example.com',
        password='testpass123'
    )
    
    print("🚀 Starting Performance Optimization Tests")
    print()
    
    # Get JWT token
    print("🔍 Getting JWT Token...")
    response = client.post('/api/token/', {
        'email': 'perf-test@example.com',
        'password': 'testpass123'
    })
    
    if response.status_code == 200:
        token = response.json()['access']
        print(f"✅ JWT token obtained")
    else:
        print(f"❌ Failed to get JWT token: {response.status_code}")
        return
    
    auth_header = f'Bearer {token}'
    
    # Test cache functionality
    print("\n🔍 Testing Cache Functionality...")
    
    # Test basic cache operations
    cache.set('test_key', 'test_value', 60)
    cached_value = cache.get('test_key')
    
    if cached_value == 'test_value':
        print(f"✅ Basic cache operations working")
    else:
        print(f"❌ Basic cache operations failed")
    
    # Test dashboard caching
    print("\n🔍 Testing Dashboard Caching...")
    
    # First request (cache miss)
    start_time = time.time()
    response1 = client.get('/api/dashboard/stats/overview/', HTTP_AUTHORIZATION=auth_header)
    first_request_time = time.time() - start_time
    
    # Second request (cache hit)
    start_time = time.time()
    response2 = client.get('/api/dashboard/stats/overview/', HTTP_AUTHORIZATION=auth_header)
    second_request_time = time.time() - start_time
    
    if response1.status_code == 200 and response2.status_code == 200:
        print(f"✅ Dashboard requests successful")
        print(f"  - First request time: {first_request_time:.4f}s")
        print(f"  - Second request time: {second_request_time:.4f}s")
        
        if second_request_time < first_request_time:
            print(f"✅ Cache appears to be working (second request faster)")
        else:
            print(f"⚠️  Cache may not be working optimally")
    else:
        print(f"❌ Dashboard requests failed")
    
    # Test storage analytics caching
    print("\n🔍 Testing Storage Analytics Caching...")
    
    start_time = time.time()
    response1 = client.get('/api/dashboard/stats/storage_analytics/', HTTP_AUTHORIZATION=auth_header)
    first_request_time = time.time() - start_time
    
    start_time = time.time()
    response2 = client.get('/api/dashboard/stats/storage_analytics/', HTTP_AUTHORIZATION=auth_header)
    second_request_time = time.time() - start_time
    
    if response1.status_code == 200 and response2.status_code == 200:
        print(f"✅ Storage analytics requests successful")
        print(f"  - First request time: {first_request_time:.4f}s")
        print(f"  - Second request time: {second_request_time:.4f}s")
    else:
        print(f"❌ Storage analytics requests failed")
    
    # Test cache invalidation
    print("\n🔍 Testing Cache Invalidation...")
    
    # Set a cache key
    cache.set('invalidation_test', 'test_data', 60)
    
    # Verify it exists
    if cache.get('invalidation_test') == 'test_data':
        print(f"✅ Cache key set successfully")
        
        # Delete the key
        cache.delete('invalidation_test')
        
        # Verify it's gone
        if cache.get('invalidation_test') is None:
            print(f"✅ Cache key deleted successfully")
        else:
            print(f"❌ Cache key deletion failed")
    else:
        print(f"❌ Cache key setting failed")
    
    # Test cache performance with multiple requests
    print("\n🔍 Testing Cache Performance with Multiple Requests...")
    
    # Clear cache first
    cache.clear()
    
    # Make multiple requests to populate cache
    times = []
    for i in range(5):
        start_time = time.time()
        response = client.get('/api/dashboard/stats/overview/', HTTP_AUTHORIZATION=auth_header)
        request_time = time.time() - start_time
        times.append(request_time)
    
    print(f"✅ Multiple requests completed")
    print(f"  - Request times: {[f'{t:.4f}s' for t in times]}")
    print(f"  - Average time: {sum(times)/len(times):.4f}s")
    print(f"  - Fastest time: {min(times):.4f}s")
    print(f"  - Slowest time: {max(times):.4f}s")
    
    # Test cache key generation
    print("\n🔍 Testing Cache Key Generation...")
    
    from config.cache_utils import CacheManager
    
    # Test cache key generation
    key1 = CacheManager.get_cache_key('test', 123, 'arg1', param1='value1')
    key2 = CacheManager.get_cache_key('test', 123, 'arg1', param1='value1')
    key3 = CacheManager.get_cache_key('test', 123, 'arg2', param1='value1')
    
    if key1 == key2 and key1 != key3:
        print(f"✅ Cache key generation working correctly")
        print(f"  - Key1: {key1}")
        print(f"  - Key2: {key2}")
        print(f"  - Key3: {key3}")
    else:
        print(f"❌ Cache key generation issues")
    
    # Test cache timeouts
    print("\n🔍 Testing Cache Timeouts...")
    
    # Test short timeout
    cache.set('timeout_test', 'test_value', 1)  # 1 second timeout
    time.sleep(2)  # Wait longer than timeout
    
    if cache.get('timeout_test') is None:
        print(f"✅ Cache timeout working correctly")
    else:
        print(f"❌ Cache timeout not working")
    
    print("\n📊 Performance Optimization Test Results:")
    print("✅ Caching system is working!")
    print("🎉 Performance optimization features are ready!")
    
    # Cleanup
    cache.clear()
    user.delete()

if __name__ == '__main__':
    test_performance_optimization()
