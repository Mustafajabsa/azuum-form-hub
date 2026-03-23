from django.contrib import admin
from .models import Submission, GeneratedPDF


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ['form', 'submitter', 'submitted_at']
    list_filter = ['submitted_at', 'form', 'submitter']
    search_fields = ['form__title', 'submitter__email']
    readonly_fields = ['submitted_at']
    
    fieldsets = (
        (None, {
            'fields': ('form', 'submitter', 'data')
        }),
        ('Timestamps', {
            'fields': ('submitted_at',),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        # Don't allow adding submissions through admin
        return False


@admin.register(GeneratedPDF)
class GeneratedPDFAdmin(admin.ModelAdmin):
    list_display = ['submission', 'generated_at']
    list_filter = ['generated_at']
    search_fields = ['submission__form__title', 'submission__submitter__email']
    readonly_fields = ['generated_at']
    
    fieldsets = (
        (None, {
            'fields': ('submission', 'pdf_file')
        }),
        ('Timestamps', {
            'fields': ('generated_at',),
            'classes': ('collapse',)
        }),
    )
