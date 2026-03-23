from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Form(models.Model):
    """Form model for creating and managing forms"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'forms_form'
        verbose_name = 'Form'
        verbose_name_plural = 'Forms'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title


class FormField(models.Model):
    """Individual fields within a form"""
    FIELD_TYPES = [
        ('text', 'Text'),
        ('textarea', 'Textarea'),
        ('number', 'Number'),
        ('email', 'Email'),
        ('date', 'Date'),
        ('datetime', 'DateTime'),
        ('select', 'Select'),
        ('multiselect', 'Multi Select'),
        ('checkbox', 'Checkbox'),
        ('radio', 'Radio'),
        ('file', 'File'),
    ]
    
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name='fields')
    label = models.CharField(max_length=255)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES)
    required = models.BooleanField(default=False)
    placeholder = models.CharField(max_length=255, blank=True)
    options = models.JSONField(default=dict, blank=True)  # For select/radio/checkbox options
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'forms_field'
        verbose_name = 'Form Field'
        verbose_name_plural = 'Form Fields'
        ordering = ['order']
    
    def __str__(self):
        return f"{self.form.title} - {self.label}"
