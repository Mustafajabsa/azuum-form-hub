from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Form, FormField

User = get_user_model()


class FormsTestCase(TestCase):
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
        
        # Authenticate as regular user
        self.client.force_authenticate(user=self.user)
        
        self.form_data = {
            'title': 'Test Form',
            'description': 'A test form',
            'status': 'draft',
            'fields': [
                {
                    'label': 'Name',
                    'field_type': 'text',
                    'required': True,
                    'placeholder': 'Enter your name',
                    'order': 1
                },
                {
                    'label': 'Email',
                    'field_type': 'email',
                    'required': True,
                    'placeholder': 'Enter your email',
                    'order': 2
                }
            ]
        }
    
    def test_create_form(self):
        """Test form creation"""
        response = self.client.post('/api/forms/forms/', self.form_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Form.objects.count(), 1)
        self.assertEqual(FormField.objects.count(), 2)
    
    def test_list_forms(self):
        """Test listing forms"""
        # Create a form
        Form.objects.create(
            title='Test Form',
            description='Test description',
            creator=self.user
        )
        
        response = self.client.get('/api/forms/forms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_form_permissions(self):
        """Test that users can only see their own forms"""
        # Create form by another user
        other_user = User.objects.create_user(
            email='other@example.com',
            username='otheruser',
            password='otherpass123',
            role='user'
        )
        
        Form.objects.create(
            title='Other User Form',
            description='Other user description',
            creator=other_user
        )
        
        # Create form by current user
        Form.objects.create(
            title='My Form',
            description='My description',
            creator=self.user
        )
        
        response = self.client.get('/api/forms/forms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)  # Should only see own form
    
    def test_admin_can_see_all_forms(self):
        """Test that admins can see all forms"""
        # Authenticate as admin
        self.client.force_authenticate(user=self.admin_user)
        
        # Create forms by different users
        Form.objects.create(
            title='User Form',
            description='User description',
            creator=self.user
        )
        
        Form.objects.create(
            title='Admin Form',
            description='Admin description',
            creator=self.admin_user
        )
        
        response = self.client.get('/api/forms/forms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)  # Should see both forms
    
    def test_publish_form(self):
        """Test publishing a form"""
        form = Form.objects.create(
            title='Test Form',
            description='Test description',
            creator=self.user,
            status='draft'
        )
        
        response = self.client.post(f'/api/forms/forms/{form.id}/publish/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        form.refresh_from_db()
        self.assertEqual(form.status, 'published')
    
    def test_clone_form(self):
        """Test cloning a form"""
        form = Form.objects.create(
            title='Original Form',
            description='Original description',
            creator=self.user
        )
        
        # Add fields
        FormField.objects.create(
            form=form,
            label='Name',
            field_type='text',
            required=True,
            order=1
        )
        
        response = self.client.get(f'/api/forms/forms/{form.id}/clone/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that form was cloned
        self.assertEqual(Form.objects.count(), 2)
        self.assertEqual(FormField.objects.count(), 2)
