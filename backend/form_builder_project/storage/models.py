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
# storage/models.py
class SharedFile(models.Model):
    created_at   = models.DateTimeField(auto_now_add=True)
    class ItemType(models.TextChoices):
        FILE   = 'file',   'File'
        FOLDER = 'folder', 'Folder'

    item_type    = models.CharField(
        max_length=10,
        choices=ItemType.choices,
        default=ItemType.FILE
    )
    is_viewable  = models.BooleanField(default=False)
    created_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True
    )
    token        = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    file_path    = models.CharField(max_length=500)
    expires_at   = models.DateTimeField(null=True, blank=True)
    max_access   = models.IntegerField(null=True, blank=True)
    access_count = models.IntegerField(default=0)
    is_active    = models.BooleanField(default=True)

    def is_valid(self):
        if not self.is_active:
            return False, 'Link has been revoked'
        if self.expires_at and timezone.now() > self.expires_at:
            return False, 'Link has expired'
        if self.max_access and self.access_count >= self.max_access:
            return False, 'Link has reached maximum access limit'
        return True, None

class TrashedItem(models.Model):

    class ItemType(models.TextChoices):
        FILE   = 'file',   'File'
        FOLDER = 'folder', 'Folder'

    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trashed_items'
    )
    original_path = models.CharField(max_length=500)   # where it came from
    trash_path    = models.CharField(max_length=500)   # where it is now in .trash
    item_type     = models.CharField(
        max_length=10,
        choices=ItemType.choices,
        default=ItemType.FILE
    )
    item_name     = models.CharField(max_length=255)   # original filename or folder name
    size_bytes    = models.BigIntegerField(default=0)  # size at time of trashing
    trashed_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-trashed_at']   # most recently trashed first

    def __str__(self):
        return f'{self.user.username} — {self.item_name} (trashed {self.trashed_at})'

class FavoriteItem(models.Model):

    class ItemType(models.TextChoices):
        FILE   = 'file',   'File'
        FOLDER = 'folder', 'Folder'

    user      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorite_items'
    )
    path      = models.CharField(max_length=500)
    item_name = models.CharField(max_length=255)
    item_type = models.CharField(
        max_length=10,
        choices=ItemType.choices,
        default=ItemType.FILE
    )
    added_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-added_at']
        # prevent duplicate favorites for the same user and path
        unique_together = ['user', 'path']

    def __str__(self):
        return f'{self.user.username} — {self.item_name}'