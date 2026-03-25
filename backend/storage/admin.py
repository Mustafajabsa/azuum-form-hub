from django.contrib import admin
from .models import Folder, File, FileShare, UserActivity


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'parent', 'created_at', 'updated_at')
    list_filter = ('owner', 'parent', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).filter(is_deleted=False)


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('name', 'original_name', 'owner', 'folder', 'file_size', 'uploaded_at')
    list_filter = ('owner', 'folder', 'mime_type', 'uploaded_at')
    search_fields = ('name', 'original_name')
    readonly_fields = ('id', 'uploaded_at', 'file_size')
    
    def get_queryset(self, request):
        return super().get_queryset(request).filter(is_deleted=False)
    
    def file_size_display(self, obj):
        """Display file size in human readable format"""
        if obj.file_size < 1024:
            return f"{obj.file_size} B"
        elif obj.file_size < 1024 * 1024:
            return f"{obj.file_size / 1024:.1f} KB"
        else:
            return f"{obj.file_size / (1024 * 1024):.1f} MB"


@admin.register(FileShare)
class FileShareAdmin(admin.ModelAdmin):
    list_display = ('file', 'shared_with', 'shared_by', 'can_edit', 'expires_at', 'created_at')
    list_filter = ('shared_by', 'shared_with', 'can_edit', 'created_at')
    search_fields = ('file__name', 'shared_with__email', 'shared_by__email')
    readonly_fields = ('id', 'created_at')


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'object_type', 'object_id', 'timestamp')
    list_filter = ('user', 'action', 'object_type', 'timestamp')
    search_fields = ('user__email', 'action', 'details')
    readonly_fields = ('id', 'timestamp')
    
    def has_add_permission(self, request):
        return False  # Activities should only be created automatically
