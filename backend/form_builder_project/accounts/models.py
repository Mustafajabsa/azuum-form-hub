from django.db import models
from django.contrib.auth.models import AbstractUser
import os
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.db.models.signals import post_save, pre_delete
import shutil

# Create your models here.
class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = 'super_admin', 'Super Admin'
        ADMIN       = 'admin',       'Admin'
        USER        = 'user',        'User'


    role          = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    storage_quota = models.BigIntegerField(default=1073741824)  # 1GB
    created_at    = models.DateTimeField(auto_now_add=True)

@receiver(post_save, sender=CustomUser)
def create_user_media_folder(sender, instance, created, **kwargs):
    """Create a media folder for the user when their account is created."""
    if created:    # only runs on creation, not on every save
        user_folder = os.path.join(
            str(settings.FILE_MANAGER_ROOT),
            'users',
            str(instance.id)
        )
        os.makedirs(user_folder, exist_ok=True)

@receiver(pre_delete, sender=CustomUser)
def delete_user_media_folder(sender, instance, **kwargs):
    """Delete the user's media folder when their account is deleted."""
    user_folder = os.path.join(
        str(settings.FILE_MANAGER_ROOT),
        'users',
        str(instance.id)
    )
    if os.path.exists(user_folder):
        shutil.rmtree(user_folder)