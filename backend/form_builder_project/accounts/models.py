from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = 'super_admin', 'Super Admin'
        ADMIN       = 'admin',       'Admin'
        USER        = 'user',        'User'


    role          = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    storage_quota = models.BigIntegerField(default=1073741824)  # 1GB
    created_at    = models.DateTimeField(auto_now_add=True)