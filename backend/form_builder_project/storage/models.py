from django.db import models
import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings

# Create your models here.

# Files info databse model
class FileInfo(models.Model):
    path = models.URLField()
    info = models.CharField(max_length=255)

    def __str__(self):
        return self.path


# Sharable files token database model
class SharedFile(models.Model):
    created_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True
    )
    token        = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    file_path    = models.CharField(max_length=500)
    created_at   = models.DateTimeField(auto_now_add=True)
    expires_at   = models.DateTimeField(null=True, blank=True)  # None = never expires
    max_access   = models.IntegerField(null=True, blank=True)   # None = unlimited
    access_count = models.IntegerField(default=0)
    is_active    = models.BooleanField(default=True)

    def is_valid(self):
        """Check if the link is still valid."""
        if not self.is_active:
            return False, 'Link has been revoked'
        if self.expires_at and timezone.now() > self.expires_at:
            return False, 'Link has expired'
        if self.max_access and self.access_count >= self.max_access:
            return False, 'Link has reached maximum access limit'
        return True, None
    