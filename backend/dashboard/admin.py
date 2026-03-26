from django.contrib import admin
from .models import DashboardStats, UserActivitySummary, SystemWideStats


@admin.register(DashboardStats)
class DashboardStatsAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'total_folders', 'total_files', 
        'storage_used_display', 'total_forms_created',
        'total_submissions_received', 'last_login'
    ]
    list_filter = ['created_at', 'updated_at', 'last_login']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    readonly_fields = [
        'storage_used_percentage', 'storage_used_display', 
        'storage_limit_display', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Storage Statistics', {
            'fields': (
                'total_folders', 'total_files', 'total_storage_used', 
                'total_storage_limit', 'storage_used_percentage',
                'storage_used_display', 'storage_limit_display'
            )
        }),
        ('Form Statistics', {
            'fields': ('total_forms_created', 'total_submissions_received')
        }),
        ('Activity Statistics', {
            'fields': ('last_login', 'total_logins')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserActivitySummary)
class UserActivitySummaryAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'date', 'files_uploaded', 'files_downloaded',
        'folders_created', 'forms_created', 'submissions_made'
    ]
    list_filter = ['date', 'user']
    search_fields = ['user__email']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Activity Information', {
            'fields': ('user', 'date')
        }),
        ('File Activities', {
            'fields': ('files_uploaded', 'files_downloaded')
        }),
        ('Content Activities', {
            'fields': ('folders_created', 'forms_created', 'submissions_made')
        }),
        ('Storage Changes', {
            'fields': ('storage_added', 'storage_removed')
        }),
    )


@admin.register(SystemWideStats)
class SystemWideStatsAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'total_users', 'active_users', 'new_users',
        'total_forms', 'total_submissions', 'total_files'
    ]
    list_filter = ['date']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Date Information', {
            'fields': ('date',)
        }),
        ('User Statistics', {
            'fields': ('total_users', 'active_users', 'new_users')
        }),
        ('Content Statistics', {
            'fields': ('total_forms', 'total_submissions', 'total_files')
        }),
        ('System Statistics', {
            'fields': ('total_storage', 'total_logins', 'total_api_calls')
        }),
    )
