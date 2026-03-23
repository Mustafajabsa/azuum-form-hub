from django.db import models
from django.contrib.auth import get_user_model
from forms.models import Form

User = get_user_model()


class Submission(models.Model):
    """Form submission data"""
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name='submissions')
    submitter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submissions')
    data = models.JSONField()  # Store form field responses
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'submissions_submission'
        verbose_name = 'Submission'
        verbose_name_plural = 'Submissions'
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"Submission for {self.form.title} by {self.submitter.email}"


class GeneratedPDF(models.Model):
    """Generated PDF files for submissions"""
    submission = models.OneToOneField(
        Submission, 
        on_delete=models.CASCADE, 
        related_name='pdf'
    )
    pdf_file = models.FileField(upload_to='pdfs/')
    generated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'submissions_pdf'
        verbose_name = 'Generated PDF'
        verbose_name_plural = 'Generated PDFs'
    
    def __str__(self):
        return f"PDF for {self.submission}"
