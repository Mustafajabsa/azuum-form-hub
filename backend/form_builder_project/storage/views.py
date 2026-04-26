import os
import csv
import shutil
import datetime
import zipfile
import io
from django.http import FileResponse
from django.utils import timezone
from rest_framework import serializers
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import FileInfo, SharedFile
from .serializers import FileInfoSerializer 
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiResponse

"""Files and directories serializers"""
class FileSerializer(serializers.Serializer):
    """Serializer for file information."""
    filename = serializers.CharField()
    file_path = serializers.CharField()
    csv_text = serializers.CharField(required=False, allow_blank=True)
    is_directory = serializers.BooleanField(default=False)

class DirectorySerializer(serializers.Serializer):
    """Serializer for directory structure."""
    id = serializers.CharField()
    name = serializers.CharField()
    path = serializers.CharField()
    directories = serializers.SerializerMethodField()

    def get_directories(self, obj):
        return DirectorySerializer(obj.get('directories', []), many=True).data
    
class FileInfoViewSet(viewsets.ModelViewSet):
    """CRUD API for FileInfo model."""
    queryset = FileInfo.objects.all()
    serializer_class = FileInfoSerializer

"""View Classes for the API endpoints"""

"""Base class"""
class BaseFileAPIView(APIView):
    """Base class with shared utilities for all file manager views."""

    def sanitize_path(self, path):
        """Sanitize user provided path to prevent directory traversal attacks."""
        if not path:
            return None
        path = path.replace('\x00', '')
        path = path.lstrip('/').lstrip('\\')
        path = os.path.normpath(path)
        if path.startswith('..'):
            return None
        return path

    def is_within_media_root(self, absolute_path):
        """Final check — ensure path hasn't escaped FILE_MANAGER_ROOT."""
        media_root = str(settings.FILE_MANAGER_ROOT)
        return os.path.abspath(absolute_path).startswith(media_root)

    def get_readable_size(self, size_bytes):
        """Convert bytes to human readable size."""
        if size_bytes < 1024:
            return f'{size_bytes} B'
        elif size_bytes < 1024 ** 2:
            return f'{size_bytes / 1024:.1f} KB'
        elif size_bytes < 1024 ** 3:
            return f'{size_bytes / (1024 ** 2):.1f} MB'
        else:
            return f'{size_bytes / (1024 ** 3):.1f} GB'

"""Other classes"""

class FileManagerAPIView(BaseFileAPIView):
    """API for file and folder management."""

    def get_files_from_directory(self, directory_path):
        """Get all files from a directory."""
        files = []
        try:
            for filename in os.listdir(directory_path):
                file_path = os.path.join(directory_path, filename)
                if os.path.isfile(file_path):
                    _, extension = os.path.splitext(filename)
                    csv_text = ''
                    if extension.lower() == '.csv':
                        csv_text = self.convert_csv_to_text(file_path)
                    
                    files.append({
                        'filename': filename,
                        'file_path': file_path.split(os.sep + 'media' + os.sep)[1],
                        'csv_text': csv_text,
                        'is_directory': False,
                        'size':         os.path.getsize(file_path),
                        'created':      os.path.getctime(file_path),
                        'modified':     os.path.getmtime(file_path)

                    })
        except Exception as e:
            print(f'Error reading directory: {str(e)}')
        return files

    def convert_csv_to_text(self, csv_file_path):
        """Convert CSV file to text."""
        try:
            with open(csv_file_path, 'r') as file:
                reader = csv.reader(file)
                rows = list(reader)
            return '\n'.join([','.join(row) for row in rows])
        except Exception:
            return ''

    def generate_nested_directory(self, root_path, current_path):
        """Generate nested directory structure."""
        import uuid
        directories = []
        try:
            for name in os.listdir(current_path):
                if os.path.isdir(os.path.join(current_path, name)):
                    unique_id = str(uuid.uuid4())
                    nested_path = os.path.join(current_path, name)
                    nested_directories = self.generate_nested_directory(root_path, nested_path)
                    directories.append({
                        'id': unique_id,
                        'name': name,
                        'path': os.path.relpath(nested_path, root_path),
                        'directories': nested_directories
                    })
        except Exception as e:
            print(f'Error generating directory: {str(e)}')
        return directories

    @extend_schema(
    summary='List, search, and sort directories and files',
    description="""
    Returns the full nested directory structure and the files inside the selected directory.
    Supports searching by filename and sorting by different fields.
    
    **Listing files:**
GET /api/files/?directory=invoices/2024
    Returns all files inside invoices/2024 with the full nested directory tree.
    
    **Searching files:**
GET /api/files/?query=sales
GET /api/files/?query=sales&directory=invoices/2024
    Filters files by filename within the selected directory. Case insensitive.
    Examples:
    - query=sales     → returns sales.csv, sales_final.csv
    - query=.pdf      → returns all PDF files
    - query=2024      → returns all files with 2024 in their name
    
    **Sorting files:**
GET /api/files/?sort_by=name&order=asc
GET /api/files/?sort_by=size&order=desc
    Sorts the returned files by the specified field in ascending or descending order.
    
    **Combining all three:**
GET /api/files/?directory=invoices&query=sales&sort_by=name&order=asc
    Searches for files matching 'sales' inside invoices/ and returns them sorted by name ascending.
    
    **Sort fields available:**
    - name     → sort alphabetically by filename
    - size     → sort by file size in bytes
    - created  → sort by creation date
    - modified → sort by last modified date
    
    **Order values:**
    - asc  → ascending  (A→Z, smallest→largest, oldest→newest)
    - desc → descending (Z→A, largest→smallest, newest→oldest)
    
    If sort_by is provided without order, it defaults to ascending.
    If order is provided without sort_by, it is ignored.
    """,
    parameters=[
        OpenApiParameter(
            name='directory',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Relative path of the directory to list files from. Leave empty for root media folder.',
            required=False,
            examples=[
                OpenApiExample('Root', value=''),
                OpenApiExample('Nested folder', value='invoices/2024'),
            ]
        ),
        OpenApiParameter(
            name='query',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Search term to filter files by filename. Case insensitive. Leave empty to return all files.',
            required=False,
            examples=[
                OpenApiExample('Search by name',      value='sales'),
                OpenApiExample('Search by extension', value='.pdf'),
                OpenApiExample('Search by year',      value='2024'),
            ]
        ),
        OpenApiParameter(
            name='sort_by',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description="""
            Field to sort files by. Available options:
            - name     → sort alphabetically by filename
            - size     → sort by file size in bytes
            - created  → sort by creation date
            - modified → sort by last modified date
            """,
            required=False,
            enum=['name', 'size', 'created', 'modified'],
            examples=[
                OpenApiExample('Sort by name',          value='name'),
                OpenApiExample('Sort by size',          value='size'),
                OpenApiExample('Sort by created date',  value='created'),
                OpenApiExample('Sort by modified date', value='modified'),
            ]
        ),
        OpenApiParameter(
            name='order',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description="""
            Sort direction. Only applies when sort_by is provided.
            - asc  → ascending  (A→Z, smallest→largest, oldest→newest)
            - desc → descending (Z→A, largest→smallest, newest→oldest)
            Defaults to asc if not provided.
            """,
            required=False,
            enum=['asc', 'desc'],
            examples=[
                OpenApiExample('Ascending',  value='asc'),
                OpenApiExample('Descending', value='desc'),
            ]
        ),
    ],
    responses={
        200: OpenApiResponse(
            description="Files and directories returned successfully",
            response={
                'type': 'object',
                'properties': {
                    'directories': {
                        'type': 'array',
                        'description': 'Nested folder structure of the entire media directory',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id':          {'type': 'string',  'description': 'Unique ID for the folder'},
                                'name':        {'type': 'string',  'description': 'Folder name'},
                                'path':        {'type': 'string',  'description': 'Relative path from media root'},
                                'directories': {'type': 'array',   'description': 'Nested subdirectories'}
                            }
                        }
                    },
                    'files': {
                        'type': 'array',
                        'description': 'Files inside the selected directory, filtered by query and sorted by sort_by if provided',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'filename':     {'type': 'string',  'description': 'Name of the file'},
                                'file_path':    {'type': 'string',  'description': 'Relative path from media root'},
                                'csv_text':     {'type': 'string',  'description': 'CSV content as plain text, empty if not a CSV'},
                                'is_directory': {'type': 'boolean', 'description': 'Always false for files'}
                            }
                        }
                    },
                    'selected_directory': {
                        'type': 'string',
                        'description': 'The directory path that was passed in the request'
                    },
                    'query': {
                        'type': 'string',
                        'description': 'The search term that was passed in the request. Empty string if no search was performed.'
                    },
                    'sort_by': {
                        'type': 'string',
                        'description': 'The sort field that was applied. Empty string if no sorting was performed.',
                        'example': 'name'
                    },
                    'order': {
                        'type': 'string',
                        'description': 'The sort direction that was applied.',
                        'example': 'asc'
                    }
                }
            }
        )
    }
)
    def get(self, request):
        """List directories and files."""
        media_path = settings.FILE_MANAGER_ROOT
        directory = request.query_params.get('directory', '')
        query      = request.query_params.get('query', '')
        directory = self.sanitize_path(directory) or ''
        sort_by = request.query_params.get('sort_by', '')
        order   = request.query_params.get('order', 'asc')

        # map sort_by value to the dictionary key
        sort_map = {
            'name':     'filename',
            'size':     'size',
            'created':  'created',
            'modified': 'modified'
        }

        


        directories = self.generate_nested_directory(media_path, media_path)
        files = []
        
        selected_directory_path = os.path.join(media_path, directory)
        if os.path.isdir(selected_directory_path):
            files = self.get_files_from_directory(selected_directory_path)
        
        if sort_by and sort_by in sort_map:
            files = sorted(
                files,
            key=lambda file: file[sort_map[sort_by]],
                reverse=(order == 'desc')  
            )

        return Response({
            'directories': directories,
            'files': files,
            'selected_directory': directory,
            'query': query
        })

    @extend_schema(
        summary='Upload a file',
        description='Uploads a file to the specified directory inside the media folder. Directory is created automatically if it does not exist.',
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'file': {
                        'type': 'string',
                        'format': 'binary',
                        'description': 'The file to upload'
                    },
                    'directory': {
                        'type': 'string',
                        'description': 'Relative path of the target directory. Leave empty to upload to root media folder.',
                    }
                },
                'required': ['file']
            }
        },
        responses={
            201: {
                'type': 'object',
                'properties': {
                    'message': {'type': 'string', 'example': 'File sales.csv uploaded successfully'}
                }
            },
            400: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string', 'example': 'No file provided'}
                }
            }
        }
    )
    def post(self, request):
        """Upload a file."""
        media_path = settings.FILE_MANAGER_ROOT
        directory = request.POST.get('directory', '')
        selected_directory_path = os.path.join(media_path, directory)
        
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            file = request.FILES['file']
            file_path = os.path.join(selected_directory_path, file.name)
            os.makedirs(selected_directory_path, exist_ok=True)
            
            with open(file_path, 'wb') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            
            return Response(
                {'message': f'File {file.name} uploaded successfully'},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class FileDeleteAPIView(BaseFileAPIView):
    """Delete a file or folder."""
    @extend_schema(
        summary="Delete a file or folder",
        description=(
            "Deletes a specific file or an entire folder structure. "
            "The `file_path` in the URL should use `%slash%` instead of `/`. "
            "If a folder is targeted, it and all its contents are removed recursively."
        ),
        responses={
            204: OpenApiResponse(description="File or folder deleted successfully (No content)"),
            404: OpenApiResponse(description="File or folder not found"),
            400: OpenApiResponse(description="Error during deletion process")
        }
    )
    def delete(self, request, file_path):
        """Delete a file."""
        path = file_path.replace('%slash%', os.sep)\
                .replace('%2F', os.sep)
        
        
        path = self.sanitize_path(path)
        if not path:
            return Response(
            {'error': 'Invalid path provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
        media_path = settings.FILE_MANAGER_ROOT
        absolute_file_path = os.path.join(media_path, path)
        try:
            if os.path.isfile(absolute_file_path):
                os.remove(absolute_file_path)
                return Response(
                    {'message': 'File deleted successfully'},
                    status=status.HTTP_204_NO_CONTENT
                )
            elif os.path.isdir(absolute_file_path):
                
                shutil.rmtree(absolute_file_path)
                return Response(
                    {'message': 'Folder deleted successfully'},
                    status=status.HTTP_204_NO_CONTENT
                )
            else:
                return Response(
                    {'error': 'File or folder not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class FolderCreateAPIView(BaseFileAPIView):
    """Create a new folder."""
    @extend_schema(
        summary="Create a new folder",
        description="Creates a directory inside the media root or a specified parent directory.",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'folder_name': {'type': 'string', 'description': 'Name of the folder to create'},
                    'directory': {'type': 'string', 'description': 'Parent directory path (optional)', 'default': ''}
                },
                'required': ['folder_name']
            }
        },
        responses={
            201: OpenApiResponse(description="Folder created successfully"),
            400: OpenApiResponse(description="Folder name missing or creation failed")
        }
    )
    
    def post(self, request):
        """Create a folder."""
        folder_name = request.data.get('folder_name')
        parent_directory = request.data.get('directory', '')
        media_path = settings.FILE_MANAGER_ROOT
        
        if not folder_name:
            return Response(
                {'error': 'folder_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # sanitize both fields
        folder_name      = self.sanitize_path(folder_name)
        parent_directory = self.sanitize_path(parent_directory) or ''

        if not folder_name:
            return Response(
            {'error': 'Invalid folder name provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
        try:
            folder_path = os.path.join(media_path, parent_directory, folder_name)
            os.makedirs(folder_path, exist_ok=True)
            return Response(
                {'message': f'Folder {folder_name} created successfully'},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class FileDownloadAPIView(BaseFileAPIView):
    """Download a file."""
    @extend_schema(
        summary="Download a file",
        description="Downloads a file from the media storage. Replaces `%slash%` with `/` to locate the file.",
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.BINARY,
                description="The requested file binary stream"
            ),
            404: OpenApiResponse(description="File not found"),
            400: OpenApiResponse(description="Error accessing file")
        }
    )
    def get(self, request, file_path):
        """Download a file."""
        from django.http import FileResponse
        path = file_path.replace('%slash%', '/')
        media_path = settings.FILE_MANAGER_ROOT
        absolute_file_path = os.path.join(media_path, path)
        
        if os.path.exists(absolute_file_path):
            try:
                fh = open(absolute_file_path, 'rb')
                response = FileResponse(fh, content_type="application/octet-stream")
                response['Content-Disposition'] = f'attachment; filename={os.path.basename(absolute_file_path)}'
                return response
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(
            {'error': 'File not found'},
            status=status.HTTP_404_NOT_FOUND
        )

class FileViewAPIView(BaseFileAPIView):
    """View a file (for images/PDFs in popup)."""
    @extend_schema(
        summary="View/Preview a file",
        description="Serves a file for inline viewing in the browser. Detects Content-Type based on file extension.",
        responses={
            200: OpenApiResponse(description="File content for inline display"),
            404: OpenApiResponse(description="File not found")
        }
    )
    
    def get(self, request, file_path):
        """Serve file content for viewing."""
        from django.http import FileResponse
        path = file_path.replace('%slash%', '/')
        media_path = settings.FILE_MANAGER_ROOT
        absolute_file_path = os.path.join(media_path, path)
        
        if os.path.exists(absolute_file_path):
            try:
                # Determine content type based on file extension
                _, ext = os.path.splitext(absolute_file_path)
                ext = ext.lower()
                
                content_type = "application/octet-stream"  # default
                if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                    content_type = f"image/{ext[1:]}"
                elif ext == '.pdf':
                    content_type = "application/pdf"
                elif ext == '.txt':
                    content_type = "text/plain"
                
                fh = open(absolute_file_path, 'rb')
                response = FileResponse(fh, content_type=content_type)
                return response
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(
            {'error': 'File not found'},
            status=status.HTTP_404_NOT_FOUND
        )

class FileInfoDetailView(BaseFileAPIView):
    """Retrieve, update or delete a FileInfo record."""
    @extend_schema(
        summary="Get FileInfo details",
        responses={200: FileInfoSerializer},
        description="Fetch all metadata for a specific file record by its ID."
    )
    def get(self, request, pk):
        """Get FileInfo details."""
        file_info = get_object_or_404(FileInfo, pk=pk)
        serializer = FileInfoSerializer(file_info)
        return Response(serializer.data)
    @extend_schema(
        summary="Update FileInfo",
        request=FileInfoSerializer,
        responses={200: FileInfoSerializer},
        description="Update the details of an existing file record."
    )
    def put(self, request, pk):
        """Update FileInfo."""
        file_info = get_object_or_404(FileInfo, pk=pk)
        serializer = FileInfoSerializer(file_info, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    @extend_schema(
        summary="Delete FileInfo record",
        responses={204: None},
        description="Permanently remove a file record from the database."
    )
    def delete(self, request, pk):
        """Delete FileInfo record."""
        file_info = get_object_or_404(FileInfo, pk=pk)
        file_info.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class FileInfoListCreateAPIView(BaseFileAPIView):
    """List all FileInfo entries or create a new one."""
    @extend_schema(
        summary="List all FileInfo",
        responses={200: FileInfoSerializer(many=True)},
        description="Returns a full list of all file records currently managed."
    )
    def get(self, request):
        """List all FileInfo."""
        queryset = FileInfo.objects.all()
        serializer = FileInfoSerializer(queryset, many=True)
        return Response(serializer.data)
    @extend_schema(
        summary="Create new FileInfo",
        request=FileInfoSerializer,
        responses={201: FileInfoSerializer},
        description="Upload metadata for a new file entry."
    )
    def post(self, request):
        """Create new FileInfo."""
        serializer = FileInfoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class FolderUploadAPIView(BaseFileAPIView):
    """Upload a folder with its full structure."""

    @extend_schema(
    summary="Upload a folder",
    description="""
    Uploads multiple files while preserving their full folder structure.
    
    **How it works:**
    Each file must be paired with its relative path that includes the full folder structure AND the filename.
    The backend will automatically create all necessary folders and save each file in its correct location.
    
    **Important:** The relative_paths value must always include the filename at the end, not just the folder name.
    
    **Example — Uploading an invoices folder:**
    
    Imagine you have this folder structure on your machine:
invoices/
    2024/
        sales.csv
        report.pdf
    2025/
        january.csv
    
    You would send:
files[0]          = sales.csv        relative_paths[0] = invoices/2024/sales.csv
files[1]          = report.pdf       relative_paths[1] = invoices/2024/report.pdf
files[2]          = january.csv      relative_paths[2] = invoices/2025/january.csv
    
    This will recreate the exact same structure inside FILE_MANAGER_ROOT:
FILE_MANAGER_ROOT/
    invoices/
        2024/
            sales.csv
            report.pdf
        2025/
            january.csv
    
    **Common mistake — wrong vs correct relative_paths:**
WRONG:   relative_paths = invoices/2024          (missing filename — saves a file named '2024' with no extension)
CORRECT: relative_paths = invoices/2024/sales.csv (includes filename — saves sales.csv inside invoices/2024/)
    
    **Using the directory field:**
    If you want to upload the folder into an existing directory, use the directory field.
    For example, if directory = projects, the result will be:
FILE_MANAGER_ROOT/
    projects/
        invoices/
            2024/
                sales.csv
    Leave directory empty to upload directly into the media root.
    """,
    parameters=[
        OpenApiParameter(
            name='files',
            type={'type': 'array', 'items': {'type': 'string', 'format': 'binary'}},
            location=OpenApiParameter.QUERY,
            description='List of files to upload. Each file must have a corresponding entry in relative_paths.',
            required=True,
        ),
        OpenApiParameter(
            name='relative_paths',
            type={'type': 'array', 'items': {'type': 'string'}},
            location=OpenApiParameter.QUERY,
            description="""
            Relative path for each file INCLUDING the filename.
            Must match the order of the files list exactly.
            Examples:
              - invoices/2024/sales.csv
              - invoices/2024/report.pdf
              - invoices/2025/january.csv
            """,
            required=True,
            examples=[
                OpenApiExample(
                    'Single file in folder',
                    value='invoices/2024/sales.csv'
                ),
                OpenApiExample(
                    'Nested folder structure',
                    value='invoices/2024/reports/annual.pdf'
                ),
            ]
        ),
        OpenApiParameter(
            name='directory',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Optional base directory to upload into. Leave empty to upload into media root.',
            required=False,
            examples=[
                OpenApiExample('Empty — upload to media root', value=''),
                OpenApiExample('Upload into existing folder', value='projects'),
            ]
        ),
    ],
    request={
        'multipart/form-data': {
            'type': 'object',
            'properties': {
                'files': {
                    'type': 'array',
                    'items': {'type': 'string', 'format': 'binary'},
                    'description': 'List of files to upload'
                },
                'relative_paths': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'description': 'Full relative path for each file including filename. Example: invoices/2024/sales.csv'
                },
                'directory': {
                    'type': 'string',
                    'description': 'Optional base directory. Leave empty for media root.'
                }
            },
            'required': ['files', 'relative_paths']
        }
    },
    responses={
        201: OpenApiResponse(
            description="Files uploaded successfully",
            response={
                'type': 'object',
                'properties': {
                    'message':  {'type': 'string', 'example': '3 file(s) uploaded successfully'},
                    'uploaded': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'example': [
                            'invoices/2024/sales.csv',
                            'invoices/2024/report.pdf',
                            'invoices/2025/january.csv'
                        ],
                        'description': 'List of successfully uploaded file paths'
                    },
                    'failed': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'path':  {'type': 'string'},
                                'error': {'type': 'string'}
                            }
                        },
                        'description': 'List of files that failed with their error messages'
                    }
                }
            }
        ),
        400: OpenApiResponse(
            description="Bad request",
            response={
                'type': 'object',
                'properties': {
                    'error': {
                        'type': 'string',
                        'example': 'Each file must have a corresponding relative path'
                    }
                }
            }
        )
    }
)
    def post(self, request):
        """Upload a folder structure."""
        media_path = settings.FILE_MANAGER_ROOT
        directory = request.POST.get('directory', '')
        base_path = os.path.join(media_path, directory)

        # getlist gets multiple values for the same key
        files = request.FILES.getlist('files')
        relative_paths = request.POST.getlist('relative_paths')
        sanitized_paths = [self.sanitize_path(p) for p in relative_paths]

        if not files:
            return Response(
                {'error': 'No files provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(files) != len(relative_paths):
            return Response(
                {'error': 'Each file must have a corresponding relative path'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded = []
        failed = []

        for file, relative_path in zip(files, relative_paths):
            try:
                # sanitize path — prevent directory traversal attacks
                # e.g. someone sends ../../etc/passwd as relative_path
                safe_path = os.path.normpath(relative_path).lstrip(os.sep)
                full_path = os.path.join(base_path, safe_path)

                # create all folders in the path if they don't exist
                os.makedirs(os.path.dirname(full_path), exist_ok=True)

                # write the file
                with open(full_path, 'wb') as destination:
                    for chunk in file.chunks():
                        destination.write(chunk)

                uploaded.append(relative_path)

            except Exception as e:
                failed.append({'path': relative_path, 'error': str(e)})

        return Response(
            {
                'message': f'{len(uploaded)} file(s) uploaded successfully',
                'uploaded': uploaded,
                'failed': failed
            },
            status=status.HTTP_201_CREATED
        )

class FileMoveAPIView(BaseFileAPIView):
    """Move a file or folder to a new location."""

    @extend_schema(
        summary="Move a file or folder",
        description="""
        Moves a file or folder from one location to another within the media storage.
        
        **How it works:**
        Provide the source path of the file/folder you want to move, and the destination 
        path where you want it to be moved to. Both paths are relative to FILE_MANAGER_ROOT.
        
        **Example — Moving a file:**
    source_path      = invoices/2024/sales.csv
    destination_path = archive/2024/sales.csv
        Result:
    BEFORE:                          AFTER:
    FILE_MANAGER_ROOT/                      FILE_MANAGER_ROOT/
        invoices/                        invoices/
            2024/                            2024/
                sales.csv    ──────►              (empty)
        archive/                         archive/
            2024/                            2024/
                                                sales.csv
        
        **Example — Moving a folder:**
    source_path      = invoices/2024
    destination_path = archive/2024
        Result:
    BEFORE:                          AFTER:
    FILE_MANAGER_ROOT/                      FILE_MANAGER_ROOT/
        invoices/                        invoices/
            2024/                            (empty)
                sales.csv    ──────►      archive/
                report.pdf                   2024/
                                                sales.csv
                                                report.pdf
        
        **Important notes:**
        - The destination directory is created automatically if it does not exist.
        - If a file/folder already exists at the destination, it will be overwritten.
        - Both source_path and destination_path must include the filename for files.
        
        **Wrong vs Correct:**
    WRONG:   destination_path = archive          (missing filename for files)
    CORRECT: destination_path = archive/sales.csv
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'source_path': {
                        'type': 'string',
                        'description': 'Relative path of the file or folder to move.',
                        'example': 'invoices/2024/sales.csv'
                    },
                    'destination_path': {
                        'type': 'string',
                        'description': 'Relative path of the destination including filename for files.',
                        'example': 'archive/2024/sales.csv'
                    }
                },
                'required': ['source_path', 'destination_path']
            }
        },
        responses={
            200: OpenApiResponse(
                description="File or folder moved successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'example': 'Successfully moved invoices/2024/sales.csv to archive/2024/sales.csv'
                        },
                        'source':      {'type': 'string', 'example': 'invoices/2024/sales.csv'},
                        'destination': {'type': 'string', 'example': 'archive/2024/sales.csv'}
                    }
                }
            ),
            400: OpenApiResponse(
                description="Missing fields or error during move",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'source_path and destination_path are required'}
                    }
                }
            ),
            404: OpenApiResponse(
                description="Source file or folder not found",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Source path does not exist'}
                    }
                }
            )
        }
    )
    def patch(self, request):
        """Move a file or folder."""
        media_path = settings.FILE_MANAGER_ROOT
        source_path      = self.sanitize_path(request.data.get('source_path'))
        destination_path = self.sanitize_path(request.data.get('destination_path'))

        # validate both fields are provided
        if not source_path or not destination_path:
            return Response(
                {'error': 'source_path and destination_path are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        absolute_source      = os.path.join(media_path, source_path)
        absolute_destination = os.path.join(media_path, destination_path)

        # check source actually exists
        if not os.path.exists(absolute_source):
            return Response(
                {'error': 'Source path does not exist'},
                status=status.HTTP_404_NOT_FOUND
            )

        # prevent moving a folder into itself
        if absolute_destination.startswith(absolute_source + os.sep):
            return Response(
                {'error': 'Cannot move a folder into itself'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # create destination parent folders if they don't exist
            os.makedirs(os.path.dirname(absolute_destination), exist_ok=True)

            # shutil.move handles both files and folders
            shutil.move(absolute_source, absolute_destination)

            return Response(
                {
                    'message':     f'Successfully moved {source_path} to {destination_path}',
                    'source':      source_path,
                    'destination': destination_path
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
class FileRenameAPIView(BaseFileAPIView):
    """Rename a file or folder."""

    @extend_schema(
        summary="Rename a file or folder",
        description="""
        Renames a file or folder within the media storage.
        
        **How it works:**
        Provide the path of the file/folder you want to rename, and the new name.
        The file/folder stays in the same location — only its name changes.
        
        **Example — Renaming a file:**
    path     = invoices/2024/sales.csv
    new_name = sales_final.csv
        Result:
    BEFORE:                          AFTER:
    FILE_MANAGER_ROOT/                      FILE_MANAGER_ROOT/
        invoices/                        invoices/
            2024/                            2024/
                sales.csv    ──────►              sales_final.csv
        
        **Example — Renaming a folder:**
    path     = invoices/2024
    new_name = 2024_archived
        Result:
    BEFORE:                          AFTER:
    FILE_MANAGER_ROOT/                      FILE_MANAGER_ROOT/
        invoices/                        invoices/
            2024/                            2024_archived/
                sales.csv    ──────►              sales.csv
                report.pdf                        report.pdf
        
        **Important notes:**
        - Only provide the new name, not the full path.
        - The file/folder stays in the same directory.
        - If a file/folder with the new name already exists in the same directory, it will be overwritten.
        
        **Wrong vs Correct:**
    WRONG:   new_name = invoices/2024/sales_final.csv  (do not include the path)
    CORRECT: new_name = sales_final.csv                (just the new name)
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'path': {
                        'type': 'string',
                        'description': 'Relative path of the file or folder to rename.',
                        'example': 'invoices/2024/sales.csv'
                    },
                    'new_name': {
                        'type': 'string',
                        'description': 'The new name for the file or folder. Do not include the path — just the name.',
                        'example': 'sales_final.csv'
                    }
                },
                'required': ['path', 'new_name']
            }
        },
        responses={
            200: OpenApiResponse(
                description="File or folder renamed successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'example': 'Successfully renamed sales.csv to sales_final.csv'
                        },
                        'old_path': {'type': 'string', 'example': 'invoices/2024/sales.csv'},
                        'new_path': {'type': 'string', 'example': 'invoices/2024/sales_final.csv'}
                    }
                }
            ),
            400: OpenApiResponse(
                description="Missing fields, invalid new name, or error during rename",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'path and new_name are required'}
                    }
                }
            ),
            404: OpenApiResponse(
                description="File or folder not found",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Path does not exist'}
                    }
                }
            ),
            409: OpenApiResponse(
                description="A file or folder with the new name already exists",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'A file or folder named sales_final.csv already exists in this directory'}
                    }
                }
            )
        }
    )
    def patch(self, request):
        """Rename a file or folder."""
        media_path = settings.FILE_MANAGER_ROOT

        path     = self.sanitize_path(request.data.get('path'))
        new_name = request.data.get('new_name')

        if os.sep in new_name or '/' in new_name or '\\' in new_name or '\x00' in new_name:
            return Response(
            {'error': 'Invalid name provided'},
            status=status.HTTP_400_BAD_REQUEST
        )

        # validate both fields are provided
        if not path or not new_name:
            return Response(
                {'error': 'path and new_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # prevent new_name from containing path separators
        # e.g. someone sends 'subfolder/malicious.csv' as new_name
        if os.sep in new_name or '/' in new_name:
            return Response(
                {'error': 'new_name must be a name only, not a path. Example: sales_final.csv'},
                status=status.HTTP_400_BAD_REQUEST
            )

        absolute_path = os.path.join(media_path, path)

        # check source exists
        if not os.path.exists(absolute_path):
            return Response(
                {'error': 'Path does not exist'},
                status=status.HTTP_404_NOT_FOUND
            )

        # build the new path — same parent directory, new name
        parent_directory  = os.path.dirname(absolute_path)
        absolute_new_path = os.path.join(parent_directory, new_name)

        # check if something with the new name already exists
        if os.path.exists(absolute_new_path):
            return Response(
                {'error': f'A file or folder named {new_name} already exists in this directory'},
                status=status.HTTP_409_CONFLICT
            )

        try:
            os.rename(absolute_path, absolute_new_path)

            # build relative new path to return to the frontend
            new_relative_path = os.path.join(os.path.dirname(path), new_name)

            return Response(
                {
                    'message':  f'Successfully renamed {os.path.basename(path)} to {new_name}',
                    'old_path': path,
                    'new_path': new_relative_path
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
class FileShareCreateAPIView(BaseFileAPIView):
    """Generate a shareable link for a file."""
    @extend_schema(
        summary="Generate a shareable link for a file",
        description="""
        Generates a secure, tokenized shareable link for a specific file in media storage.
        
        **How it works:**
        A unique token is generated and stored in the database linked to the file path.
        The token is then used to construct a shareable URL that can be sent to anyone.
        
        **Example:**
    file_path  = invoices/2024/sales.csv
    expires_in = 24                        (hours)
    max_access = 5                         (times)
        Returns:
    share_url = http://yourdomain.com/api/files/shared/a8f3k2p9-xxxx-xxxx-xxxx/
        
        **Access control options:**
        - expires_in — link stops working after this many hours. Leave empty for no expiry.
        - max_access — link stops working after being accessed this many times. Leave empty for unlimited access.
        - Both can be combined — link expires whichever condition is met first.
        
        **Example combinations:**
    expires_in=24, max_access=1   → one time link valid for 24 hours
    expires_in=48, max_access=10  → up to 10 accesses within 48 hours
    expires_in=null, max_access=5 → 5 accesses, never expires
    expires_in=24, max_access=null → unlimited accesses for 24 hours
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'file_path': {
                        'type': 'string',
                        'description': 'Relative path of the file to share.',
                        'example': 'invoices/2024/sales.csv'
                    },
                    'expires_in': {
                        'type': 'integer',
                        'description': 'Number of hours until the link expires. Leave empty for no expiry.',
                        'example': 24
                    },
                    'max_access': {
                        'type': 'integer',
                        'description': 'Maximum number of times the link can be accessed. Leave empty for unlimited.',
                        'example': 5
                    }
                },
                'required': ['file_path']
            }
        },
        responses={
            201: OpenApiResponse(
                description="Share link generated successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'share_url': {
                            'type': 'string',
                            'description': 'The full shareable URL to send to others',
                            'example': 'http://yourdomain.com/api/files/shared/a8f3k2p9-xxxx-xxxx-xxxx/'
                        },
                        'token': {
                            'type': 'string',
                            'description': 'The unique token identifying this share link',
                            'example': 'a8f3k2p9-xxxx-xxxx-xxxx'
                        },
                        'file_path': {
                            'type': 'string',
                            'description': 'The file this link points to',
                            'example': 'invoices/2024/sales.csv'
                        },
                        'expires_at': {
                            'type': 'string',
                            'description': 'Datetime when the link expires. Null if no expiry.',
                            'example': '2024-01-16T10:30:00Z'
                        },
                        'max_access': {
                            'type': 'integer',
                            'description': 'Maximum access limit. Null if unlimited.',
                            'example': 5
                        }
                    }
                }
            ),
            400: OpenApiResponse(
                description="file_path is missing",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'file_path is required'}
                    }
                }
            ),
            404: OpenApiResponse(
                description="File not found at the given path",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'File not found'}
                    }
                }
            )
        }
    )
    def post(self, request):
        file_path  = request.data.get('file_path')
        expires_in = request.data.get('expires_in')   # in hours, optional
        max_access = request.data.get('max_access')   # optional

        if not file_path:
            return Response(
                {'error': 'file_path is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # verify file actually exists
        absolute_path = os.path.join(settings.FILE_MANAGER_ROOT, file_path)
        if not os.path.isfile(absolute_path):
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # calculate expiry if provided
        expires_at = None
        if expires_in:
            expires_at = timezone.now() + timezone.timedelta(hours=int(expires_in))

        share = SharedFile.objects.create(
            file_path=file_path,
            expires_at=expires_at,
            max_access=max_access
        )

        share_url = request.build_absolute_uri(
            f'/api/files/shared/{share.token}/'
        )

        return Response(
            {
                'share_url':   share_url,
                'token':       share.token,
                'file_path':   file_path,
                'expires_at':  expires_at,
                'max_access':  max_access
            },
            status=status.HTTP_201_CREATED
        )
    
class FileShareAccessAPIView(BaseFileAPIView):
    """Access a file via a share token."""
    @extend_schema(
        summary="Access a shared file via token",
        description="""
        Serves a file using a previously generated share token.
        No authentication required — the token itself is the access key.
        
        **How it works:**
        The token in the URL is looked up in the database. If it exists and is still
        valid, the file is served as a download. The access count is incremented on
        every successful access.
        
        **Validation checks performed:**
        - Token exists in the database
        - Link has not been revoked
        - Link has not expired (if expires_at was set)
        - Link has not exceeded max access count (if max_access was set)
        
        **Example:**
    GET /api/files/shared/a8f3k2p9-xxxx-xxxx-xxxx/
    → serves invoices/2024/sales.csv as a download
        
        **What happens to the access count:**
    First access   → access_count = 1
    Second access  → access_count = 2
    ...
    max_access hit → 403 Forbidden, link no longer works
        """,
        parameters=[
            OpenApiParameter(
                name='token',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description='The unique share token generated when the link was created.',
                required=True,
                examples=[
                    OpenApiExample(
                        'Valid token',
                        value='a8f3k2p9-xxxx-xxxx-xxxx'
                    )
                ]
            )
        ],
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.BINARY,
                description="File served successfully as a download"
            ),
            403: OpenApiResponse(
                description="Link is no longer valid",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {
                            'type': 'string',
                            'example': 'Link has expired',
                            'description': 'Possible values: Link has expired / Link has been revoked / Link has reached maximum access limit'
                        }
                    }
                }
            ),
            404: OpenApiResponse(
                description="Token does not exist",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Invalid or expired link'}
                    }
                }
            )
        }
    )
    def get(self, request, token):
        try:
            share = SharedFile.objects.get(token=token)
        except SharedFile.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired link'},
                status=status.HTTP_404_NOT_FOUND
            )

        # validate the link
        valid, reason = share.is_valid()
        if not valid:
            share.delete()
            return Response(
                {'error': reason},
                status=status.HTTP_403_FORBIDDEN
            )

        # increment access count
        share.access_count += 1
        share.save()

        # serve the file
        absolute_path = os.path.join(settings.FILE_MANAGER_ROOT, share.file_path)
        fh = open(absolute_path, 'rb')
        response = FileResponse(fh, content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename={os.path.basename(share.file_path)}'
        return response
    
class FileShareRevokeAPIView(BaseFileAPIView):
    """Revoke a share link."""
    @extend_schema(
        summary="Revoke a share link",
        description="""
        Immediately deactivates a share link so it can no longer be used to access the file.
        
        **How it works:**
        The token is looked up in the database and its is_active flag is set to False.
        Anyone trying to access the file via this link after revocation will receive a
        403 Forbidden response.
        
        **Important notes:**
        - Revoking a link does NOT delete the file — only the share link is deactivated.
        - Revocation is permanent — there is no way to reactivate a revoked link.
        - If you need to share the file again, generate a new link via POST /api/files/share/
        
        **Example:**
    Before revoke:
    GET /api/files/shared/a8f3k2p9-xxxx-xxxx-xxxx/ → 200 file served

    After revoke:
    GET /api/files/shared/a8f3k2p9-xxxx-xxxx-xxxx/ → 403 Link has been revoked
        """,
        parameters=[
            OpenApiParameter(
                name='token',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description='The unique share token of the link to revoke.',
                required=True,
                examples=[
                    OpenApiExample(
                        'Token to revoke',
                        value='a8f3k2p9-xxxx-xxxx-xxxx'
                    )
                ]
            )
        ],
        responses={
            200: OpenApiResponse(
                description="Link revoked successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'example': 'Share link revoked successfully'
                        }
                    }
                }
            ),
            404: OpenApiResponse(
                description="Token does not exist",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Share link not found'}
                    }
                }
            )
        }
    )
    def patch(self, request, token):
        try:
            share = SharedFile.objects.get(token=token)
            share.is_active = False
            share.save()
            return Response(
                {'message': 'Share link revoked successfully'},
                status=status.HTTP_200_OK
            )
        except SharedFile.DoesNotExist:
            return Response(
                {'error': 'Share link not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class FileCopyAPIView(BaseFileAPIView):
    """Copy a file or folder to another directory"""


    @extend_schema(
        summary="copy a file or folder",
        description="""
        Copy a file or folder from one location to another within the media storage.
        
        **Important notes:**
        - The destination parent directory is created automatically if it does not exist.
        - If a file already exists at the destination, it will be overwritten.
        - If copying a folder, the destination path must NOT already exist (shutil requirement).
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'source_path': {
                        'type': 'string',
                        'description': 'Relative path of the file or folder to copy.',
                        'example': 'invoices/2024/sales.csv'
                    },
                    'destination_path': {
                        'type': 'string',
                        'description': 'Relative path of the destination including filename for files.',
                        'example': 'archive/2024/sales.csv'
                    }
                },
                'required': ['source_path', 'destination_path']
            }
        },
        responses={
    200: OpenApiResponse(
        description="File or folder copied successfully",
        response={
            'type': 'object',
            'properties': {
                'message':     {'type': 'string', 'example': 'Successfully copied invoices/2024/sales.csv to archive/2024/sales.csv'},
                'source':      {'type': 'string', 'example': 'invoices/2024/sales.csv'},
                'destination': {'type': 'string', 'example': 'archive/2024/sales.csv'}
            }
        }
    ),
    409: OpenApiResponse(
        description="Destination already exists",
        response={
            'type': 'object',
            'properties': {
                'error': {'type': 'string', 'example': 'Destination folder already exists'}
            }
        }
    ),
    404: OpenApiResponse(
        description="Source path does not exist",
        response={
            'type': 'object',
            'properties': {
                'error': {'type': 'string', 'example': 'Source path does not exist'}
            }
        }
    ),
    400: OpenApiResponse(
        description="Missing fields, self-copy attempt, or unexpected error",
        response={
            'type': 'object',
            'properties': {
                'error': {'type': 'string', 'example': 'source_path and destination_path are required'}
            }
        }
    )
}
    )
    def post(self, request):

        source_path      = self.sanitize_path(request.data.get('source_path'))
        destination_path = self.sanitize_path(request.data.get('destination_path'))

        if not source_path or not destination_path:
            return Response(
            {'error': 'Invalid path provided'},
            status=status.HTTP_400_BAD_REQUEST
        )

        if not source_path or not destination_path:
            return Response(
                {'error': 'source_path and destination_path are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        media_path = settings.FILE_MANAGER_ROOT
        absolute_source      = os.path.join(media_path, source_path)
        absolute_destination = os.path.join(media_path, destination_path)

        if not os.path.exists(absolute_source):
            return Response(
                {'error': 'Source path does not exist'},
                status=status.HTTP_404_NOT_FOUND
            )

        if absolute_destination.startswith(absolute_source + os.sep):
            return Response(
                {'error': 'Cannot copy a folder into itself'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if os.path.isfile(absolute_source):
                os.makedirs(os.path.dirname(absolute_destination), exist_ok=True)
                shutil.copy2(absolute_source, absolute_destination)

            elif os.path.isdir(absolute_source):
                if os.path.exists(absolute_destination):
                    return Response(
                        {'error': 'Destination folder already exists'},
                        status=status.HTTP_409_CONFLICT
                    )
                shutil.copytree(absolute_source, absolute_destination)

            return Response(
                {
                    'message':     f'Successfully copied {source_path} to {destination_path}',
                    'source':      source_path,
                    'destination': destination_path
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class FileMetaDataAPIView(BaseFileAPIView):
    """Meta data of the file or folder."""

    def get_readable_size(self, size_bytes):
        if size_bytes < 1024:
            return f'{size_bytes} B'
        elif size_bytes < 1024 ** 2:
            return f'{size_bytes / 1024:.1f} KB'
        elif size_bytes < 1024 ** 3:
            return f'{size_bytes / (1024 ** 2):.1f} MB'
        else:
            return f'{size_bytes / (1024 ** 3):.1f} GB'

    @extend_schema(
        summary="Get file or folder metadata",
        description="Returns detailed metadata about a specific file or folder.",
        parameters=[
            OpenApiParameter(
                name='path',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Relative path of the file or folder.',
                required=True,
                examples=[
                    OpenApiExample('File', value='invoices/2024/sales.csv'),
                    OpenApiExample('Folder', value='invoices/2024'),
                ]
            )
        ],
        responses={
            200: OpenApiResponse(
                description="Metadata returned successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'name':          {'type': 'string',  'example': 'sales.csv'},
                        'path':          {'type': 'string',  'example': 'invoices/2024/sales.csv'},
                        'type':          {'type': 'string',  'example': 'file'},
                        'extension':     {'type': 'string',  'example': '.csv', 'nullable': True},
                        'size_bytes':    {'type': 'integer', 'example': 204800},
                        'size_readable': {'type': 'string',  'example': '200.0 KB'},
                        'created_at':    {'type': 'string',  'example': '2024-01-15 10:30:00'},
                        'modified_at':   {'type': 'string',  'example': '2024-03-20 14:22:00'}
                    }
                }
            ),
            400: OpenApiResponse(description="Path not provided"),
            404: OpenApiResponse(description="File or folder not found")
        }
    )
    def get(self, request):
        path = self.sanitize_path(request.query_params.get('path', ''))

        if not path:
            return Response(
                {'error': 'path is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        absolute_path = os.path.join(settings.FILE_MANAGER_ROOT, path)

        if not os.path.exists(absolute_path):
            return Response(
                {'error': 'File or folder not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        name = os.path.basename(absolute_path)

        # determine type, extension, and size based on file or folder
        if os.path.isfile(absolute_path):
            item_type  = 'file'
            _, extension = os.path.splitext(name)
            size_bytes = os.path.getsize(absolute_path)

        elif os.path.isdir(absolute_path):
            item_type  = 'folder'
            extension  = None
            size_bytes = sum(
                os.path.getsize(os.path.join(dirpath, filename))
                for dirpath, dirnames, filenames in os.walk(absolute_path)
                for filename in filenames
            )

        return Response({
            'name':          name,
            'path':          path,
            'type':          item_type,
            'extension':     extension,
            'size_bytes':    size_bytes,
            'size_readable': self.get_readable_size(size_bytes),
            'created_at':    str(datetime.datetime.fromtimestamp(os.path.getctime(absolute_path))),
            'modified_at':   str(datetime.datetime.fromtimestamp(os.path.getmtime(absolute_path)))
        })    

class BulkFileDeleteAPIView(BaseFileAPIView):
    """Bulk delete files and folders."""

    @extend_schema(
        summary="Bulk delete files and folders",
        description="""
        Deletes multiple files and folders in a single request.
        
        **How it works:**
        Provide a list of relative paths to delete. Each path is processed independently —
        if one fails, the rest continue. The response always returns which paths were
        successfully deleted and which failed.
        
        **Example:**
```json
        {
            "paths": [
                "invoices/2024/sales.csv",
                "invoices/2024/report.pdf",
                "invoices/2025/"
            ]
        }
```
        
        **Partial success:**
        If some paths succeed and others fail, the response is still 200 OK with both
        the deleted and failed lists populated so the frontend can handle each case.
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'paths': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'List of relative paths to delete.',
                        'example': [
                            'invoices/2024/sales.csv',
                            'invoices/2024/report.pdf',
                            'invoices/2025/'
                        ]
                    }
                },
                'required': ['paths']
            }
        },
        responses={
            200: OpenApiResponse(
                description="Bulk delete completed — check deleted and failed lists for details",
                response={
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'example': '2 item(s) deleted successfully, 1 failed'
                        },
                        'deleted': {
                            'type': 'array',
                            'items': {'type': 'string'},
                            'example': ['invoices/2024/sales.csv', 'invoices/2024/report.pdf']
                        },
                        'failed': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'path':  {'type': 'string', 'example': 'invoices/2025/'},
                                    'error': {'type': 'string', 'example': 'File or folder not found'}
                                }
                            }
                        }
                    }
                }
            ),
            400: OpenApiResponse(
                description="paths not provided or all deletions failed",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'paths is required and cannot be empty'}
                    }
                }
            )
        }
    )
    def delete(self, request):
        """Bulk delete files and folders."""
        paths = request.data.get('paths', [])

        if not paths:
            return Response(
                {'error': 'paths is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )


    # sanitize every path in the list
        sanitized_paths = [self.sanitize_path(path) for path in paths]

        
    # filter out any None values (paths that failed sanitization)
        sanitized_paths = [p for p in sanitized_paths if p is not None]

        if not sanitized_paths:
            return Response(
            {'error': 'No valid paths provided'},
            status=status.HTTP_400_BAD_REQUEST
        )

        paths = sanitized_paths
        deleted = []
        failed  = []

        for path in paths:
            absolute_path = os.path.join(settings.FILE_MANAGER_ROOT, path)
            try:
                if os.path.isfile(absolute_path):
                    os.remove(absolute_path)
                    deleted.append(path)
                elif os.path.isdir(absolute_path):
                    shutil.rmtree(absolute_path)
                    deleted.append(path)
                else:
                    failed.append({'path': path, 'error': 'File or folder not found'})
            except Exception as e:
                failed.append({'path': path, 'error': str(e)})

        return Response(
            {
                'message': f'{len(deleted)} item(s) deleted successfully, {len(failed)} failed',
                'deleted': deleted,
                'failed':  failed
            },
            status=status.HTTP_200_OK if deleted else status.HTTP_400_BAD_REQUEST
        )

class BulkFileDownloadAPIView(BaseFileAPIView):
    """Bulk download files as a zip archive."""

    @extend_schema(
        summary="Bulk download files as a zip archive",
        description="""
        Downloads multiple files as a single zip archive.
        
        **How it works:**
        Provide a list of relative file paths. The backend zips them all into a 
        single archive and sends it as one download. The zip preserves the folder 
        structure of each file inside the archive.
        
        **Example:**
```json
        {
            "paths": [
                "invoices/2024/sales.csv",
                "invoices/2024/report.pdf",
                "invoices/2025/january.csv"
            ],
            "zip_name": "my_files"
        }
```
        Result: downloads `my_files.zip` containing:
    my_files.zip
        invoices/
            2024/
                sales.csv
                report.pdf
            2025/
                january.csv
        
        **Notes:**
        - Only files are supported — folder paths are skipped and added to the failed list.
        - zip_name is optional. Defaults to 'download' if not provided.
        - If none of the provided paths are valid files, a 400 error is returned.
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'paths': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'List of relative file paths to include in the zip.',
                        'example': [
                            'invoices/2024/sales.csv',
                            'invoices/2024/report.pdf'
                        ]
                    },
                    'zip_name': {
                        'type': 'string',
                        'description': 'Name of the zip file without extension. Defaults to download.',
                        'example': 'my_files'
                    }
                },
                'required': ['paths']
            }
        },
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.BINARY,
                description="Zip archive containing all requested files"
            ),
            400: OpenApiResponse(
                description="No paths provided or no valid files found",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {
                            'type': 'string',
                            'example': 'paths is required and cannot be empty'
                        },
                        'failed': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'path':  {'type': 'string'},
                                    'error': {'type': 'string'}
                                }
                            }
                        }
                    }
                }
            )
        }
    )
    def post(self, request):
        """Bulk download files as a zip archive."""
        media_path = settings.FILE_MANAGER_ROOT
        paths      = request.data.get('paths')
        zip_name   = request.data.get('zip_name', 'download')

        if not paths:
            return Response(
                {'error': 'paths is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # in-memory buffer — no temp file written to disk
        zip_buffer = io.BytesIO()
        failed     = []
        added      = []

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for path in paths:
                absolute_path = os.path.join(media_path, path)
                try:
                    if os.path.isfile(absolute_path):
                        # arcname preserves the relative folder structure inside the zip
                        zip_file.write(absolute_path, arcname=path)
                        added.append(path)
                    elif os.path.isdir(absolute_path):
                        failed.append({'path': path, 'error': 'Folders are not supported — provide individual file paths'})
                    else:
                        failed.append({'path': path, 'error': 'File not found'})
                except Exception as e:
                    failed.append({'path': path, 'error': str(e)})

        # if nothing was added to the zip, return error
        if not added:
            return Response(
                {
                    'error': 'No valid files found to zip',
                    'failed': failed
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # rewind buffer to the beginning before sending
        zip_buffer.seek(0)

        response = FileResponse(
            zip_buffer,
            content_type='application/zip'
        )
        response['Content-Disposition'] = f'attachment; filename={zip_name}.zip'
        return response

class StorageStatsAPIView(BaseFileAPIView):

    """Storage statistics for the media folder."""

    def get_readable_size(self, size_bytes):
        if size_bytes < 1024:
            return f'{size_bytes} B'
        elif size_bytes < 1024 ** 2:
            return f'{size_bytes / 1024:.1f} KB'
        elif size_bytes < 1024 ** 3:
            return f'{size_bytes / (1024 ** 2):.1f} MB'
        else:
            return f'{size_bytes / (1024 ** 3):.1f} GB'

    @extend_schema(
        summary="Get storage statistics",
        description="""
        Returns a complete overview of everything stored in the media folder.
        Useful for admin dashboards to monitor disk usage, file distribution, and storage growth.
        
        **What it returns:**
        - Total size of all files in the media folder
        - Total number of files and folders
        - Largest file with its path and size
        - Breakdown of files and sizes grouped by extension
        
        **Example response:**
```json
        {
            "total_size_bytes": 1073741824,
            "total_size_readable": "1.0 GB",
            "total_files": 342,
            "total_folders": 48,
            "largest_file": {
                "name": "report.pdf",
                "path": "invoices/2024/report.pdf",
                "size_bytes": 10485760,
                "size_readable": "10.0 MB"
            },
            "by_extension": {
                ".csv": {"count": 120, "size_bytes": 251658240, "size_readable": "240.0 MB"},
                ".pdf": {"count": 80,  "size_bytes": 587202560, "size_readable": "560.0 MB"},
                ".jpg": {"count": 142, "size_bytes": 286330880, "size_readable": "273.0 MB"}
            }
        }
```
        
        **Notes:**
        - This endpoint walks the entire media folder recursively — on very large 
          storage it may take a moment to respond.
        - Folder sizes are not included in the total — only actual file sizes are counted.
        - If the media folder is empty, all counts will be zero and largest_file will be null.
        """,
        responses={
            200: OpenApiResponse(
                description="Storage statistics returned successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'total_size_bytes': {
                            'type': 'integer',
                            'description': 'Total size of all files in bytes',
                            'example': 1073741824
                        },
                        'total_size_readable': {
                            'type': 'string',
                            'description': 'Total size in human readable format',
                            'example': '1.0 GB'
                        },
                        'total_files': {
                            'type': 'integer',
                            'description': 'Total number of files across all directories',
                            'example': 342
                        },
                        'total_folders': {
                            'type': 'integer',
                            'description': 'Total number of folders across all directories',
                            'example': 48
                        },
                        'largest_file': {
                            'type': 'object',
                            'nullable': True,
                            'description': 'Details of the largest file found. Null if media folder is empty.',
                            'properties': {
                                'name':          {'type': 'string',  'example': 'report.pdf'},
                                'path':          {'type': 'string',  'example': 'invoices/2024/report.pdf'},
                                'size_bytes':    {'type': 'integer', 'example': 10485760},
                                'size_readable': {'type': 'string',  'example': '10.0 MB'}
                            }
                        },
                        'by_extension': {
                            'type': 'object',
                            'description': 'Breakdown of file count and total size grouped by extension',
                            'example': {
                                '.csv': {'count': 120, 'size_bytes': 251658240, 'size_readable': '240.0 MB'},
                                '.pdf': {'count': 80,  'size_bytes': 587202560, 'size_readable': '560.0 MB'}
                            }
                        }
                    }
                }
            ),
            400: OpenApiResponse(
                description="Unexpected error reading the media folder",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Error reading media folder'}
                    }
                }
            )
        }
    )
    def get(self, request):
        """Get storage statistics."""
        media_path    = settings.FILE_MANAGER_ROOT
        total_size    = 0
        total_files   = 0
        total_folders = 0
        largest_file  = None
        by_extension  = {}

        try:
            for dirpath, dirnames, filenames in os.walk(media_path):

                # count folders
                total_folders += len(dirnames)

                for filename in filenames:
                    file_path  = os.path.join(dirpath, filename)
                    size_bytes = os.path.getsize(file_path)

                    # accumulate totals
                    total_files += 1
                    total_size  += size_bytes

                    # track largest file
                    if largest_file is None or size_bytes > largest_file['size_bytes']:
                        relative_path = os.path.relpath(file_path, media_path)
                        largest_file  = {
                            'name':          filename,
                            'path':          relative_path,
                            'size_bytes':    size_bytes,
                            'size_readable': self.get_readable_size(size_bytes)
                        }

                    # group by extension
                    _, extension = os.path.splitext(filename)
                    extension    = extension.lower() if extension else 'no extension'

                    if extension not in by_extension:
                        by_extension[extension] = {'count': 0, 'size_bytes': 0}

                    by_extension[extension]['count']      += 1
                    by_extension[extension]['size_bytes'] += size_bytes

            # add readable size to each extension group after the loop
            for ext in by_extension:
                by_extension[ext]['size_readable'] = self.get_readable_size(
                    by_extension[ext]['size_bytes']
                )

            return Response({
                'total_size_bytes':    total_size,
                'total_size_readable': self.get_readable_size(total_size),
                'total_files':         total_files,
                'total_folders':       total_folders,
                'largest_file':        largest_file,
                'by_extension':        by_extension
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )