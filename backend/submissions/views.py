import os
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from io import BytesIO
from .models import Submission, GeneratedPDF
from .serializers import (
    SubmissionSerializer, 
    SubmissionCreateSerializer,
    GeneratedPDFSerializer
)


class SubmissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing form submissions"""
    queryset = Submission.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['form', 'submitter']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SubmissionCreateSerializer
        return SubmissionSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Super admins and admins can see all submissions
        if user.role in ['super_admin', 'admin']:
            return Submission.objects.all()
        
        # Other users can only see their own submissions
        return Submission.objects.filter(submitter=user)
    
    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate PDF for a submission"""
        submission = self.get_object()
        
        try:
            # Check if PDF already exists
            if hasattr(submission, 'pdf'):
                serializer = GeneratedPDFSerializer(submission.pdf)
                return Response(serializer.data)
            
            # Generate PDF
            pdf_buffer = BytesIO()
            p = canvas.Canvas(pdf_buffer, pagesize=letter)
            
            # Add title
            p.setFont("Helvetica-Bold", 16)
            p.drawString(100, 750, f"Form: {submission.form.title}")
            
            # Add submitter info
            p.setFont("Helvetica", 12)
            p.drawString(100, 720, f"Submitted by: {submission.submitter.get_full_name()}")
            p.drawString(100, 700, f"Email: {submission.submitter.email}")
            p.drawString(100, 680, f"Date: {submission.submitted_at.strftime('%Y-%m-%d %H:%M')}")
            
            # Add form data
            y_position = 650
            p.setFont("Helvetica", 10)
            
            for field_name, field_value in submission.data.items():
                if y_position < 100:  # Start new page if needed
                    p.showPage()
                    y_position = 750
                
                p.drawString(100, y_position, f"{field_name}: {field_value}")
                y_position -= 20
            
            p.save()
            
            # Save PDF file
            pdf_filename = f"submission_{submission.id}.pdf"
            pdf_file = BytesIO(pdf_buffer.getvalue())
            
            # Create GeneratedPDF record
            generated_pdf = GeneratedPDF.objects.create(
                submission=submission,
                pdf_file=pdf_filename
            )
            
            # Save the file
            generated_pdf.pdf_file.save(pdf_filename, pdf_file, save=True)
            
            serializer = GeneratedPDFSerializer(generated_pdf)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download PDF for a submission"""
        submission = self.get_object()
        
        if not hasattr(submission, 'pdf'):
            return Response(
                {'error': 'PDF not generated yet'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        pdf = submission.pdf
        response = HttpResponse(pdf.pdf_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{pdf.pdf_file.name}"'
        return response
    
    @action(detail=False, methods=['get'])
    def my_submissions(self, request):
        """Get current user's submissions"""
        submissions = Submission.objects.filter(submitter=request.user)
        page = self.paginate_queryset(submissions)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class GeneratedPDFViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing generated PDFs"""
    queryset = GeneratedPDF.objects.all()
    serializer_class = GeneratedPDFSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Admins can see all PDFs
        if user.role in ['super_admin', 'admin']:
            return GeneratedPDF.objects.all()
        
        # Others can only see their own submission PDFs
        return GeneratedPDF.objects.filter(submission__submitter=user)
