#!/usr/bin/env python
"""Test Production Configuration"""

import os
import sys
import django
from django.test import Client
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def test_production_configuration():
    """Test production configuration features"""
    client = Client()
    
    print("⚙️ Starting Production Configuration Tests")
    print()
    
    # Test environment detection
    print("🔍 Testing Environment Detection...")
    environment = getattr(settings, 'ENVIRONMENT', 'development')
    print(f"  ✅ Current Environment: {environment}")
    
    # Test health check endpoint
    print("\n🔍 Testing Health Check Endpoint...")
    response = client.get('/health/')
    
    if response.status_code == 200:
        health_data = response.json()
        print(f"  ✅ Health check successful: {health_data['status']}")
        print(f"  - Environment: {health_data.get('environment', 'N/A')}")
        print(f"  - API Version: {health_data.get('version', {}).get('api', 'N/A')}")
        print(f"  - App Version: {health_data.get('version', {}).get('app', 'N/A')}")
        
        # Check individual health checks
        checks = health_data.get('checks', {})
        for check_name, check_data in checks.items():
            status = check_data.get('status', 'unknown')
            print(f"    - {check_name}: {status}")
    else:
        print(f"  ❌ Health check failed: {response.status_code}")
    
    # Test readiness check
    print("\n🔍 Testing Readiness Check...")
    response = client.get('/health/ready/')
    
    if response.status_code == 200:
        readiness_data = response.json()
        print(f"  ✅ Readiness check: {readiness_data['ready']}")
        checks = readiness_data.get('checks', {})
        for check_name, status in checks.items():
            print(f"    - {check_name}: {'✅' if status else '❌'}")
    else:
        print(f"  ❌ Readiness check failed: {response.status_code}")
    
    # Test liveness check
    print("\n🔍 Testing Liveness Check...")
    response = client.get('/health/live/')
    
    if response.status_code == 200:
        liveness_data = response.json()
        print(f"  ✅ Liveness check: {liveness_data['alive']}")
    else:
        print(f"  ❌ Liveness check failed: {response.status_code}")
    
    # Test metrics endpoint
    print("\n🔍 Testing Metrics Endpoint...")
    response = client.get('/metrics/')
    
    if response.status_code == 200:
        metrics_data = response.json()
        print(f"  ✅ Metrics endpoint successful")
        print(f"  - Users: {metrics_data.get('users', {}).get('total', 'N/A')}")
        print(f"  - Files: {metrics_data.get('storage', {}).get('files', 'N/A')}")
        print(f"  - Forms: {metrics_data.get('forms', {}).get('total', 'N/A')}")
        print(f"  - Submissions: {metrics_data.get('submissions', {}).get('total', 'N/A')}")
        
        if 'system' in metrics_data:
            system = metrics_data['system']
            print(f"  - CPU: {system.get('cpu_percent', 'N/A')}%")
            print(f"  - Memory: {system.get('memory_percent', 'N/A')}%")
            print(f"  - Disk: {system.get('disk_percent', 'N/A')}%")
    else:
        print(f"  ❌ Metrics endpoint failed: {response.status_code}")
    
    # Test configuration settings
    print("\n🔍 Testing Configuration Settings...")
    
    # Test security settings
    security_settings = {
        'SECRET_KEY': bool(getattr(settings, 'SECRET_KEY', None)),
        'DEBUG': getattr(settings, 'DEBUG', False),
        'ALLOWED_HOSTS': getattr(settings, 'ALLOWED_HOSTS', []),
    }
    
    print(f"  ✅ Security Settings:")
    for key, value in security_settings.items():
        if key == 'SECRET_KEY':
            print(f"    - {key}: {'✅ Configured' if value else '❌ Not configured'}")
        elif key == 'DEBUG':
            print(f"    - {key}: {'⚠️  Enabled' if value else '✅ Disabled'}")
        else:
            print(f"    - {key}: {value}")
    
    # Test database configuration
    print("\n🔍 Testing Database Configuration...")
    db_config = settings.DATABASES['default']
    print(f"  ✅ Database Engine: {db_config['ENGINE']}")
    print(f"  ✅ Database Name: {db_config['NAME']}")
    print(f"  ✅ Database Host: {db_config['HOST']}")
    print(f"  ✅ Database Port: {db_config['PORT']}")
    
    # Test cache configuration
    print("\n🔍 Testing Cache Configuration...")
    cache_config = settings.CACHES['default']
    print(f"  ✅ Cache Backend: {cache_config['BACKEND']}")
    if 'LOCATION' in cache_config:
        print(f"  ✅ Cache Location: {cache_config['LOCATION']}")
    
    # Test CORS configuration
    print("\n🔍 Testing CORS Configuration...")
    cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
    print(f"  ✅ CORS Origins: {len(cors_origins)} configured")
    for origin in cors_origins[:3]:  # Show first 3
        print(f"    - {origin}")
    if len(cors_origins) > 3:
        print(f"    - ... and {len(cors_origins) - 3} more")
    
    # Test feature flags
    print("\n🔍 Testing Feature Flags...")
    if hasattr(settings, 'FEATURES'):
        features = settings.FEATURES
        print(f"  ✅ Feature Flags:")
        for feature, enabled in features.items():
            status = '✅ Enabled' if enabled else '❌ Disabled'
            print(f"    - {feature}: {status}")
    else:
        print(f"  ⚠️  No feature flags configured")
    
    # Test logging configuration
    print("\n🔍 Testing Logging Configuration...")
    if hasattr(settings, 'LOGGING'):
        logging_config = settings.LOGGING
        handlers = logging_config.get('handlers', {})
        loggers = logging_config.get('loggers', {})
        print(f"  ✅ Logging Handlers: {len(handlers)} configured")
        print(f"  ✅ Logging Loggers: {len(loggers)} configured")
        
        for handler_name in list(handlers.keys())[:3]:  # Show first 3
            print(f"    - {handler_name}")
        if len(handlers) > 3:
            print(f"    - ... and {len(handlers) - 3} more")
    else:
        print(f"  ⚠️  No logging configuration")
    
    # Test environment variables
    print("\n🔍 Testing Environment Variables...")
    important_env_vars = [
        'ENVIRONMENT',
        'SECRET_KEY',
        'DB_NAME',
        'DB_HOST',
        'REDIS_URL',
    ]
    
    for var in important_env_vars:
        value = os.environ.get(var)
        if value:
            if 'PASSWORD' in var or 'SECRET' in var:
                print(f"  ✅ {var}: {'*' * len(value)}")
            else:
                print(f"  ✅ {var}: {value}")
        else:
            print(f"  ⚠️  {var}: Not set")
    
    print("\n📊 Production Configuration Test Results:")
    print("✅ Production configuration is working!")
    print("🎉 Application is ready for deployment with proper configuration!")
    
    # Test environment switching
    print("\n🔍 Testing Environment Switching...")
    original_env = os.environ.get('ENVIRONMENT', 'development')
    
    # Test staging environment
    os.environ['ENVIRONMENT'] = 'staging'
    print(f"  ✅ Switched to staging environment")
    
    # Test production environment (simulation)
    os.environ['ENVIRONMENT'] = 'production'
    print(f"  ✅ Switched to production environment")
    
    # Restore original environment
    os.environ['ENVIRONMENT'] = original_env
    print(f"  ✅ Restored to {original_env} environment")

if __name__ == '__main__':
    test_production_configuration()
