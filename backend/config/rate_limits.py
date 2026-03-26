from django_ratelimit.decorators import ratelimit
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from functools import wraps

User = get_user_model()


def get_rate_limit_key(group, request):
    """
    Generate rate limit key based on user type and IP
    """
    if request.user.is_authenticated:
        user = request.user
        if user.is_staff or user.is_superuser:
            return f"{group}:admin:{user.id}"
        elif hasattr(user, 'role') and user.role == 'premium':
            return f"{group}:premium:{user.id}"
        else:
            return f"{group}:standard:{user.id}"
    else:
        return f"{group}:anonymous:{get_client_ip(request)}"


def get_client_ip(request):
    """
    Get client IP address from request
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def rate_limit_admin(rate='5000/h', block=True):
    """
    Rate limiting decorator for admin users
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated or not request.user.is_staff:
                return JsonResponse(
                    {'error': 'Admin access required'}, 
                    status=403
                )
            
            # Apply rate limiting with admin key
            key = f"admin:{request.user.id}:{get_client_ip(request)}"
            return ratelimit(key=key, rate=rate, block=block)(view_func)(
                request, *args, **kwargs
            )
        return _wrapped_view
    return decorator


def rate_limit_premium(rate='2000/h', block=True):
    """
    Rate limiting decorator for premium users
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': 'Authentication required'}, 
                    status=401
                )
            
            # Check if user is premium
            user = request.user
            is_premium = (
                user.is_staff or user.is_superuser or 
                (hasattr(user, 'role') and user.role == 'premium')
            )
            
            if not is_premium:
                return JsonResponse(
                    {'error': 'Premium subscription required'}, 
                    status=403
                )
            
            # Apply rate limiting with premium key
            key = f"premium:{user.id}:{get_client_ip(request)}"
            return ratelimit(key=key, rate=rate, block=block)(view_func)(
                request, *args, **kwargs
            )
        return _wrapped_view
    return decorator


def rate_limit_standard(rate='1000/h', block=True):
    """
    Rate limiting decorator for standard authenticated users
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': 'Authentication required'}, 
                    status=401
                )
            
            # Apply rate limiting with standard key
            key = f"standard:{request.user.id}:{get_client_ip(request)}"
            return ratelimit(key=key, rate=rate, block=block)(view_func)(
                request, *args, **kwargs
            )
        return _wrapped_view
    return decorator


def rate_limit_auth(rate='10/m', block=True):
    """
    Rate limiting decorator for authentication endpoints
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Apply rate limiting with IP-based key for auth endpoints
            key = f"auth:{get_client_ip(request)}"
            return ratelimit(key=key, rate=rate, block=block)(view_func)(
                request, *args, **kwargs
            )
        return _wrapped_view
    return decorator


def rate_limit_upload(rate='50/h', block=True):
    """
    Rate limiting decorator for file upload endpoints
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': 'Authentication required'}, 
                    status=401
                )
            
            # Apply rate limiting with upload key
            key = f"upload:{request.user.id}:{get_client_ip(request)}"
            return ratelimit(key=key, rate=rate, block=block)(view_func)(
                request, *args, **kwargs
            )
        return _wrapped_view
    return decorator


def rate_limit_export(rate='20/h', block=True):
    """
    Rate limiting decorator for data export endpoints
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': 'Authentication required'}, 
                    status=401
                )
            
            # Apply rate limiting with export key
            key = f"export:{request.user.id}:{get_client_ip(request)}"
            return ratelimit(key=key, rate=rate, block=block)(view_func)(
                request, *args, **kwargs
            )
        return _wrapped_view
    return decorator


class RateLimitMiddleware:
    """
    Custom middleware to handle rate limiting headers
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Add rate limiting headers to response
        if hasattr(request, 'ratelimit'):
            response['X-RateLimit-Limit'] = str(getattr(request, 'ratelimit', {}).get('limit', 'N/A'))
            response['X-RateLimit-Remaining'] = str(getattr(request, 'ratelimit', {}).get('remaining', 'N/A'))
            response['X-RateLimit-Reset'] = str(getattr(request, 'ratelimit', {}).get('reset', 'N/A'))
        
        return response
