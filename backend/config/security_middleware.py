from django.http import HttpResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware:
    """
    Add security headers to all HTTP responses
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add security headers
        self._add_security_headers(response, request)
        
        return response
    
    def _add_security_headers(self, response, request):
        """Add security headers to response"""
        
        # Content Security Policy
        if not getattr(settings, 'DEBUG', False):
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            )
            response['Content-Security-Policy'] = csp
        
        # XSS Protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Content Type Options
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Frame Protection
        response['X-Frame-Options'] = 'DENY'
        
        # HSTS (HTTPS Strict Transport Security)
        if not getattr(settings, 'DEBUG', False):
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy
        permissions_policy = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )
        response['Permissions-Policy'] = permissions_policy
        
        # Remove server information
        if 'Server' in response:
            del response['Server']
        
        # Custom security headers
        response['X-API-Version'] = getattr(settings, 'API_VERSION', '1.0')
        response['X-App-Version'] = getattr(settings, 'APP_VERSION', '1.0.0')


class RequestLoggingMiddleware:
    """
    Log all API requests for security monitoring
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Log request details
        self._log_request(request)
        
        response = self.get_response(request)
        
        # Log response details
        self._log_response(request, response)
        
        return response
    
    def _log_request(self, request):
        """Log incoming request details"""
        log_data = {
            'method': request.method,
            'path': request.path,
            'ip_address': self._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') and request.user.is_authenticated else None,
        }
        
        # Don't log sensitive data
        if request.method in ['POST', 'PUT', 'PATCH']:
            # Log that there's a body but don't log the content
            log_data['has_body'] = bool(request.body)
        
        logger.info(f"API Request: {log_data}")
    
    def _log_response(self, request, response):
        """Log response details"""
        log_data = {
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') and request.user.is_authenticated else None,
        }
        
        # Log error responses with more detail
        if response.status_code >= 400:
            logger.warning(f"API Error Response: {log_data}")
        else:
            logger.info(f"API Response: {log_data}")
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class InputValidationMiddleware:
    """
    Validate and sanitize input data
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Validate request data
        validation_result = self._validate_request(request)
        
        if not validation_result['valid']:
            from rest_framework.response import Response
            from rest_framework import status
            return Response({
                'error': 'Invalid input',
                'details': validation_result['errors']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        response = self.get_response(request)
        
        return response
    
    def _validate_request(self, request):
        """Validate request data"""
        errors = []
        
        # Check for common attack patterns
        if request.body:
            body_str = request.body.decode('utf-8', errors='ignore').lower()
            
            # SQL injection patterns
            sql_patterns = ['union select', 'drop table', 'insert into', 'delete from', 'update set']
            for pattern in sql_patterns:
                if pattern in body_str:
                    errors.append(f'Potentially dangerous SQL pattern detected: {pattern}')
            
            # XSS patterns
            xss_patterns = ['<script', 'javascript:', 'onload=', 'onerror=', 'onclick=']
            for pattern in xss_patterns:
                if pattern in body_str:
                    errors.append(f'Potentially dangerous XSS pattern detected: {pattern}')
        
        # Validate query parameters
        for key, value in request.GET.items():
            if len(str(value)) > 1000:  # Reasonable limit
                errors.append(f'Query parameter {key} too long')
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }


class RateLimitMiddleware:
    """
    Simple rate limiting middleware
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.request_counts = {}  # In production, use Redis
    
    def __call__(self, request):
        client_ip = self._get_client_ip(request)
        
        # Check rate limit
        if not self._check_rate_limit(client_ip, request):
            from rest_framework.response import Response
            from rest_framework import status
            return Response({
                'error': 'Rate limit exceeded',
                'message': 'Too many requests. Please try again later.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        response = self.get_response(request)
        
        # Add rate limit headers
        response['X-RateLimit-Limit'] = '1000'
        response['X-RateLimit-Remaining'] = str(max(0, 1000 - self.request_counts.get(client_ip, 0)))
        response['X-RateLimit-Reset'] = '3600'  # 1 hour
        
        return response
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _check_rate_limit(self, client_ip, request):
        """Check if client is within rate limits"""
        # Simple in-memory rate limiting (use Redis in production)
        current_count = self.request_counts.get(client_ip, 0)
        
        if current_count >= 1000:  # 1000 requests per hour
            return False
        
        self.request_counts[client_ip] = current_count + 1
        return True
