from django.apps import AppConfig


class PerformanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'performance'
    verbose_name = 'Performance Monitoring'
    
    def ready(self):
        """
        Initialize performance monitoring when Django starts
        """
        pass
