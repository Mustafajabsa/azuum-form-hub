from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi


@api_view(['GET'])
@permission_classes([AllowAny])
def api_info(request):
    """
    API Information and Rate Limiting Details
    
    Returns comprehensive information about the API including:
    - Available endpoints
    - Rate limiting policies
    - Authentication requirements
    - API version and status
    """
    api_info = {
        'api_version': 'v1.0',
        'status': 'active',
        'base_url': request.build_absolute_uri('/api/'),
        'documentation': {
            'swagger': request.build_absolute_uri('/api/docs/'),
            'redoc': request.build_absolute_uri('/api/redoc/'),
        },
        'rate_limiting': {
            'enabled': getattr(settings, 'RATELIMIT_ENABLE', False),
            'default_limit': getattr(settings, 'RATELIMIT_DEFAULT', '1000/h'),
            'limits': {
                'anonymous': '1000/h',
                'standard_users': '1000/h',
                'premium_users': '2000/h',
                'admin_users': '5000/h',
                'auth_endpoints': '10/m',
                'file_upload': '50/h',
                'data_export': '20/h',
            },
            'headers': {
                'X-RateLimit-Limit': 'Rate limit for the endpoint',
                'X-RateLimit-Remaining': 'Remaining requests',
                'X-RateLimit-Reset': 'Time when rate limit resets',
            }
        },
        'authentication': {
            'type': 'JWT Bearer Token',
            'token_endpoint': '/api/token/',
            'refresh_endpoint': '/api/token/refresh/',
            'token_lifetime': '60 minutes',
            'refresh_lifetime': '7 days',
        },
        'endpoints': {
            'accounts': {
                'url': '/api/accounts/',
                'description': 'User account management',
                'rate_limit': '1000/h',
                'authentication': 'required',
                'endpoints': [
                    'GET /api/accounts/profile/',
                    'PUT /api/accounts/profile/',
                    'POST /api/accounts/change-password/',
                ]
            },
            'forms': {
                'url': '/api/forms/',
                'description': 'Form creation and management',
                'rate_limit': '1000/h',
                'authentication': 'required',
                'endpoints': [
                    'GET /api/forms/forms/',
                    'POST /api/forms/forms/',
                    'PUT /api/forms/forms/{id}/',
                    'DELETE /api/forms/forms/{id}/',
                ]
            },
            'submissions': {
                'url': '/api/submissions/',
                'description': 'Form submission management',
                'rate_limit': '1000/h',
                'authentication': 'required',
                'endpoints': [
                    'GET /api/submissions/submissions/',
                    'POST /api/submissions/submissions/',
                    'GET /api/submissions/submissions/{id}/pdf/',
                ]
            },
            'storage': {
                'url': '/api/storage/',
                'description': 'File storage and management',
                'rate_limit': '1000/h (standard), 50/h (upload)',
                'authentication': 'required',
                'endpoints': [
                    'GET /api/storage/folders/',
                    'POST /api/storage/folders/',
                    'GET /api/storage/files/',
                    'POST /api/storage/upload/',
                ]
            },
            'dashboard': {
                'url': '/api/dashboard/',
                'description': 'Analytics and dashboard data',
                'rate_limit': '1000/h',
                'authentication': 'required',
                'endpoints': [
                    'GET /api/dashboard/stats/overview/',
                    'GET /api/dashboard/stats/storage_analytics/',
                    'GET /api/dashboard/system/overview/ (admin only)',
                ]
            }
        },
        'error_codes': {
            '401': 'Unauthorized - Authentication required',
            '403': 'Forbidden - Insufficient permissions',
            '429': 'Too Many Requests - Rate limit exceeded',
            '500': 'Internal Server Error',
            '503': 'Service Unavailable',
        },
        'status_codes': {
            '200': 'OK - Request successful',
            '201': 'Created - Resource created successfully',
            '400': 'Bad Request - Invalid request data',
            '404': 'Not Found - Resource not found',
            '422': 'Unprocessable Entity - Validation failed',
        }
    }
    
    return Response(api_info)


@api_view(['GET'])
@permission_classes([AllowAny])
def rate_limit_status(request):
    """
    Rate Limiting Status
    
    Returns current rate limiting status for the requesting client.
    """
    # Get client IP for rate limiting status
    client_ip = request.META.get('REMOTE_ADDR')
    
    # This would typically integrate with your rate limiting backend
    # to get actual current usage statistics
    rate_status = {
        'client_ip': client_ip,
        'authenticated': request.user.is_authenticated,
        'user_type': None,
        'current_limits': {
            'requests_per_hour': '1000/h',
            'requests_remaining': 'N/A',
            'reset_time': 'N/A',
        },
        'endpoint_specific_limits': {
            'authentication': '10/m',
            'file_upload': '50/h',
            'data_export': '20/h',
        }
    }
    
    if request.user.is_authenticated:
        if request.user.is_staff or request.user.is_superuser:
            rate_status['user_type'] = 'admin'
            rate_status['current_limits']['requests_per_hour'] = '5000/h'
        elif hasattr(request.user, 'role') and request.user.role == 'premium':
            rate_status['user_type'] = 'premium'
            rate_status['current_limits']['requests_per_hour'] = '2000/h'
        else:
            rate_status['user_type'] = 'standard'
            rate_status['current_limits']['requests_per_hour'] = '1000/h'
    
    return Response(rate_status)


# Enhanced Swagger documentation with rate limiting info
def get_swagger_config():
    """
    Enhanced Swagger configuration with rate limiting information
    """
    swagger_config = {
        'title': 'AZUUM Form Hub API',
        'description': """
        ## Comprehensive API Documentation
        
        ### Rate Limiting
        This API implements rate limiting to ensure fair usage and prevent abuse:
        
        **Rate Limits by User Type:**
        - **Anonymous Users**: 1000 requests/hour
        - **Standard Users**: 1000 requests/hour  
        - **Premium Users**: 2000 requests/hour
        - **Admin Users**: 5000 requests/hour
        
        **Special Endpoint Limits:**
        - **Authentication endpoints**: 10 requests/minute
        - **File upload endpoints**: 50 requests/hour
        - **Data export endpoints**: 20 requests/hour
        
        **Rate Limit Headers:**
        - `X-RateLimit-Limit`: Rate limit for the endpoint
        - `X-RateLimit-Remaining`: Remaining requests
        - `X-RateLimit-Reset`: Time when rate limit resets
        
        ### Authentication
        This API uses JWT (JSON Web Token) authentication:
        1. Obtain a token from `/api/token/`
        2. Include the token in the Authorization header: `Bearer <token>`
        3. Refresh tokens using `/api/token/refresh/`
        
        ### Error Handling
        - **429 Too Many Requests**: Rate limit exceeded
        - **401 Unauthorized**: Authentication required
        - **403 Forbidden**: Insufficient permissions
        
        **Example Error Response:**
        ```json
        {
            "error": "Rate limit exceeded",
            "detail": "Too many requests. Try again later.",
            "code": "RATE_LIMIT_EXCEEDED"
        }
        ```
        """,
        'version': 'v1.0',
        'terms_of_service': 'https://azuum.com/terms/',
        'contact': {
            'name': 'API Support',
            'email': 'api-support@azuum.com',
            'url': 'https://azuum.com/support'
        },
        'license': {
            'name': 'MIT License',
            'url': 'https://opensource.org/licenses/MIT'
        },
        'security': [
            {
                'Bearer': []
            }
        ],
        'securityDefinitions': {
            'Bearer': {
                'type': 'apiKey',
                'name': 'Authorization',
                'in': 'header',
                'description': 'JWT Bearer token. Example: "Bearer <token>"'
            }
        }
    }
    
    return swagger_config


def get_rate_limit_response_schema():
    """
    Schema for rate limit exceeded responses
    """
    return openapi.Response(
        description='Rate limit exceeded',
        examples={
            'application/json': {
                'error': 'Rate limit exceeded',
                'detail': 'Too many requests. Try again later.',
                'code': 'RATE_LIMIT_EXCEEDED',
                'retry_after': 3600
            }
        },
        schema=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'error': openapi.Schema(type=openapi.TYPE_STRING),
                'detail': openapi.Schema(type=openapi.TYPE_STRING),
                'code': openapi.Schema(type=openapi.TYPE_STRING),
                'retry_after': openapi.Schema(type=openapi.TYPE_INTEGER),
            }
        )
    )
