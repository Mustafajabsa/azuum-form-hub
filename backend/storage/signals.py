from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import UserActivity


@receiver(post_save, sender=Folder)
def log_folder_activity(sender, instance, created, **kwargs):
    """Log folder activities"""
    if created:
        UserActivity.objects.create(
            user=instance.owner,
            action='create_folder',
            object_type='folder',
            object_id=instance.id,
            details={'name': instance.name}
        )


@receiver(post_save, sender=File)
def log_file_activity(sender, instance, created, **kwargs):
    """Log file activities"""
    if created:
        UserActivity.objects.create(
            user=instance.owner,
            action='upload_file',
            object_type='file',
            object_id=instance.id,
            details={
                'name': instance.name,
                'size': instance.file_size,
                'mime_type': instance.mime_type
            }
        )
