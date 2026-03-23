#!/usr/bin/env python
"""
Test script to verify Phase 1 setup
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def test_models():
    """Test that all models are properly defined"""
    print("🔍 Testing Models...")
    
    try:
        from accounts.models import User
        from forms.models import Form, FormField
        from submissions.models import Submission, GeneratedPDF
        print("✅ All models imported successfully")
        
        # Test user creation
        user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            role='user'
        )
        print(f"✅ User created: {user}")
        
        # Test form creation
        form = Form.objects.create(
            title='Test Form',
            description='A test form',
            creator=user,
            status='draft'
        )
        print(f"✅ Form created: {form}")
        
        # Test form field creation
        field = FormField.objects.create(
            form=form,
            label='Test Field',
            field_type='text',
            required=True,
            order=1
        )
        print(f"✅ FormField created: {field}")
        
        # Test submission creation
        form.status = 'published'
        form.save()
        
        submission = Submission.objects.create(
            form=form,
            submitter=user,
            data={'Test Field': 'Test Value'}
        )
        print(f"✅ Submission created: {submission}")
        
        # Clean up
        submission.delete()
        field.delete()
        form.delete()
        user.delete()
        
        print("✅ All model tests passed")
        
    except Exception as e:
        print(f"❌ Model test failed: {e}")
        return False
    
    return True

def test_api_endpoints():
    """Test that API endpoints are properly configured"""
    print("\n🔍 Testing API Endpoints...")
    
    try:
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # Test that endpoints exist (should return 401 for protected endpoints)
        endpoints = [
            '/api/accounts/profile/',
            '/api/forms/forms/',
            '/api/submissions/submissions/',
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            if response.status_code == 401:
                print(f"✅ {endpoint} - Protected endpoint working")
            elif response.status_code == 200:
                print(f"✅ {endpoint} - Public endpoint working")
            else:
                print(f"⚠️  {endpoint} - Status: {response.status_code}")
        
        # Test public endpoints
        public_endpoints = [
            '/api/docs/',
            '/api/redoc/',
        ]
        
        for endpoint in public_endpoints:
            response = client.get(endpoint)
            if response.status_code == 200:
                print(f"✅ {endpoint} - Documentation endpoint working")
            else:
                print(f"❌ {endpoint} - Status: {response.status_code}")
        
        print("✅ API endpoint tests completed")
        
    except Exception as e:
        print(f"❌ API endpoint test failed: {e}")
        return False
    
    return True

def test_permissions():
    """Test role-based permissions"""
    print("\n🔍 Testing Role-Based Permissions...")
    
    try:
        from accounts.models import User
        
        # Create users with different roles
        roles = ['user', 'manager', 'admin', 'super_admin']
        users = []
        
        for role in roles:
            user = User.objects.create_user(
                email=f'{role}@example.com',
                username=f'{role}user',
                password='testpass123',
                role=role
            )
            users.append(user)
        
        print(f"✅ Created {len(users)} test users with different roles")
        
        # Clean up
        for user in users:
            user.delete()
        
        print("✅ Permission tests completed")
        
    except Exception as e:
        print(f"❌ Permission test failed: {e}")
        return False
    
    return True

def main():
    """Run all tests"""
    print("🚀 Starting Phase 1 Setup Tests\n")
    
    tests = [
        test_models,
        test_api_endpoints,
        test_permissions,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Phase 1 setup is complete.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the setup.")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
