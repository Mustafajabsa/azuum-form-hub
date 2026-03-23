from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from forms.models import Form, FormField
from .models import Submission, GeneratedPDF

User = get_user_model()


class SubmissionsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            role='user'
        )
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            username='adminuser',
            password='adminpass123',
            role='admin'
        )
        
        # Create a published form
        self.form = Form.objects.create(
            title='Test Form',
            description='A test form',
            creator=self.admin_user,
            status='published'
        )
        
        # Add fields to form
        FormField.objects.create(
            form=self.form,
            label='Name',
            field_type='text',
            required=True,
            order=1
        )
        
        FormField.objects.create(
            form=self.form,
            label='Email',
            field_type='email',
            required=True,
            order=2
        )
        
        # Authenticate as regular user
        self.client.force_authenticate(user=self.user)
        
        self.submission_data = {
            'form_id': self.form.id,
            'data': {
                'Name': 'John Doe',
                'Email': 'john@example.com'
            }
        }
    
    def test_create_submission(self):
        """Test form submission"""
        response = self.client.post('/api/submissions/submissions/', self.submission_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Submission.objects.count(), 1)
        
        submission = Submission.objects.first()
        self.assertEqual(submission.form, self.form)
        self.assertEqual(submission.submitter, self.user)
        self.assertEqual(submission.data['Name'], 'John Doe')
    
    def test_submit_to_draft_form(self):
        """Test that submissions to draft forms are rejected"""
        # Create a draft form
        draft_form = Form.objects.create(
            title='Draft Form',
            description='A draft form',
            creator=self.admin_user,
            status='draft'
        )
        
        draft_data = {
            'form_id': draft_form.id,
            'data': {'Name': 'Test User'}
        }
        
        response = self.client.post('/api/submissions/submissions/', draft_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Form not found or not published', response.data['form_id'][0])
    
    def test_list_submissions(self):
        """Test listing submissions"""
        # Create a submission
        Submission.objects.create(
            form=self.form,
            submitter=self.user,
            data=self.submission_data['data']
        )
        
        response = self.client.get('/api/submissions/submissions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_submission_permissions(self):
        """Test that users can only see their own submissions"""
        # Create submission by another user
        other_user = User.objects.create_user(
            email='other@example.com',
            username='otheruser',
            password='otherpass123',
            role='user'
        )
        
        Submission.objects.create(
            form=self.form,
            submitter=other_user,
            data={'Name': 'Other User'}
        )
        
        # Create submission by current user
        Submission.objects.create(
            form=self.form,
            submitter=self.user,
            data={'Name': 'Current User'}
        )
        
        response = self.client.get('/api/submissions/submissions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)  # Should only see own submission
    
    def test_admin_can_see_all_submissions(self):
        """Test that admins can see all submissions"""
        # Authenticate as admin
        self.client.force_authenticate(user=self.admin_user)
        
        # Create submissions by different users
        Submission.objects.create(
            form=self.form,
            submitter=self.user,
            data={'Name': 'Regular User'}
        )
        
        Submission.objects.create(
            form=self.form,
            submitter=self.admin_user,
            data={'Name': 'Admin User'}
        )
        
        response = self.client.get('/api/submissions/submissions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)  # Should see both submissions
    
    def test_my_submissions(self):
        """Test my_submissions endpoint"""
        # Create a submission
        Submission.objects.create(
            form=self.form,
            submitter=self.user,
            data=self.submission_data['data']
        )
        
        response = self.client.get('/api/submissions/submissions/my_submissions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_generate_pdf(self):
        """Test PDF generation"""
        # Create a submission first
        submission = Submission.objects.create(
            form=self.form,
            submitter=self.user,
            data=self.submission_data['data']
        )
        
        response = self.client.post(f'/api/submissions/submissions/{submission.id}/generate_pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that PDF was created
        self.assertTrue(GeneratedPDF.objects.filter(submission=submission).exists())
    
    def test_download_pdf(self):
        """Test PDF download"""
        # Create submission and PDF
        submission = Submission.objects.create(
            form=self.form,
            submitter=self.user,
            data=self.submission_data['data']
        )
        
        pdf = GeneratedPDF.objects.create(submission=submission)
        
        response = self.client.get(f'/api/submissions/submissions/{submission.id}/download_pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
