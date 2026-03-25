from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
import json
import uuid

User = get_user_model()


class FolderModelTest(TestCase):
    """Test Folder model"""
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
    def test_folder_creation(self):
        """Test folder creation"""
        folder = Folder.objects.create(
            name='Test Folder',
            owner=self.user
        )
        
        self.assertEqual(folder.name, 'Test Folder')
        self.assertEqual(folder.owner, self.user)
        self.assertIsNotNone(folder.created_at)
    
    def test_folder_hierarchy(self):
        """Test parent-child folder relationship"""
        parent = Folder.objects.create(
            name='Parent Folder',
            owner=self.user
        )
        
        child = Folder.objects.create(
            name='Child Folder',
            owner=self.user,
            parent=parent
        )
        
        self.assertEqual(child.parent, parent)
        self.assertEqual(list(parent.children.all()), [child])
    
    def test_folder_path_property(self):
        """Test folder path generation"""
        parent = Folder.objects.create(
            name='Documents',
            owner=self.user
        )
        
        child = Folder.objects.create(
            name='Work',
            owner=self.user,
            parent=parent
        )
        
        self.assertEqual(child.path, '/Documents/Work')


class FileModelTest(TestCase):
    """Test File model"""
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
        self.folder = Folder.objects.create(
            name='Test Folder',
            owner=self.user
        )
    
    def test_file_creation(self):
        """Test file creation"""
        file_obj = File.objects.create(
            name='test.txt',
            original_name='test.txt',
            file_path='uploads/test.txt',
            file_size=1024,
            mime_type='text/plain',
            folder=self.folder,
            owner=self.user
        )
        
        self.assertEqual(file_obj.name, 'test.txt')
        self.assertEqual(file_obj.folder, self.folder)
        self.assertEqual(file_obj.owner, self.user)
    
    def test_file_size_display(self):
        """Test file size display property"""
        file_obj = File.objects.create(
            name='large.pdf',
            original_name='large.pdf',
            file_path='uploads/large.pdf',
            file_size=1024 * 1024,  # 1MB
            mime_type='application/pdf',
            owner=self.user
        )
        
        self.assertEqual(file_obj.size_display, '1.0 MB')


class StorageAPITest(TestCase):
    """Test Storage API endpoints"""
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_folder_list(self):
        """Test folder listing"""
        Folder.objects.create(name='Test Folder', owner=self.user)
        
        response = self.client.get('/api/storage/folders/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
    
    def test_folder_create(self):
        """Test folder creation"""
        data = {
            'name': 'New Test Folder',
            'description': 'Test Description'
        }
        
        response = self.client.post('/api/storage/folders/', data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['name'], 'New Test Folder')
    
    def test_file_upload(self):
        """Test file upload"""
        folder = Folder.objects.create(name='Uploads', owner=self.user)
        
        test_file = SimpleUploadedFile(
            'test.txt',
            b'File content',
            content_type='text/plain'
        )
        
        data = {
            'name': 'test.txt',
            'folder': folder.id
        }
        
        response = self.client.post(
            '/api/storage/upload/',
            data=data,
            format='multipart',
            FILES={'file': test_file}
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('id', response.data)
    
    def test_file_download(self):
        """Test file download"""
        file_obj = File.objects.create(
            name='download.txt',
            original_name='download.txt',
            file_path='uploads/download.txt',
            file_size=512,
            mime_type='text/plain',
            owner=self.user
        )
        
        response = self.client.get(f'/api/storage/files/{file_obj.id}/download/')
        self.assertEqual(response.status_code, 200)
    
    def test_file_share(self):
        """Test file sharing"""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123'
        )
        
        file_obj = File.objects.create(
            name='share.txt',
            original_name='share.txt',
            file_path='uploads/share.txt',
            file_size=256,
            mime_type='text/plain',
            owner=self.user
        )
        
        data = {
            'email': other_user.email,
            'can_edit': True
        }
        
        response = self.client.post(
            f'/api/storage/files/{file_obj.id}/share/',
            data
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('message', response.data)
    
    def test_activity_logging(self):
        """Test user activity logging"""
        response = self.client.get('/api/storage/activities/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
