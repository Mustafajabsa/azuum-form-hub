from django.apps import AppConfig


class SecurityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'security'
    verbose_name = 'Security & Audit'
    
    def ready(self):
        """
        Initialize security features when Django starts
        """
        pass
