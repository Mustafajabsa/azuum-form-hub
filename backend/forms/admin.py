from django.contrib import admin
from .models import Form, FormField


class FormFieldInline(admin.TabularInline):
    model = FormField
    extra = 1
    ordering = ['order']


@admin.register(Form)
class FormAdmin(admin.ModelAdmin):
    list_display = ['title', 'creator', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at', 'creator']
    search_fields = ['title', 'description', 'creator__email']
    inlines = [FormFieldInline]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):
    list_display = ['label', 'form', 'field_type', 'required', 'order']
    list_filter = ['field_type', 'required', 'form']
    search_fields = ['label', 'form__title']
    ordering = ['form', 'order']
    
    fieldsets = (
        (None, {
            'fields': ('form', 'label', 'field_type', 'required', 'placeholder', 'options', 'order')
        }),
    )
