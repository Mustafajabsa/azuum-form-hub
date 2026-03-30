from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from storage.models import Folder, File, UserActivity
import os
import django
import io
import json
import uuid

User = get_user_model()

# Use in-memory file storage during tests so no real files are written to disk
TEST_STORAGE = {
    'default': {
        'BACKEND': 'django.core.files.storage.InMemoryStorage',
    }
}

def make_user(email='user@example.com', password='testpass123', username=None):
    if username is None:
        username = email.split('@')[0]  # Use email prefix as username
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )
    return user

def get_tokens(user):
    """Return a valid JWT access token string for the given user."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


def make_file(name='test.txt', content=b'hello world', mime='text/plain'):
    """Create a SimpleUploadedFile ready for multipart POST."""
    return SimpleUploadedFile(name, content, content_type=mime)


@override_settings(
    DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage',
    STORAGES=TEST_STORAGE,
    MAX_UPLOAD_SIZE=50 * 1024 * 1024,
    ALLOWED_FILE_TYPES=[],  # empty = allow all types in tests
    MEDIA_ROOT='/tmp/test_media/',
)
class UnifiedUploadViewTests(TestCase):
    """Tests for POST /api/storage/upload/"""

    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        self.token = get_tokens(self.user)
        self.url = '/api/storage/upload/'

    def auth_headers(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    # ------------------------------------------------------------------
    # Authentication tests
    # ------------------------------------------------------------------

    def test_upload_requires_authentication(self):
        """No token → 401."""
        f = make_file()
        response = self.client.post(
            self.url,
            data={'files': f, 'relative_paths': 'test.txt'},
            format='multipart',
        )
        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertIn('error', data)

    def test_upload_invalid_token_rejected(self):
        """Garbage token → 401."""
        f = make_file()
        response = self.client.post(
            self.url,
            data={'files': f, 'relative_paths': 'test.txt'},
            format='multipart',
            HTTP_AUTHORIZATION='Bearer not-a-real-token',
        )
        self.assertEqual(response.status_code, 401)

    # ------------------------------------------------------------------
    # Validation tests
    # ------------------------------------------------------------------

    def test_upload_no_files_returns_400(self):
        """Missing files → 400."""
        response = self.client.post(
            self.url,
            data={'relative_paths': 'test.txt'},
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())

    def test_upload_no_paths_returns_400(self):
        """Missing relative_paths → 400."""
        f = make_file()
        response = self.client.post(
            self.url,
            data={'files': f},
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())

    def test_upload_mismatched_count_returns_400(self):
        """2 files but 1 path → 400."""
        f1 = make_file('a.txt', b'aaa')
        f2 = make_file('b.txt', b'bbb')
        response = self.client.post(
            self.url,
            data={
                'files': [f1, f2],
                'relative_paths': ['a.txt'],  # only 1 path for 2 files
            },
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('same length', response.json()['error'])

    @override_settings(MAX_UPLOAD_SIZE=5)  # 5 bytes — any real file will exceed this
    def test_upload_file_too_large_returns_400(self):
        """File exceeds MAX_UPLOAD_SIZE → 400."""
        f = make_file('big.txt', b'this is more than 5 bytes')
        response = self.client.post(
            self.url,
            data={'files': f, 'relative_paths': 'big.txt'},
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('exceeds', response.json()['error'])

    @override_settings(ALLOWED_FILE_TYPES=['image/png'])
    def test_upload_disallowed_mime_type_returns_400(self):
        """text/plain not in ALLOWED_FILE_TYPES → 400."""
        f = make_file('doc.txt', b'text', mime='text/plain')
        response = self.client.post(
            self.url,
            data={'files': f, 'relative_paths': 'doc.txt'},
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('not allowed', response.json()['error'])

    def test_upload_invalid_folder_id_returns_404(self):
        """Non-existent folder_id → 404."""
        f = make_file()
        response = self.client.post(
            self.url,
            data={
                'files': f,
                'relative_paths': 'test.txt',
                'folder_id': str(uuid.uuid4()),
            },
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 404)

    # ------------------------------------------------------------------
    # Flat upload tests
    # ------------------------------------------------------------------

    def test_flat_single_file_upload(self):
        """Single file with flat path → mode=flat, files_created=1."""
        f = make_file('document.pdf', b'pdf content', 'application/pdf')
        response = self.client.post(
            self.url,
            data={'files': f, 'relative_paths': 'document.pdf'},
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['mode'], 'flat')
        self.assertEqual(data['files_created'], 1)
        self.assertEqual(data['folders_created'], 0)
        self.assertIsNone(data['root_folder_id'])

        # DB check
        self.assertEqual(File.objects.filter(owner=self.user, is_deleted=False).count(), 1)
        f_obj = File.objects.get(owner=self.user, is_deleted=False)
        self.assertEqual(f_obj.name, 'document.pdf')
        self.assertEqual(f_obj.mime_type, 'application/pdf')

    def test_flat_multiple_files_upload(self):
        """Multiple flat files → all placed in same folder."""
        files = [
            make_file('a.txt', b'aaa'),
            make_file('b.txt', b'bbb'),
            make_file('c.txt', b'ccc'),
        ]
        paths = ['a.txt', 'b.txt', 'c.txt']
        response = self.client.post(
            self.url,
            data={'files': files, 'relative_paths': paths},
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['mode'], 'flat')
        self.assertEqual(data['files_created'], 3)
        self.assertEqual(
            File.objects.filter(owner=self.user, is_deleted=False).count(), 3
        )

    def test_flat_upload_into_existing_folder(self):
        """Flat upload with valid folder_id places file in that folder."""
        folder = Folder.objects.create(name='My Folder', owner=self.user)
        f = make_file('report.txt', b'data')
        response = self.client.post(
            self.url,
            data={
                'files': f,
                'relative_paths': 'report.txt',
                'folder_id': str(folder.id),
            },
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        file_obj = File.objects.get(owner=self.user, is_deleted=False)
        self.assertEqual(file_obj.folder_id, folder.id)

    # ------------------------------------------------------------------
    # Folder tree upload tests
    # ------------------------------------------------------------------

    def test_folder_tree_upload_creates_nested_structure(self):
        """
        Upload 3 files with nested paths → folder_tree mode,
        correct folder hierarchy in DB.
        """
        files = [
            make_file('index.js', b'console.log("hi")'),
            make_file('utils.js', b'export {}'),
            make_file('README.md', b'# readme'),
        ]
        paths = [
            'myproject/src/index.js',
            'myproject/src/utils.js',
            'myproject/README.md',
        ]
        response = self.client.post(
            self.url,
            data={'files': files, 'relative_paths': paths},
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['mode'], 'folder_tree')
        self.assertEqual(data['files_created'], 3)
        # Should have created: myproject, myproject/src  (2 folders)
        self.assertEqual(data['folders_created'], 2)
        self.assertIsNotNone(data['root_folder_id'])

        # Verify folder structure
        root = Folder.objects.get(id=data['root_folder_id'])
        self.assertEqual(root.name, 'myproject')
        self.assertIsNone(root.parent)

        src = Folder.objects.get(name='src', parent=root, owner=self.user)
        self.assertIsNotNone(src)

        # Verify files land in correct folders
        index_js = File.objects.get(name='index.js', owner=self.user)
        self.assertEqual(index_js.folder_id, src.id)

        readme = File.objects.get(name='README.md', owner=self.user)
        self.assertEqual(readme.folder_id, root.id)

    def test_folder_tree_does_not_duplicate_folders(self):
        """
        Two files in same subfolder should not create duplicate folder records.
        """
        files = [make_file('a.py', b'a'), make_file('b.py', b'b')]
        paths = ['pkg/module/a.py', 'pkg/module/b.py']
        response = self.client.post(
            self.url,
            data={'files': files, 'relative_paths': paths},
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        # Should be exactly 2 folders: pkg and pkg/module
        self.assertEqual(
            Folder.objects.filter(owner=self.user, is_deleted=False).count(), 2
        )

    def test_folder_tree_under_existing_parent_folder(self):
        """
        folder_id is provided → tree is built under that existing folder.
        """
        parent = Folder.objects.create(name='Projects', owner=self.user)
        files = [make_file('main.py', b'main')]
        paths = ['app/main.py']
        response = self.client.post(
            self.url,
            data={
                'files': files,
                'relative_paths': paths,
                'folder_id': str(parent.id),
            },
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, 201)
        app_folder = Folder.objects.get(name='app', owner=self.user)
        self.assertEqual(app_folder.parent_id, parent.id)

    # ------------------------------------------------------------------
    # Activity logging tests
    # ------------------------------------------------------------------

    def test_upload_logs_one_activity_record(self):
        """Each upload request → exactly 1 UserActivity record."""
        f = make_file()
        self.client.post(
            self.url,
            data={'files': f, 'relative_paths': 'test.txt'},
            format='multipart',
            **self.auth_headers(),
        )
        self.assertEqual(
            UserActivity.objects.filter(user=self.user, action='upload').count(), 1
        )

    def test_activity_details_contain_correct_mode(self):
        """Activity details should record the upload mode."""
        files = [make_file('x.txt', b'x'), make_file('y.txt', b'y')]
        paths = ['dir/x.txt', 'dir/y.txt']
        self.client.post(
            self.url,
            data={'files': files, 'relative_paths': paths},
            format='multipart',
            **self.auth_headers(),
        )
        activity = UserActivity.objects.get(user=self.user, action='upload')
        self.assertEqual(activity.details['mode'], 'folder_tree')
        self.assertEqual(activity.details['files_created'], 2)

    # ------------------------------------------------------------------
    # HTTP method tests
    # ------------------------------------------------------------------

    def test_get_method_not_allowed(self):
        """GET → 405."""
        response = self.client.get(self.url, **self.auth_headers())
        self.assertEqual(response.status_code, 405)

    def test_put_method_not_allowed(self):
        """PUT → 405."""
        response = self.client.put(self.url, **self.auth_headers())
        self.assertEqual(response.status_code, 405)

    # ------------------------------------------------------------------
    # Isolation test — users cannot see each other's files
    # ------------------------------------------------------------------

    def test_uploaded_files_belong_to_authenticated_user(self):
        """Files uploaded by user A are not visible to user B."""
        f = make_file('private.txt', b'secret')
        self.client.post(
            self.url,
            data={'files': f, 'relative_paths': 'private.txt'},
            format='multipart',
            **self.auth_headers(),
        )
        other_user = make_user(email='other@example.com')
        other_token = get_tokens(other_user)
        response = self.client.get(
            '/api/storage/files/',
            HTTP_AUTHORIZATION=f'Bearer {other_token}',
        )
        self.assertEqual(response.status_code, 200)
        results = response.json().get('results', response.json())
        self.assertEqual(len(results), 0)


@override_settings(
    DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage',
    STORAGES=TEST_STORAGE,
    MAX_UPLOAD_SIZE=50 * 1024 * 1024,
    ALLOWED_FILE_TYPES=[],
)
class FileMoveViewTests(TestCase):
    """Tests for the fixed move() action on FileViewSet."""

    def setUp(self):
        self.client = APIClient()
        self.user = make_user(email='mover@example.com')
        self.token = get_tokens(self.user)
        self.folder_a = Folder.objects.create(name='Folder A', owner=self.user)
        self.folder_b = Folder.objects.create(name='Folder B', owner=self.user)
        self.file = File.objects.create(
            name='moveme.txt',
            original_name='moveme.txt',
            file_path=SimpleUploadedFile('moveme.txt', b'data'),
            file_size=4,
            mime_type='text/plain',
            folder=self.folder_a,
            owner=self.user,
        )

    def test_move_file_to_different_folder(self):
        """POST .../move/ with folder_id moves the file — no NameError."""
        url = f'/api/storage/files/{self.file.id}/move/'
        response = self.client.post(
            url,
            data=json.dumps({'folder_id': str(self.folder_b.id)}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.assertEqual(response.status_code, 200)
        self.file.refresh_from_db()
        self.assertEqual(self.file.folder_id, self.folder_b.id)

    def test_move_file_no_folder_id_clears_folder(self):
        """POST .../move/ without folder_id sets folder to None."""
        url = f'/api/storage/files/{self.file.id}/move/'
        response = self.client.post(
            url,
            data=json.dumps({}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.assertEqual(response.status_code, 200)
        self.file.refresh_from_db()
        self.assertIsNone(self.file.folder)

    def test_move_file_belonging_to_other_user_forbidden(self):
        """Cannot move another user's file."""
        other = make_user(email='other2@example.com')
        other_token = get_tokens(other)
        url = f'/api/storage/files/{self.file.id}/move/'
        response = self.client.post(
            url,
            data=json.dumps({'folder_id': str(self.folder_b.id)}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {other_token}',
        )
        # 404 because the queryset filters by owner — other user can't even see this file
        self.assertIn(response.status_code, [403, 404])


@override_settings(
    DEFAULT_FILE_STORAGE='django.core.files.storage.InMemoryStorage',
    STORAGES=TEST_STORAGE,
    MAX_UPLOAD_SIZE=50 * 1024 * 1024,
    ALLOWED_FILE_TYPES=[],
)
class FileDeleteViewTests(TestCase):
    """Tests for delete_file and batch_delete actions."""

    def setUp(self):
        self.client = APIClient()
        self.user = make_user(email='deleter@example.com')
        self.token = get_tokens(self.user)
        self.folder = Folder.objects.create(name='Root', owner=self.user)

    def _make_db_file(self, name='file.txt'):
        return File.objects.create(
            name=name,
            original_name=name,
            file_path=SimpleUploadedFile(name, b'content'),
            file_size=7,
            mime_type='text/plain',
            folder=self.folder,
            owner=self.user,
        )

    def test_delete_single_file(self):
        """DELETE .../delete_file/ soft-deletes the file."""
        f = self._make_db_file()
        url = f'/api/storage/files/{f.id}/delete_file/'
        response = self.client.delete(
            url, HTTP_AUTHORIZATION=f'Bearer {self.token}'
        )
        self.assertEqual(response.status_code, 200)
        f.refresh_from_db()
        self.assertTrue(f.is_deleted)

    def test_batch_delete_files(self):
        """DELETE .../batch_delete/ soft-deletes multiple files."""
        f1 = self._make_db_file('f1.txt')
        f2 = self._make_db_file('f2.txt')
        url = '/api/storage/files/batch_delete/'
        response = self.client.delete(
            url,
            data=json.dumps({'file_ids': [str(f1.id), str(f2.id)]}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['deleted']), 2)
        self.assertEqual(len(data['errors']), 0)
        f1.refresh_from_db()
        f2.refresh_from_db()
        self.assertTrue(f1.is_deleted)
        self.assertTrue(f2.is_deleted)

    def test_batch_delete_empty_list_returns_400(self):
        """Passing empty file_ids → 400."""
        url = '/api/storage/files/batch_delete/'
        response = self.client.delete(
            url,
            data=json.dumps({'file_ids': []}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.token}',
        )
        self.assertEqual(response.status_code, 400)