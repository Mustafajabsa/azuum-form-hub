from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.db import connection
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
import psutil
import os


@require_GET
def health_check(request):
    """
    Comprehensive health check endpoint
    """
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'version': {
                'api': getattr(settings, 'API_VERSION', '1.0'),
                'app': getattr(settings, 'APP_VERSION', '1.0.0'),
            },
            'environment': settings.ENVIRONMENT,
            'checks': {}
        }
        
        # Database health check
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                health_status['checks']['database'] = {
                    'status': 'healthy',
                    'message': 'Database connection successful'
                }
        except Exception as e:
            health_status['checks']['database'] = {
                'status': 'unhealthy',
                'message': f'Database connection failed: {str(e)}'
            }
            health_status['status'] = 'unhealthy'
        
        # Cache health check
        try:
            cache.set('health_check', 'ok', 10)
            cache_result = cache.get('health_check')
            if cache_result == 'ok':
                health_status['checks']['cache'] = {
                    'status': 'healthy',
                    'message': 'Cache connection successful'
                }
            else:
                raise Exception('Cache read/write failed')
        except Exception as e:
            health_status['checks']['cache'] = {
                'status': 'unhealthy',
                'message': f'Cache connection failed: {str(e)}'
            }
            health_status['status'] = 'unhealthy'
        
        # System health check
        try:
            system_info = {
                'status': 'healthy',
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent,
            }
            
            # Check if system resources are within acceptable limits
            if system_info['cpu_percent'] > 90:
                system_info['status'] = 'warning'
                system_info['message'] = 'High CPU usage'
            elif system_info['memory_percent'] > 90:
                system_info['status'] = 'warning'
                system_info['message'] = 'High memory usage'
            elif system_info['disk_percent'] > 90:
                system_info['status'] = 'warning'
                system_info['message'] = 'High disk usage'
            
            health_status['checks']['system'] = system_info
            
        except Exception as e:
            health_status['checks']['system'] = {
                'status': 'unhealthy',
                'message': f'System check failed: {str(e)}'
            }
        
        # Application health check
        try:
            app_info = {
                'status': 'healthy',
                'django_version': settings.DJANGO_VERSION,
                'debug_mode': settings.DEBUG,
                'installed_apps': len(settings.INSTALLED_APPS),
                'middleware_count': len(settings.MIDDLEWARE),
            }
            
            health_status['checks']['application'] = app_info
            
        except Exception as e:
            health_status['checks']['application'] = {
                'status': 'unhealthy',
                'message': f'Application check failed: {str(e)}'
            }
        
        # Security health check
        try:
            security_info = {
                'status': 'healthy',
                'secret_key_configured': bool(getattr(settings, 'SECRET_KEY', None)),
                'debug_mode_in_production': settings.DEBUG and settings.ENVIRONMENT == 'production',
                'allowed_hosts_configured': bool(settings.ALLOWED_HOSTS),
            }
            
            if security_info['debug_mode_in_production']:
                security_info['status'] = 'warning'
                security_info['message'] = 'Debug mode enabled in production'
            elif not security_info['secret_key_configured']:
                security_info['status'] = 'warning'
                security_info['message'] = 'Secret key not configured'
            
            health_status['checks']['security'] = security_info
            
        except Exception as e:
            health_status['checks']['security'] = {
                'status': 'unhealthy',
                'message': f'Security check failed: {str(e)}'
            }
        
        # Determine overall status
        if any(check['status'] == 'unhealthy' for check in health_status['checks'].values()):
            health_status['status'] = 'unhealthy'
            status_code = 503
        elif any(check['status'] == 'warning' for check in health_status['checks'].values()):
            health_status['status'] = 'warning'
            status_code = 200
        else:
            status_code = 200
        
        return JsonResponse(health_status, status=status_code)
        
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'timestamp': timezone.now().isoformat(),
            'error': f'Health check failed: {str(e)}'
        }, status=503)


@require_GET
def readiness_check(request):
    """
    Readiness check for Kubernetes/container orchestration
    """
    try:
        # Check if application is ready to serve traffic
        readiness_checks = {
            'database': False,
            'cache': False,
            'migrations': False,
        }
        
        # Database check
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                readiness_checks['database'] = True
        except:
            pass
        
        # Cache check
        try:
            cache.set('readiness', 'ok', 10)
            if cache.get('readiness') == 'ok':
                readiness_checks['cache'] = True
        except:
            pass
        
        # Migration check
        try:
            from django.core.management import call_command
            from io import StringIO
            out = StringIO()
            call_command('showmigrations', '--plan', stdout=out)
            readiness_checks['migrations'] = '[ ]' not in out.getvalue()
        except:
            pass
        
        all_ready = all(readiness_checks.values())
        
        return JsonResponse({
            'ready': all_ready,
            'checks': readiness_checks,
            'timestamp': timezone.now().isoformat(),
        }, status=200 if all_ready else 503)
        
    except Exception as e:
        return JsonResponse({
            'ready': False,
            'error': str(e),
            'timestamp': timezone.now().isoformat(),
        }, status=503)


@require_GET
def liveness_check(request):
    """
    Liveness check for Kubernetes/container orchestration
    """
    try:
        # Simple check to see if the application is alive
        return JsonResponse({
            'alive': True,
            'timestamp': timezone.now().isoformat(),
        })
    except Exception as e:
        return JsonResponse({
            'alive': False,
            'error': str(e),
            'timestamp': timezone.now().isoformat(),
        }, status=503)


@require_GET
def metrics_endpoint(request):
    """
    Basic metrics endpoint for monitoring
    """
    try:
        from django.contrib.auth import get_user_model
        from storage.models import File, Folder
        from forms.models import Form
        from submissions.models import Submission
        from django.db import models
        
        User = get_user_model()
        
        metrics = {
            'timestamp': timezone.now().isoformat(),
            'users': {
                'total': User.objects.count(),
                'active': User.objects.filter(is_active=True).count(),
            },
            'storage': {
                'files': File.objects.count(),
                'folders': Folder.objects.count(),
                'total_size': File.objects.aggregate(
                    total_size=models.Sum('file_size')
                )['total_size'] or 0,
            },
            'forms': {
                'total': Form.objects.count(),
                'published': Form.objects.filter(status='published').count(),
            },
            'submissions': {
                'total': Submission.objects.count(),
                'today': Submission.objects.filter(
                    submitted_at__date=timezone.now().date()
                ).count(),
            },
            'system': {
                'cpu_percent': psutil.cpu_percent(),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent,
            }
        }
        
        return JsonResponse(metrics)
        
    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'timestamp': timezone.now().isoformat(),
        }, status=500)
