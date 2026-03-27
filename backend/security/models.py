from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import json

User = get_user_model()


class SecurityEvent(models.Model):
    """Track security events for audit and monitoring"""
    
    EVENT_TYPES = [
        ('login_success', 'Successful Login'),
        ('login_failed', 'Failed Login'),
        ('password_change', 'Password Changed'),
        ('password_reset', 'Password Reset'),
        ('account_locked', 'Account Locked'),
        ('account_unlocked', 'Account Unlocked'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('api_access', 'API Access'),
        ('file_upload', 'File Upload'),
        ('file_download', 'File Download'),
        ('admin_access', 'Admin Access'),
        ('permission_denied', 'Permission Denied'),
        ('rate_limit_exceeded', 'Rate Limit Exceeded'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='security_events')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='low')
    
    # Request information
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    request_path = models.CharField(max_length=255, blank=True)
    request_method = models.CharField(max_length=10, blank=True)
    
    # Event details
    details = models.JSONField(default=dict)
    success = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Security Event'
        verbose_name_plural = 'Security Events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['event_type', '-created_at']),
            models.Index(fields=['severity', '-created_at']),
            models.Index(fields=['ip_address', '-created_at']),
        ]
    
    def __str__(self):
        user_info = f"User {self.user.email}" if self.user else "Anonymous"
        return f"{self.get_event_type_display()} - {user_info} ({self.created_at})"


class LoginAttempt(models.Model):
    """Track login attempts for security monitoring"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_attempts')
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    success = models.BooleanField()
    failure_reason = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Login Attempt'
        verbose_name_plural = 'Login Attempts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['ip_address', '-created_at']),
            models.Index(fields=['success', '-created_at']),
        ]
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{status} login for {self.user.email} at {self.created_at}"


class AccountLockout(models.Model):
    """Track account lockouts"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='lockout')
    locked_until = models.DateTimeField()
    reason = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Account Lockout'
        verbose_name_plural = 'Account Lockouts'
    
    def __str__(self):
        return f"Account {self.user.email} locked until {self.locked_until}"
    
    @property
    def is_locked(self):
        """Check if account is still locked"""
        return self.locked_until > timezone.now()
    
    def unlock(self):
        """Unlock the account"""
        self.delete()


class SecurityAuditLog(models.Model):
    """Comprehensive security audit log"""
    
    ACTION_TYPES = [
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('access_denied', 'Access Denied'),
        ('data_export', 'Data Export'),
        ('bulk_operation', 'Bulk Operation'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    resource_type = models.CharField(max_length=50)  # 'user', 'file', 'form', etc.
    resource_id = models.CharField(max_length=100, blank=True)  # ID of the resource
    
    # Request details
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    request_path = models.CharField(max_length=255)
    request_method = models.CharField(max_length=10)
    
    # Change details
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    
    # Result
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Security Audit Log'
        verbose_name_plural = 'Security Audit Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
            models.Index(fields=['resource_type', '-created_at']),
            models.Index(fields=['ip_address', '-created_at']),
        ]
    
    def __str__(self):
        user_info = f"User {self.user.email}" if self.user else "Anonymous"
        return f"{self.get_action_type_display()} {self.resource_type} - {user_info}"


class SecuritySettings(models.Model):
    """User security preferences and settings"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='security_settings')
    
    # Authentication settings
    enable_two_factor = models.BooleanField(default=False)
    require_password_change = models.BooleanField(default=False)
    password_change_frequency = models.IntegerField(default=90, help_text="Days between required password changes")
    
    # Session settings
    session_timeout = models.IntegerField(default=24, help_text="Hours before session expires")
    allow_multiple_sessions = models.BooleanField(default=False)
    
    # Notification settings
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    notify_on_login = models.BooleanField(default=True)
    notify_on_password_change = models.BooleanField(default=True)
    notify_on_suspicious_activity = models.BooleanField(default=True)
    
    # Privacy settings
    hide_last_login = models.BooleanField(default=False)
    hide_ip_address = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Security Settings'
        verbose_name_plural = 'Security Settings'
    
    def __str__(self):
        return f"Security settings for {self.user.email}"


class APIKey(models.Model):
    """API keys for programmatic access"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=64, unique=True)
    prefix = models.CharField(max_length=8)  # First 8 characters for display
    
    # Permissions and restrictions
    permissions = models.JSONField(default=list)  # List of allowed endpoints
    rate_limit = models.IntegerField(default=1000)  # Requests per hour
    
    # Status and timestamps
    is_active = models.BooleanField(default=True)
    last_used = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'API Key'
        verbose_name_plural = 'API Keys'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['key']),
            models.Index(fields=['prefix']),
            models.Index(fields=['is_active', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.prefix}****)"
    
    def regenerate_key(self):
        """Generate a new API key"""
        import secrets
        self.key = secrets.token_urlsafe(48)
        self.prefix = self.key[:8]
        self.save()
    
    def is_valid(self):
        """Check if API key is valid and not expired"""
        if not self.is_active:
            return False
        
        if self.expires_at and self.expires_at < timezone.now():
            return False
        
        return True
    
    def update_last_used(self):
        """Update the last used timestamp"""
        self.last_used = timezone.now()
        self.save(update_fields=['last_used'])
