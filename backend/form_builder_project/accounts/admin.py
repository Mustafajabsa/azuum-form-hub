from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    # This determines what you see in the "List view" (all users table)
    list_display = ('username', 'email', 'role', 'storage_quota', 'is_staff', 'is_active')
    
    # This adds a filter sidebar so you can filter by role or status
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')

    # This allows you to edit your custom fields in the user detail page
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'storage_quota')}),
    )
    
    # This ensures the "Add User" page works correctly
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role', 'storage_quota')}),
    )

admin.site.register(CustomUser, CustomUserAdmin)