from django.db import models
import uuid
from django.contrib.auth.models import AbstractUser
import os
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.conf import settings
import shutil
from phonenumber_field.modelfields import PhoneNumberField

# Create user profile


class UserProfile(models.Model):
    """Extended profile information for each user."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete   = models.CASCADE,
        related_name = 'profile'
    )
    bio = models.TextField(blank=True, default='')
    phone = PhoneNumberField(blank=True, region="US")
    profile_picture = models.CharField(
        max_length=500,
        blank=True,
        default=''
    )  # stores relative path to picture — not an ImageField to avoid Pillow dependency
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile of {self.user.username}'

    def get_picture_url(self):
        """Return the relative path of the profile picture or None."""
        if self.profile_picture and os.path.exists(
            os.path.join(str(settings.PROFILE_PICTURES_ROOT), self.profile_picture)
        ):
            return self.profile_picture
        return None

class CustomUser(AbstractUser):

    class Role(models.TextChoices):
        SUPER_ADMIN = 'super_admin', 'Super Admin'
        ADMIN       = 'admin',       'Admin'
        USER        = 'user',        'User'

    role          = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.USER
    )
    storage_quota = models.BigIntegerField(default=1073741824)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.username} ({self.role})'

    @property
    def is_super_admin(self):
        return self.role == self.Role.SUPER_ADMIN

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_regular_user(self):
        return self.role == self.Role.USER

@receiver(pre_delete, sender=CustomUser)
def handle_user_pre_delete(sender, instance, **kwargs):
    """Delete user's media folder and profile folder when account is deleted."""
    # delete file manager folder
    user_folder = os.path.join(
        str(settings.FILE_MANAGER_ROOT),
        'users',
        str(instance.id)
    )
    if os.path.exists(user_folder):
        shutil.rmtree(user_folder)

    # delete profile pictures folder
    profile_folder = os.path.join(
        str(settings.PROFILE_PICTURES_ROOT),
        str(instance.id)
    )
    if os.path.exists(profile_folder):
        shutil.rmtree(profile_folder)
    """Delete the user's media folder when their account is deleted."""
    user_folder = os.path.join(
        str(settings.FILE_MANAGER_ROOT),
        'users',
        str(instance.id)
    )
    if os.path.exists(user_folder):
        shutil.rmtree(user_folder)