from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from .models import DashboardStats, UserActivitySummary, SystemWideStats
from storage.models import Folder, File
from forms.models import Form, Submission

User = get_user_model()


class DashboardModelsTest(TestCase):
    """Test dashboard models"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='dashboard-test',
            email='dashboard-test@example.com',
            password='testpass123'
        )
    
    def test_dashboard_stats_creation(self):
        """Test dashboard stats creation"""
        stats = DashboardStats.objects.create(
            user=self.user,
            total_folders=5,
            total_files=10,
            total_storage_used=1024000,
            total_forms_created=3,
            total_submissions_received=7
        )
        
        self.assertEqual(stats.user, self.user)
        self.assertEqual(stats.total_folders, 5)
        self.assertEqual(stats.total_files, 10)
        self.assertEqual(stats.total_storage_used, 1024000)
        self.assertEqual(stats.total_forms_created, 3)
        self.assertEqual(stats.total_submissions_received, 7)
    
    def test_storage_percentage_calculation(self):
        """Test storage usage percentage calculation"""
        stats = DashboardStats.objects.create(
            user=self.user,
            total_storage_used=1073741824,  # 1GB
            total_storage_limit=5368709120   # 5GB
        )
        
        # 1GB / 5GB = 20%
        self.assertEqual(stats.storage_used_percentage, 20.0)
    
    def test_storage_display_formatting(self):
        """Test storage display formatting"""
        stats = DashboardStats.objects.create(
            user=self.user,
            total_storage_used=1073741824,  # 1GB
            total_storage_limit=5368709120   # 5GB
        )
        
        self.assertEqual(stats.storage_used_display, "1.00 GB")
        self.assertEqual(stats.storage_limit_display, "5.00 GB")
    
    def test_activity_summary_creation(self):
        """Test activity summary creation"""
        summary = UserActivitySummary.objects.create(
            user=self.user,
            date=timezone.now().date(),
            files_uploaded=3,
            files_downloaded=2,
            folders_created=1,
            forms_created=1,
            submissions_made=4
        )
        
        self.assertEqual(summary.user, self.user)
        self.assertEqual(summary.files_uploaded, 3)
        self.assertEqual(summary.files_downloaded, 2)
        self.assertEqual(summary.folders_created, 1)
        self.assertEqual(summary.forms_created, 1)
        self.assertEqual(summary.submissions_made, 4)


class DashboardAPITest(TestCase):
    """Test dashboard API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='dashboard-api-test',
            email='dashboard-api-test@example.com',
            password='testpass123'
        )
        self.admin_user = User.objects.create_user(
            username='admin-test',
            email='admin-test@example.com',
            password='adminpass123',
            is_staff=True,
            is_superuser=True
        )
    
    def test_dashboard_stats_endpoint(self):
        """Test dashboard stats endpoint"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/dashboard/stats/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_dashboard_overview_endpoint(self):
        """Test dashboard overview endpoint"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/dashboard/stats/overview/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user_stats', response.data)
        self.assertIn('recent_activities', response.data)
        self.assertIn('storage_breakdown', response.data)
        self.assertIn('activity_chart_data', response.data)
    
    def test_storage_analytics_endpoint(self):
        """Test storage analytics endpoint"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/dashboard/stats/storage_analytics/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('file_types', response.data)
        self.assertIn('storage_growth', response.data)
        self.assertIn('largest_files', response.data)
    
    def test_system_stats_admin_only(self):
        """Test system stats endpoint is admin-only"""
        # Regular user should not have access
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/dashboard/system/overview/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin user should have access
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/dashboard/system/overview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_unauthorized_access(self):
        """Test unauthorized access to dashboard endpoints"""
        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DashboardIntegrationTest(TestCase):
    """Test dashboard integration with other apps"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='integration-test',
            email='integration-test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_stats_update_with_storage_data(self):
        """Test that stats update correctly with storage data"""
        # Create some test data
        folder = Folder.objects.create(
            name='Test Folder',
            owner=self.user
        )
        
        # Create dashboard stats
        response = self.client.get('/api/dashboard/stats/overview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that stats reflect the created folder
        user_stats = response.data['user_stats']
        self.assertGreaterEqual(user_stats['total_folders'], 1)
    
    def test_stats_update_with_form_data(self):
        """Test that stats update correctly with form data"""
        # Create a test form
        form = Form.objects.create(
            title='Test Form',
            owner=self.user
        )
        
        # Create dashboard stats
        response = self.client.get('/api/dashboard/stats/overview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that stats reflect the created form
        user_stats = response.data['user_stats']
        self.assertGreaterEqual(user_stats['total_forms_created'], 1)
    
    def test_real_time_stats_calculation(self):
        """Test that stats are calculated in real-time"""
        # Get initial stats
        response = self.client.get('/api/dashboard/stats/overview/')
        initial_folders = response.data['user_stats']['total_folders']
        
        # Create a new folder
        Folder.objects.create(
            name='New Test Folder',
            owner=self.user
        )
        
        # Get updated stats
        response = self.client.get('/api/dashboard/stats/overview/')
        updated_folders = response.data['user_stats']['total_folders']
        
        # Stats should reflect the new folder
        self.assertEqual(updated_folders, initial_folders + 1)
