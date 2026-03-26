from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class DashboardStats(models.Model):
    """Dashboard statistics for users"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='dashboard_stats')
    
    # Storage statistics
    total_folders = models.IntegerField(default=0)
    total_files = models.IntegerField(default=0)
    total_storage_used = models.BigIntegerField(default=0)  # in bytes
    total_storage_limit = models.BigIntegerField(default=5368709120)  # 5GB in bytes
    
    # Form statistics
    total_forms_created = models.IntegerField(default=0)
    total_submissions_received = models.IntegerField(default=0)
    
    # Activity statistics
    last_login = models.DateTimeField(null=True, blank=True)
    total_logins = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Dashboard Statistics'
        verbose_name_plural = 'Dashboard Statistics'
    
    def __str__(self):
        return f"{self.user.email} - Dashboard Stats"
    
    @property
    def storage_used_percentage(self):
        """Calculate storage usage percentage"""
        if self.total_storage_limit > 0:
            return (self.total_storage_used / self.total_storage_limit) * 100
        return 0
    
    @property
    def storage_used_display(self):
        """Display storage usage in human readable format"""
        return self.format_bytes(self.total_storage_used)
    
    @property
    def storage_limit_display(self):
        """Display storage limit in human readable format"""
        return self.format_bytes(self.total_storage_limit)
    
    @staticmethod
    def format_bytes(bytes_value):
        """Convert bytes to human readable format"""
        if bytes_value == 0:
            return "0 B"
        
        units = ['B', 'KB', 'MB', 'GB', 'TB']
        unit_index = 0
        size = float(bytes_value)
        
        while size >= 1024.0 and unit_index < len(units) - 1:
            size /= 1024.0
            unit_index += 1
        
        return f"{size:.2f} {units[unit_index]}"


class UserActivitySummary(models.Model):
    """Daily activity summary for dashboard"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_summaries')
    date = models.DateField()
    
    # Activity counts
    files_uploaded = models.IntegerField(default=0)
    files_downloaded = models.IntegerField(default=0)
    folders_created = models.IntegerField(default=0)
    forms_created = models.IntegerField(default=0)
    submissions_made = models.IntegerField(default=0)
    
    # Storage changes
    storage_added = models.BigIntegerField(default=0)  # bytes added
    storage_removed = models.BigIntegerField(default=0)  # bytes removed
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Activity Summary'
        verbose_name_plural = 'Activity Summaries'
        unique_together = ['user', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.user.email} - {self.date}"


class SystemWideStats(models.Model):
    """System-wide statistics for admin dashboard"""
    date = models.DateField(unique=True)
    
    # User statistics
    total_users = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)  # users with activity in last 30 days
    new_users = models.IntegerField(default=0)  # users registered on this date
    
    # Content statistics
    total_forms = models.IntegerField(default=0)
    total_submissions = models.IntegerField(default=0)
    total_files = models.IntegerField(default=0)
    total_storage = models.BigIntegerField(default=0)
    
    # Activity statistics
    total_logins = models.IntegerField(default=0)
    total_api_calls = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'System Statistics'
        verbose_name_plural = 'System Statistics'
        ordering = ['-date']
    
    def __str__(self):
        return f"System Stats - {self.date}"
