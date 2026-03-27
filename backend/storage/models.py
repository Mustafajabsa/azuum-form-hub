from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid
import os

CustomUser = get_user_model()


class Folder(models.Model):
    """Folder model for organizing files"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='folders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'storage_folders'
        verbose_name = 'Folder'
        verbose_name_plural = 'Folders'
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    @property
    def path(self):
        """Get full path to this folder"""
        if self.parent:
            return f"{self.parent.path}/{self.name}"
        return f"/{self.owner.email}/{self.name}"
    
    @property
    def size(self):
        """Get total size of all files in this folder"""
        return self.files.aggregate(
            models.Sum('file_size')
        )['file_size__sum'] or 0


class File(models.Model):
    """File model for storing uploaded files"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    original_name = models.CharField(max_length=255)
    file_path = models.FileField(upload_to='storage/files/')
    file_size = models.BigIntegerField()  # in bytes
    mime_type = models.CharField(max_length=100)
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='files', null=True, blank=True)
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='files')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'storage_files'
        verbose_name = 'File'
        verbose_name_plural = 'Files'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.name
    
    @property
    def extension(self):
        """Get file extension"""
        return os.path.splitext(self.name)[1].lower()
    
    @property
    def size_display(self):
        """Human readable file size"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.file_size < 1024.0:
                return f"{self.file_size} {unit}"
            self.file_size /= 1024.0
        return f"{self.file_size:.2f} GB"


class FileShare(models.Model):
    """Model for sharing files with other users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='shares')
    shared_with = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='shared_files')
    shared_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='shared_by_files')
    can_edit = models.BooleanField(default=False)
    can_download = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'storage_file_shares'
        verbose_name = 'File Share'
        verbose_name_plural = 'File Shares'
    
    def __str__(self):
        return f"{self.file.name} shared with {self.shared_with.email}"


class UserActivity(models.Model):
    """Track user activities for audit logs"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=100)  # upload, download, delete, share, etc.
    object_type = models.CharField(max_length=50)  # file, folder
    object_id = models.UUIDField()
    details = models.JSONField(default=dict)  # store additional details
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'storage_user_activities'
        verbose_name = 'User Activity'
        verbose_name_plural = 'User Activities'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user.email} - {self.action} {self.object_type}"
