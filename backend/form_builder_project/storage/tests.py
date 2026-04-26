# storage/tests.py
import os
import io
from django.test import TestCase, Client
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile

class StorageAPITestCase(TestCase):

    def setUp(self):
        self.client = Client()
        self.base = '/api'

    def check(self, name, response, expected_status, check_keys=None):
        passed = response.status_code == expected_status
        if check_keys:
            try:
                data = response.json()
                passed = passed and all(k in data for k in check_keys)
            except Exception:
                passed = False
        status = '✅ PASS' if passed else '❌ FAIL'
        print(f'  {status} — {name} (got {response.status_code}, expected {expected_status})')
        return passed

    # ============================================================
    # FOLDER CREATE
    # ============================================================
    def test_01_folder_create(self):
        print('\n=== FOLDER CREATE ===')

        # valid
        r = self.client.post(f'{self.base}/folders/create/',
            data={'folder_name': 'test_invoices'},
            content_type='application/json'
        )
        self.check('Create root folder', r, 201)

        # nested
        r = self.client.post(f'{self.base}/folders/create/',
            data={'folder_name': '2024', 'directory': 'test_invoices'},
            content_type='application/json'
        )
        self.check('Create nested folder', r, 201)

        # missing folder_name
        r = self.client.post(f'{self.base}/folders/create/',
            data={},
            content_type='application/json'
        )
        self.check('Missing folder_name returns 400', r, 400)

        # traversal sanitization
        r = self.client.post(f'{self.base}/folders/create/',
            data={'folder_name': '../../malicious', 'directory': 'test_invoices'},
            content_type='application/json'
        )
        self.check('Traversal in folder_name blocked', r, 400)

    # ============================================================
    # FILE UPLOAD
    # ============================================================
    def test_02_file_upload(self):
        print('\n=== FILE UPLOAD ===')

        # valid csv
        r = self.client.post(f'{self.base}/files/', {
            'directory': 'test_invoices/2024',
            'file': SimpleUploadedFile('sales.csv', b'name,amount\nJohn,500', content_type='text/csv')
        })
        self.check('Upload CSV to nested folder', r, 201)

        # valid pdf
        r = self.client.post(f'{self.base}/files/', {
            'directory': 'test_invoices/2024',
            'file': SimpleUploadedFile('report.pdf', b'%PDF-1.4 fake', content_type='application/pdf')
        })
        self.check('Upload PDF to nested folder', r, 201)

        # no file
        r = self.client.post(f'{self.base}/files/', {'directory': 'test_invoices'})
        self.check('Upload with no file returns 400', r, 400)

    # ============================================================
    # LIST / SEARCH / SORT
    # ============================================================
    def test_03_list_search_sort(self):
        print('\n=== LIST / SEARCH / SORT ===')

        r = self.client.get(f'{self.base}/files/')
        self.check('List root returns 200', r, 200, check_keys=['directories', 'files'])

        r = self.client.get(f'{self.base}/files/', {'directory': 'test_invoices/2024'})
        self.check('List specific directory', r, 200)

        r = self.client.get(f'{self.base}/files/', {'directory': 'test_invoices/2024', 'query': 'sales'})
        self.check('Search for sales', r, 200)

        r = self.client.get(f'{self.base}/files/', {'directory': 'test_invoices/2024', 'sort_by': 'name', 'order': 'asc'})
        self.check('Sort by name asc', r, 200)

        r = self.client.get(f'{self.base}/files/', {'directory': 'test_invoices/2024', 'sort_by': 'size', 'order': 'desc'})
        self.check('Sort by size desc', r, 200)

        # traversal sanitization
        r = self.client.get(f'{self.base}/files/', {'directory': '../../etc'})
        self.check('Traversal in directory sanitized', r, 200)

    # ============================================================
    # FILE METADATA
    # ============================================================
    def test_04_metadata(self):
        print('\n=== FILE METADATA ===')

        r = self.client.get(f'{self.base}/files/info/', {'path': 'test_invoices/2024/sales.csv'})
        self.check('Metadata for file', r, 200, check_keys=['name', 'type', 'extension', 'size_bytes', 'size_readable'])

        r = self.client.get(f'{self.base}/files/info/', {'path': 'test_invoices/2024'})
        self.check('Metadata for folder', r, 200, check_keys=['name', 'type'])

        r = self.client.get(f'{self.base}/files/info/')
        self.check('Missing path returns 400', r, 400)

        r = self.client.get(f'{self.base}/files/info/', {'path': 'nonexistent/file.csv'})
        self.check('Non-existent path returns 404', r, 404)

        # traversal
        r = self.client.get(f'{self.base}/files/info/', {'path': '../../etc/passwd'})
        self.check('Traversal in path returns 400', r, 400)

    # ============================================================
    # FILE COPY
    # ============================================================
    def test_05_copy(self):
        print('\n=== FILE COPY ===')

        r = self.client.post(f'{self.base}/files/copy/',
            data={'source_path': 'test_invoices/2024/sales.csv', 'destination_path': 'test_invoices/archive/sales_copy.csv'},
            content_type='application/json'
        )
        self.check('Copy file successfully', r, 200, check_keys=['message', 'source', 'destination'])

        r = self.client.post(f'{self.base}/files/copy/',
            data={'source_path': 'test_invoices/nonexistent.csv', 'destination_path': 'test_invoices/archive/none.csv'},
            content_type='application/json'
        )
        self.check('Copy non-existent source returns 404', r, 404)

        r = self.client.post(f'{self.base}/files/copy/',
            data={'source_path': 'test_invoices/2024'},
            content_type='application/json'
        )
        self.check('Copy missing destination returns 400', r, 400)

        # self copy
        r = self.client.post(f'{self.base}/files/copy/',
            data={'source_path': 'test_invoices/2024', 'destination_path': 'test_invoices/2024/sub'},
            content_type='application/json'
        )
        self.check('Copy into itself returns 400', r, 400)

        # traversal
        r = self.client.post(f'{self.base}/files/copy/',
            data={'source_path': '../../etc/passwd', 'destination_path': 'test_invoices/passwd'},
            content_type='application/json'
        )
        self.check('Traversal in source blocked', r, 400)

    # ============================================================
    # FILE MOVE
    # ============================================================
    def test_06_move(self):
        print('\n=== FILE MOVE ===')

        r = self.client.patch(f'{self.base}/files/move/',
            data={'source_path': 'test_invoices/archive/sales_copy.csv', 'destination_path': 'test_invoices/2024/sales_moved.csv'},
            content_type='application/json'
        )
        self.check('Move file successfully', r, 200, check_keys=['message', 'source', 'destination'])

        r = self.client.patch(f'{self.base}/files/move/',
            data={'source_path': 'test_invoices/nonexistent.csv', 'destination_path': 'test_invoices/2024/none.csv'},
            content_type='application/json'
        )
        self.check('Move non-existent source returns 404', r, 404)

        r = self.client.patch(f'{self.base}/files/move/',
            data={'source_path': 'test_invoices/2024', 'destination_path': 'test_invoices/2024/subfolder'},
            content_type='application/json'
        )
        self.check('Move into itself returns 400', r, 400)

        # traversal
        r = self.client.patch(f'{self.base}/files/move/',
            data={'source_path': 'test_invoices/2024/report.pdf', 'destination_path': '../../etc/report.pdf'},
            content_type='application/json'
        )
        self.check('Traversal in destination blocked', r, 400)

    # ============================================================
    # FILE RENAME
    # ============================================================
    def test_07_rename(self):
        print('\n=== FILE RENAME ===')

        r = self.client.patch(f'{self.base}/files/rename/',
            data={'path': 'test_invoices/2024/report.pdf', 'new_name': 'report_final.pdf'},
            content_type='application/json'
        )
        self.check('Rename file successfully', r, 200, check_keys=['message', 'old_path', 'new_path'])

        r = self.client.patch(f'{self.base}/files/rename/',
            data={'path': 'test_invoices/nonexistent.csv', 'new_name': 'renamed.csv'},
            content_type='application/json'
        )
        self.check('Rename non-existent path returns 404', r, 404)

        r = self.client.patch(f'{self.base}/files/rename/',
            data={'path': 'test_invoices/2024/sales.csv', 'new_name': 'sales.csv'},
            content_type='application/json'
        )
        self.check('Rename to same name returns 409', r, 409)

        # separator in new_name
        r = self.client.patch(f'{self.base}/files/rename/',
            data={'path': 'test_invoices/2024/sales.csv', 'new_name': 'sub/malicious.csv'},
            content_type='application/json'
        )
        self.check('Separator in new_name returns 400', r, 400)

        # null byte
        r = self.client.patch(f'{self.base}/files/rename/',
            data={'path': 'test_invoices/2024/sales.csv', 'new_name': 'mal\x00.csv'},
            content_type='application/json'
        )
        self.check('Null byte in new_name returns 400', r, 400)

    # ============================================================
    # BULK DELETE
    # ============================================================
    def test_08_bulk_delete(self):
        print('\n=== BULK DELETE ===')

        r = self.client.post(f'{self.base}/files/bulk-delete/',
            data={'paths': ['test_invoices/2024/sales_moved.csv']},
            content_type='application/json'
        )
        self.check('Bulk delete valid file', r, 200, check_keys=['message', 'deleted', 'failed'])

        r = self.client.post(f'{self.base}/files/bulk-delete/',
            data={'paths': []},
            content_type='application/json'
        )
        self.check('Empty paths returns 400', r, 400)

        r = self.client.post(f'{self.base}/files/bulk-delete/',
            data={},
            content_type='application/json'
        )
        self.check('Missing paths returns 400', r, 400)

        # traversal
        r = self.client.post(f'{self.base}/files/bulk-delete/',
            data={'paths': ['../../etc/passwd', '../../settings.py']},
            content_type='application/json'
        )
        self.check('Traversal paths sanitized returns 400', r, 400)

    # ============================================================
    # BULK DOWNLOAD
    # ============================================================
    def test_09_bulk_download(self):
        print('\n=== BULK DOWNLOAD ===')

        r = self.client.post(f'{self.base}/files/bulk-download/',
            data={'paths': ['test_invoices/2024/report_final.pdf'], 'zip_name': 'test_archive'},
            content_type='application/json'
        )
        self.check('Bulk download returns 200', r, 200)

        r = self.client.post(f'{self.base}/files/bulk-download/',
            data={'paths': ['test_invoices/nonexistent.csv']},
            content_type='application/json'
        )
        self.check('No valid files returns 400', r, 400)

        r = self.client.post(f'{self.base}/files/bulk-download/',
            data={},
            content_type='application/json'
        )
        self.check('Missing paths returns 400', r, 400)

    # ============================================================
    # STORAGE STATS
    # ============================================================
    def test_10_storage_stats(self):
        print('\n=== STORAGE STATS ===')

        r = self.client.get(f'{self.base}/files/stats/')
        self.check('Storage stats returns 200', r, 200, check_keys=[
            'total_size_bytes', 'total_size_readable',
            'total_files', 'total_folders',
            'largest_file', 'by_extension'
        ])

    # ============================================================
    # FILE SHARE
    # ============================================================
    def test_11_share(self):
        print('\n=== FILE SHARE ===')

        r = self.client.post(f'{self.base}/files/share/',
            data={'file_path': 'test_invoices/2024/report_final.pdf', 'expires_in': 24, 'max_access': 5},
            content_type='application/json'
        )
        self.check('Create share link returns 201', r, 201, check_keys=['share_url', 'token'])
        token = r.json().get('token') if r.status_code == 201 else None

        if token:
            r = self.client.get(f'{self.base}/files/shared/{token}/')
            self.check('Access shared file returns 200', r, 200)

            r = self.client.patch(f'{self.base}/files/share/{token}/revoke/')
            self.check('Revoke share link returns 200', r, 200)

            r = self.client.get(f'{self.base}/files/shared/{token}/')
            self.check('Access revoked link returns 403', r, 403)

        r = self.client.post(f'{self.base}/files/share/',
            data={'file_path': 'nonexistent.csv'},
            content_type='application/json'
        )
        self.check('Share non-existent file returns 404', r, 404)

        r = self.client.post(f'{self.base}/files/share/',
            data={},
            content_type='application/json'
        )
        self.check('Missing file_path returns 400', r, 400)

    # ============================================================
    # CLEANUP
    # ============================================================
    def test_12_cleanup(self):
        print('\n=== CLEANUP ===')

        for folder in ['test_invoices', 'upload_test']:
            r = self.client.delete(f'{self.base}/files/delete/{folder}/')
            self.check(f'Cleanup {folder}', r, 204)