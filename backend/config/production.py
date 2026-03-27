"""
Production configuration settings
"""
import os
from .settings import *

# Environment detection
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')

# Production-specific settings
if ENVIRONMENT == 'production':
    # Security settings for production
    DEBUG = False
    ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
    
    # Database configuration for AWS RDS
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {
                'sslmode': 'require',
                'sslcert': os.environ.get('DB_SSL_CERT', ''),
                'sslkey': os.environ.get('DB_SSL_KEY', ''),
                'sslrootcert': os.environ.get('DB_SSL_ROOT_CERT', ''),
            },
            'CONN_MAX_AGE': 60,
        }
    }
    
    # Cache configuration for Redis (AWS ElastiCache)
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'PASSWORD': os.environ.get('REDIS_PASSWORD', ''),
                'SOCKET_CONNECT_TIMEOUT': 5,
                'SOCKET_TIMEOUT': 5,
                'RETRY_ON_TIMEOUT': True,
            },
            'TIMEOUT': 60 * 60,  # 1 hour
        }
    }
    
    # Security settings
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # Email configuration (AWS SES)
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('EMAIL_HOST', 'email-smtp.amazonaws.com')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
    DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@azuumformhub.com')
    
    # File storage (AWS S3)
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
    
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_DEFAULT_ACL = 'private'
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    
    # Media files
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
    MEDIA_ROOT = 'media/'
    
    # Static files
    STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
    STATIC_ROOT = 'static/'
    
    # Logging configuration
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
                'style': '{',
            },
            'simple': {
                'format': '{levelname} {message}',
                'style': '{',
            },
        },
        'handlers': {
            'file': {
                'level': 'INFO',
                'class': 'logging.FileHandler',
                'filename': os.environ.get('LOG_FILE', '/var/log/django/app.log'),
                'formatter': 'verbose',
            },
            'console': {
                'level': 'INFO',
                'class': 'logging.StreamHandler',
                'formatter': 'simple',
            },
            'cloudwatch': {
                'level': 'INFO',
                'class': 'watchtower.CloudWatchLogHandler',
                'log_group_name': os.environ.get('AWS_LOG_GROUP', 'django-app'),
                'log_stream_name': os.environ.get('AWS_LOG_STREAM', 'production'),
                'formatter': 'verbose',
            },
        },
        'root': {
            'handlers': ['console', 'file', 'cloudwatch'],
            'level': 'INFO',
        },
        'loggers': {
            'django': {
                'handlers': ['console', 'file', 'cloudwatch'],
                'level': 'INFO',
                'propagate': False,
            },
            'config': {
                'handlers': ['console', 'file', 'cloudwatch'],
                'level': 'INFO',
                'propagate': False,
            },
            'security': {
                'handlers': ['console', 'file', 'cloudwatch'],
                'level': 'WARNING',
                'propagate': False,
            },
        },
    }
    
    # Performance settings
    CONN_MAX_AGE = 60
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    
    # Monitoring and health checks
    HEALTH_CHECK = True
    
    # API settings
    REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ]
    REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
        'anon': '100/hour',
        'user': '1000/hour'
    }

elif ENVIRONMENT == 'staging':
    # Staging configuration
    DEBUG = True
    ALLOWED_HOSTS = ['staging.azuumformhub.com', 'localhost', '127.0.0.1']
    
    # Database (staging)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'azuum_form_hub_staging'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'password'),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }
    
    # Cache (staging Redis)
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
            'TIMEOUT': 60 * 30,  # 30 minutes
        }
    }
    
    # Logging (staging)
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
            },
        },
        'root': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    }

else:
    # Development configuration (default)
    DEBUG = True
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']
    
    # Cache (development - local memory)
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'default-cache',
            'TIMEOUT': 60 * 30,  # 30 minutes
        },
        'sessions': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'sessions-cache',
            'TIMEOUT': 60 * 60 * 24,  # 24 hours
        }
    }
    
    # Logging (development)
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
            },
        },
        'root': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    }

# Environment-specific settings
SECRET_KEY = os.environ.get('SECRET_KEY', SECRET_KEY)

# Application settings
API_VERSION = os.environ.get('API_VERSION', '1.0')
APP_VERSION = os.environ.get('APP_VERSION', '1.0.0')

# CORS settings for production
if ENVIRONMENT in ['production', 'staging']:
    CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    CORS_ALLOW_CREDENTIALS = True
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

# Health check settings
HEALTH_CHECK_ENABLED = os.environ.get('HEALTH_CHECK_ENABLED', 'True').lower() == 'true'

# Feature flags
FEATURES = {
    'advanced_search': os.environ.get('FEATURE_ADVANCED_SEARCH', 'True').lower() == 'true',
    'file_versioning': os.environ.get('FEATURE_FILE_VERSIONING', 'True').lower() == 'true',
    'bulk_operations': os.environ.get('FEATURE_BULK_OPERATIONS', 'True').lower() == 'true',
    'api_caching': os.environ.get('FEATURE_API_CACHING', 'True').lower() == 'true',
    'security_logging': os.environ.get('FEATURE_SECURITY_LOGGING', 'True').lower() == 'true',
}

# Performance monitoring
PERFORMANCE_MONITORING = os.environ.get('PERFORMANCE_MONITORING', 'False').lower() == 'true'

# Sentry error tracking (optional)
if os.environ.get('SENTRY_DSN'):
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=float(os.environ.get('SENTRY_TRACE_SAMPLE_RATE', '0.1')),
        send_default_pii=False,
        environment=ENVIRONMENT,
    )
