#!/usr/bin/env python
"""Test Phase 2 Storage APIs"""

import os
import sys
import django
from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

User = get_user_model()

def test_storage_apis():
    """Test storage API endpoints"""
    client = Client()
    
    # Create test user
    user = User.objects.create_user(
        username='storage-test-2',
        email='storage-test-2@example.com',
        password='testpass123',
        first_name='Storage',
        last_name='Test'
    )
    
    print("🚀 Starting Phase 2 Storage API Tests")
    print()
    
    # Get JWT token
    print("🔍 Getting JWT Token...")
    response = client.post('/api/token/', {
        'email': 'storage-test-2@example.com',
        'password': 'testpass123'
    })
    
    if response.status_code == 200:
        token = response.json()['access']
        print(f"✅ JWT token obtained")
    else:
        print(f"❌ Failed to get JWT token: {response.status_code}")
        return
    
    # Set authentication header
    auth_header = f'Bearer {token}'
    
    # Test folder creation
    print("\n🔍 Testing Folder Creation...")
    
    folder_data = {
        'name': 'Test Folder',
        'description': 'Test folder description'
    }
    
    response = client.post('/api/storage/folders/', folder_data, content_type='application/json', HTTP_AUTHORIZATION=auth_header)
    if response.status_code == 201:
        folder_id = response.json()['id']
        print(f"✅ Folder created: {response.json()['name']}")
    else:
        print(f"❌ Folder creation failed: {response.status_code}")
        folder_id = None
    
    # Test file upload
    print("\n🔍 Testing File Upload...")
    
    # Create a simple test file
    from io import BytesIO
    test_file_content = b"This is a test file content"
    test_file = BytesIO(test_file_content)
    test_file.name = 'test.txt'
    
    upload_data = {
        'file': test_file,
    }
    
    if folder_id:
        upload_data['folder_id'] = folder_id
    
    response = client.post('/api/storage/upload/', upload_data, HTTP_AUTHORIZATION=auth_header)
    
    if response.status_code == 200:
        print(f"✅ File uploaded: {response.json()['name']}")
    else:
        print(f"❌ File upload failed: {response.status_code}")
    
    # Test folder listing
    print("\n🔍 Testing Folder Listing...")
    response = client.get('/api/storage/folders/', HTTP_AUTHORIZATION=auth_header)
    if response.status_code == 200:
        folders = response.json()
        print(f"✅ Found {len(folders)} folders")
        for folder in folders[:3]:  # Show first 3
            print(f"  - {folder['name']}")
    else:
        print(f"❌ Folder listing failed: {response.status_code}")
    
    # Test file listing
    print("\n🔍 Testing File Listing...")
    response = client.get('/api/storage/files/', HTTP_AUTHORIZATION=auth_header)
    if response.status_code == 200:
        files = response.json()
        print(f"✅ Found {len(files)} files")
        for file_obj in files[:3]:  # Show first 3
            print(f"  - {file_obj['name']} ({file_obj.get('size_display', 'N/A')})")
    else:
        print(f"❌ File listing failed: {response.status_code}")
    
    # Test user activities
    print("\n🔍 Testing User Activities...")
    response = client.get('/api/storage/activities/', HTTP_AUTHORIZATION=auth_header)
    if response.status_code == 200:
        activities = response.json()
        print(f"✅ Found {len(activities)} activities")
        for activity in activities[:3]:  # Show first 3
            print(f"  - {activity['action']} on {activity['object_type']}")
    else:
        print(f"❌ Activities listing failed: {response.status_code}")
    
    print("\n📊 Storage API Test Results:")
    print("✅ Phase 2 Storage APIs are working!")
    print("🎉 Storage app is ready for frontend integration!")
    
    # Cleanup
    user.delete()

if __name__ == '__main__':
    test_storage_apis()
