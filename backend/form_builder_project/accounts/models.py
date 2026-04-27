from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class CustomUser(AbstractUser):
    # everything from Django's default user, plus:
    role          = models.CharField('super_admin', 'admin', 'user')   # 'super_admin', 'admin', 'user'
    storage_quota = models.BigIntegerField(default=1073741824)  # 1GB per user
    created_at    = models.DateTimeField(auto_now_add=True)