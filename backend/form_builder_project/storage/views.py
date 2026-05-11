import os
import csv
import shutil
import datetime
import zipfile
import io
import json
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.http import FileResponse, StreamingHttpResponse
from django.utils import timezone
from rest_framework import serializers
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import FileInfo, SharedFile, TrashedItem,FavoriteItem
from .serializers import FileInfoSerializer 
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiResponse
from .throttles import (
    FileUploadRateThrottle,
    FolderUploadRateThrottle,
    FileDownloadRateThrottle,
    BulkDownloadRateThrottle,
    StorageStatsRateThrottle,
    FileSearchRateThrottle,
    BulkDeleteRateThrottle,
    ShareCreateRateThrottle,
)

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
    
    # 1 — every storage endpoint requires a valid JWT token
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    # viewable file types and their content types
    VIEWABLE_CONTENT_TYPES = {
        '.jpg':  'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png':  'image/png',
        '.gif':  'image/gif',
        '.bmp':  'image/bmp',
        '.webp': 'image/webp',
        '.svg':  'image/svg+xml',
        '.pdf':  'application/pdf',
        '.txt':  'text/plain',
        '.csv':  'text/csv',
        '.mp4':  'video/mp4',
        '.webm': 'video/webm',
        '.mp3':  'audio/mpeg',
        '.wav':  'audio/wav',
    }
    def get_content_type(self, file_path):
        """Get content type for a file based on its extension."""
        _, ext = os.path.splitext(file_path)
        return self.VIEWABLE_CONTENT_TYPES.get(ext.lower(), 'application/octet-stream')

    def is_file_viewable(self, file_path):
        """Check if a file type supports inline viewing."""
        _, ext = os.path.splitext(file_path)
        return ext.lower() in self.VIEWABLE_CONTENT_TYPES

    # 2 — every user gets their own isolated folder

    def get_user_media_path(self, request):
        """Build and return the user's isolated folder path."""
        user_folder = os.path.join(
            str(settings.FILE_MANAGER_ROOT),
            'users',
            str(request.user.id)
        )
        os.makedirs(user_folder, exist_ok=True)
        return user_folder

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

    # 3 — boundary check now uses user's folder not global root
    def is_within_media_root(self, absolute_path, request):
        """Final check — ensure path hasn't escaped the user's folder."""
        user_path = self.get_user_media_path(request)
        return os.path.abspath(absolute_path).startswith(user_path)

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

    def _get_folder_size(self, folder_path):
        """Calculate total size of all files in a folder recursively."""
        total_size = 0
        try:
            for dirpath, dirnames, filenames in os.walk(folder_path):
                for filename in filenames:
                    file_path = os.path.join(dirpath, filename)
                    try:
                        total_size += os.path.getsize(file_path)
                    except (OSError, IOError):
                        # Skip files that can't be accessed
                        continue
        except (OSError, IOError):
            # Return 0 if folder can't be accessed
            return 0
        return total_size


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
                    
                    file_size = os.path.getsize(file_path)
                    print(f"DEBUG: File {filename} size: {file_size} bytes")  # Debug logging
                    
                    files.append({
                        'filename': filename,
                        'file_path': os.path.relpath(file_path, directory_path),
                        'csv_text': csv_text,
                        'is_directory': False,
                        'size':         file_size,
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
                    # Hide .trash directory from listing
                    if name == '.trash':
                        continue
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
        media_path = self.get_user_media_path(request)
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
        
        # Filter files by search query if provided
        if query:
            query_lower = query.lower()
            files = [
                file for file in files
                if query_lower in file['filename'].lower()
            ]
        
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
        media_path = self.get_user_media_path(request)
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
    
        media_path = self.get_user_media_path(request)
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
        media_path = self.get_user_media_path(request)
        
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
        media_path = self.get_user_media_path(request)
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
    """View a file (for images/PDFs/videos/audio/text in popup)."""

    # complete content type map
    CONTENT_TYPE_MAP = {
        # images
        '.jpg':  'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png':  'image/png',
        '.gif':  'image/gif',
        '.bmp':  'image/bmp',
        '.webp': 'image/webp',
        '.svg':  'image/svg+xml',
        '.ico':  'image/x-icon',
        '.tiff': 'image/tiff',

        # documents
        '.pdf':  'application/pdf',
        '.txt':  'text/plain',
        '.csv':  'text/csv',
        '.md':   'text/markdown',
        '.html': 'text/html',
        '.xml':  'text/xml',
        '.json': 'application/json',

        # video
        '.mp4':  'video/mp4',
        '.webm': 'video/webm',
        '.ogg':  'video/ogg',
        '.mov':  'video/quicktime',
        '.avi':  'video/x-msvideo',
        '.mkv':  'video/x-matroska',
        '.m4v':  'video/x-m4v',
        '.3gp':  'video/3gpp',

        # audio
        '.mp3':  'audio/mpeg',
        '.wav':  'audio/wav',
        '.ogg':  'audio/ogg',
        '.m4a':  'audio/mp4',
        '.aac':  'audio/aac',
        '.flac': 'audio/flac',
        '.weba': 'audio/webm',
    }

    @extend_schema(
        summary="View or preview a file inline",
        description="""
        Serves a file for inline viewing in the browser.
        Automatically detects the correct content type based on the file extension.
        
        **Supported file types:**
        
        Images — jpg, jpeg, png, gif, bmp, webp, svg, ico, tiff
        
        Documents — pdf, txt, csv, md, html, xml, json
        
        Video — mp4, webm, ogg, mov, avi, mkv, m4v, 3gp
        
        Audio — mp3, wav, ogg, m4a, aac, flac, weba
        
        Any other file type is served as a binary download fallback.
        
        **How the browser handles each type:**
        - Images → rendered inline
        - PDF → opened in browser PDF viewer
        - Text/CSV/JSON/MD → displayed as plain text
        - Video → played in browser video player
        - Audio → played in browser audio player
        - Other → downloaded automatically
        """,
        parameters=[
            OpenApiParameter(
                name='file_path',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Path to the file using %slash% as folder separator.',
                required=True,
                examples=[
                    OpenApiExample('Image',    value='photos%slash%vacation.jpg'),
                    OpenApiExample('PDF',      value='reports%slash%annual.pdf'),
                    OpenApiExample('Video',    value='videos%slash%demo.mp4'),
                    OpenApiExample('Audio',    value='music%slash%song.mp3'),
                    OpenApiExample('Document', value='docs%slash%readme.txt'),
                ]
            )
        ],
        responses={
            200: OpenApiResponse(description="File content served with correct content type"),
            404: OpenApiResponse(description="File not found"),
            400: OpenApiResponse(description="Error serving file")
        }
    )
    def get(self, request, file_path):
        """Serve file content for inline viewing."""
        path               = file_path.replace('%slash%', os.sep)\
                                       .replace('%2F', os.sep)\
                                       .replace('%5C', os.sep)
        path               = self.sanitize_path(path)

        if not path:
            return Response(
                {'error': 'Invalid path provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        media_path         = self.get_user_media_path(request)
        absolute_file_path = os.path.join(media_path, path)

        if not os.path.exists(absolute_file_path):
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not os.path.isfile(absolute_file_path):
            return Response(
                {'error': 'Path is a directory — only files can be viewed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            _, ext       = os.path.splitext(absolute_file_path)
            ext          = ext.lower()
            content_type = self.CONTENT_TYPE_MAP.get(ext, 'application/octet-stream')

            fh       = open(absolute_file_path, 'rb')
            response = FileResponse(fh, content_type=content_type)

            # no Content-Disposition header → browser renders inline
            # if unsupported type → browser downloads automatically
            return response

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
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
        media_path = self.get_user_media_path(request)
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
        media_path = self.get_user_media_path(request)
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
        media_path = self.get_user_media_path(request)
        path       = self.sanitize_path(request.data.get('path'))
        new_name   = request.data.get('new_name')

        # step 1 — validate both fields exist
        if not path or not new_name:
            return Response(
                {'error': 'path and new_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # step 2 — validate new_name contains no path separators or null bytes
        if os.sep in new_name or '/' in new_name or '\\' in new_name or '\x00' in new_name:
            return Response(
                {'error': 'Invalid name provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        absolute_path = os.path.join(media_path, path)

        # step 3 — check source exists
        if not os.path.exists(absolute_path):
            return Response(
                {'error': 'Path does not exist'},
                status=status.HTTP_404_NOT_FOUND
            )

        # step 4 — build new path and check for conflict
        parent_directory  = os.path.dirname(absolute_path)
        absolute_new_path = os.path.join(parent_directory, new_name)

        if os.path.exists(absolute_new_path):
            return Response(
                {'error': f'A file or folder named {new_name} already exists in this directory'},
                status=status.HTTP_409_CONFLICT
            )

        try:
            os.rename(absolute_path, absolute_new_path)
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
            """Rename a file or folder."""
            media_path = self.get_user_media_path(request)
            path     = self.sanitize_path(request.data.get('path'))
            new_name = request.data.get('new_name')

            # validate both fields are provided
            if not path or not new_name:
                return Response(
                    {'error': 'path and new_name are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if os.sep in new_name or '/' in new_name or '\\' in new_name or '\x00' in new_name:
                return Response(
                {'error': 'Invalid name provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

            absolute_path = os.path.join(media_path, path)
            

            # prevent new_name from containing path separators
            # e.g. someone sends 'subfolder/malicious.csv' as new_name
            if os.sep in new_name or '/' in new_name:
                return Response(
                    {'error': 'new_name must be a name only, not a path. Example: sales_final.csv'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        

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
        file_path   = request.data.get('file_path')
        expires_in  = request.data.get('expires_in')
        max_access  = request.data.get('max_access')
        is_viewable = request.data.get('is_viewable', False)

        if not file_path:
            return Response(
                {'error': 'file_path is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        absolute_path = os.path.join(self.get_user_media_path(request), file_path)

        if not os.path.isfile(absolute_path):
            return Response(
                {'error': 'File not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # check if file type actually supports viewing
        effective_viewable = is_viewable and self.is_file_viewable(absolute_path)

        expires_at = None
        if expires_in:
            expires_at = timezone.now() + timezone.timedelta(hours=int(expires_in))

        share = SharedFile.objects.create(
            file_path   = file_path,
            expires_at  = expires_at,
            max_access  = max_access,
            created_by  = request.user,
            item_type   = 'file',
            is_viewable = effective_viewable
        )

        share_url = request.build_absolute_uri(
            f'/api/files/shared/{share.token}/'
        )

        return Response(
            {
                'share_url':   share_url,
                'token':       share.token,
                'file_path':   file_path,
                'is_viewable': effective_viewable,
                'expires_at':  expires_at,
                'max_access':  max_access
            },
            status=status.HTTP_201_CREATED
        )
class FileShareInfoAPIView(BaseFileAPIView):
    authentication_classes = []          # ← no auth required
    permission_classes     = [AllowAny]  # ← anyone can access
    """Get metadata for a shared file via token."""
    
    @extend_schema(
        summary="Get shared file metadata via token",
        description="""Returns metadata about a shared file without downloading it.
        No authentication required - the token itself is the access key.""",
        parameters=[
            OpenApiParameter(
                name='token',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description='The unique share token',
                required=True,
            )
        ],
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'id': {'type': 'string'},
                    'name': {'type': 'string'},
                    'original_name': {'type': 'string'},
                    'type': {'type': 'string', 'enum': ['file', 'folder']},
                    'file_size': {'type': 'integer'},
                    'mime_type': {'type': 'string'},
                    'path': {'type': 'string'},
                    'token': {'type': 'string'},
                    'expires_at': {'type': 'string', 'format': 'date-time'},
                    'max_access': {'type': 'integer'},
                    'current_access': {'type': 'integer'},
                    'shared_by': {'type': 'string'},
                    'created_at': {'type': 'string', 'format': 'date-time'},
                }
            },
            404: {'description': 'Token does not exist'},
            403: {'description': 'Link is no longer valid'}
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

        valid, reason = share.is_valid()
        if not valid:
            return Response(
                {'error': reason},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get file size if it's a file
        file_size = None
        if share.item_type == 'file':
            try:
                absolute_path = os.path.join(
                    str(settings.FILE_MANAGER_ROOT),
                    'users',
                    str(share.created_by_id),
                    share.file_path
                )
                file_size = os.path.getsize(absolute_path)
            except (OSError, FileNotFoundError):
                file_size = 0

        return Response({
            'id': str(share.id),
            'name': os.path.basename(share.file_path),
            'original_name': os.path.basename(share.file_path),
            'type': share.item_type,
            'file_size': file_size,
            'mime_type': None,  # Could be determined from file extension if needed
            'path': share.file_path,
            'token': str(share.token),
            'expires_at': share.expires_at.isoformat() if share.expires_at else None,
            'max_access': share.max_access,
            'current_access': share.access_count,
            'shared_by': share.created_by.username if share.created_by else None,  # Return username instead of ID
        })

class FileShareBulkInfoAPIView(BaseFileAPIView):
    authentication_classes = []          # ← no auth required
    permission_classes     = [AllowAny]  # ← anyone can access
    """Get metadata for multiple shared files via tokens."""
    
    @extend_schema(
        summary="Get multiple shared files metadata via tokens",
        description="""Returns metadata about multiple shared files without downloading them.
        No authentication required - the tokens themselves are the access keys.""",
        parameters=[
            OpenApiParameter(
                name='token',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description='Share tokens (can be multiple)',
                required=True,
                many=True
            )
        ],
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'shared': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'string'},
                                'name': {'type': 'string'},
                                'original_name': {'type': 'string'},
                                'type': {'type': 'string', 'enum': ['file', 'folder']},
                                'file_size': {'type': 'integer'},
                                'mime_type': {'type': 'string'},
                                'path': {'type': 'string'},
                                'token': {'type': 'string'},
                                'is_viewable': {'type': 'boolean'},
                                'expires_at': {'type': 'string', 'format': 'date-time'},
                                'max_access': {'type': 'integer'},
                                'current_access': {'type': 'integer'},
                                'shared_by': {'type': 'string'},
                                'created_at': {'type': 'string', 'format': 'date-time'},
                            }
                        }
                    }
                }
            },
            400: {'description': 'No tokens provided'},
            404: {'description': 'One or more tokens do not exist'},
            403: {'description': 'One or more links are no longer valid'}
        }
    )
    
    def get(self, request):
        tokens = request.GET.getlist('token')
        if not tokens:
            return Response(
                {'error': 'No tokens provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        shared_items = []
        errors = []

        for token in tokens:
            try:
                share = SharedFile.objects.get(token=token)
                
                valid, reason = share.is_valid()
                if not valid:
                    errors.append({'token': token, 'error': reason})
                    continue

                # Get file size if it's a file
                file_size = None
                if share.item_type == 'file':
                    try:
                        absolute_path = os.path.join(
                            str(settings.FILE_MANAGER_ROOT),
                            'users',
                            str(share.created_by_id),
                            share.file_path
                        )
                        file_size = os.path.getsize(absolute_path)
                    except (OSError, FileNotFoundError):
                        file_size = 0

                shared_items.append({
                    'id': str(share.id),
                    'name': os.path.basename(share.file_path),
                    'original_name': os.path.basename(share.file_path),
                    'type': share.item_type,
                    'file_size': file_size,
                    'mime_type': None,
                    'path': share.file_path,
                    'token': str(share.token),
                    'is_viewable': share.is_viewable,
                    'expires_at': share.expires_at.isoformat() if share.expires_at else None,
                    'max_access': share.max_access,
                    'current_access': share.access_count,
                    'shared_by': share.created_by.username if share.created_by else None,
                })

            except SharedFile.DoesNotExist:
                errors.append({'token': token, 'error': 'Invalid or expired link'})

        # If no valid items found, return error
        if not shared_items and errors:
            return Response(
                {'error': 'No valid tokens found', 'details': errors},
                status=status.HTTP_404_NOT_FOUND
            )

        response_data = {'shared': shared_items}
        if errors:
            response_data['errors'] = errors

        return Response(response_data)

class FileShareAccessAPIView(BaseFileAPIView):
    authentication_classes = []          # ← no auth required
    permission_classes     = [AllowAny]  # ← anyone can access
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

        valid, reason = share.is_valid()
        if not valid:
            share.delete()
            return Response(
                {'error': reason},
                status=status.HTTP_403_FORBIDDEN
            )

        share.access_count += 1
        share.save()

        absolute_path = os.path.join(
            str(settings.FILE_MANAGER_ROOT),
            'users',
            str(share.created_by_id),
            share.file_path
        )

        # serve file directly
        if share.item_type == 'file':
            if share.is_viewable:
                # inline viewing — browser renders the file
                content_type = self.get_content_type(share.file_path)
                fh           = open(absolute_path, 'rb')
                response     = FileResponse(fh, content_type=content_type)
                # no Content-Disposition → browser renders inline
                return response
            else:
                # force download
                fh       = open(absolute_path, 'rb')
                response = FileResponse(fh, content_type='application/octet-stream')
                response['Content-Disposition'] = f'attachment; filename={os.path.basename(share.file_path)}'
                return response

        # serve folder as zip — always download, never viewable
        elif share.item_type == 'folder':
            zip_buffer  = io.BytesIO()
            folder_name = os.path.basename(absolute_path.rstrip(os.sep))

            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for dirpath, dirnames, filenames in os.walk(absolute_path):
                    for filename in filenames:
                        file_full_path = os.path.join(dirpath, filename)
                        arcname        = os.path.join(
                            folder_name,
                            os.path.relpath(file_full_path, absolute_path)
                        )
                        zip_file.write(file_full_path, arcname=arcname)

            zip_buffer.seek(0)
            response = FileResponse(zip_buffer, content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename={folder_name}.zip'
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
        media_path = self.get_user_media_path(request)
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

        absolute_path = os.path.join(self.get_user_media_path(request), path)

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
            absolute_path = os.path.join(self.get_user_media_path(request), path)
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
        media_path = self.get_user_media_path(request)
        paths      = request.data.get('paths')
        zip_name   = request.data.get('zip_name', 'download')

        if not paths:
            return Response(
                {'error': 'paths is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Use streaming response for better performance with large files
        failed = []
        added = []
        
        # Create a streaming response that generates zip on-the-fly
        def zip_generator():
            # Use a temporary file for better memory efficiency with large files
            temp_zip_path = os.path.join(media_path, f'temp_{zip_name}_{request.user.id}.zip')
            
            try:
                # Use optimized compression settings for better performance
                with zipfile.ZipFile(temp_zip_path, 'w', zipfile.ZIP_STORED) as zip_file:
                    # ZIP_STORED is faster for large files, ZIP_DEFLATED for smaller files
                    # We could implement size-based compression selection here
                    
                    for path in paths:
                        absolute_path = os.path.join(media_path, path)
                        try:
                            if os.path.isfile(absolute_path):
                                # Get file size for optimization decisions
                                file_size = os.path.getsize(absolute_path)
                                
                                # For large files (>50MB), use streaming write to avoid memory issues
                                if file_size > 50 * 1024 * 1024:  # 50MB threshold
                                    with open(absolute_path, 'rb') as f:
                                        # Write file in chunks to avoid loading entire file into memory
                                        zip_info = zipfile.ZipInfo.from_file(absolute_path, arcname=path)
                                        zip_info.compress_type = zipfile.ZIP_STORED  # No compression for speed
                                        zip_file.writestr(zip_info, f.read())
                                else:
                                    # For smaller files, use regular write with compression
                                    zip_info = zipfile.ZipInfo.from_file(absolute_path, arcname=path)
                                    zip_info.compress_type = zipfile.ZIP_DEFLATED  # Compress smaller files
                                    with open(absolute_path, 'rb') as f:
                                        zip_file.writestr(zip_info, f.read())
                                
                                added.append(path)
                            elif os.path.isdir(absolute_path):
                                failed.append({'path': path, 'error': 'Folders are not supported — provide individual file paths'})
                            else:
                                failed.append({'path': path, 'error': 'File not found'})
                        except Exception as e:
                            failed.append({'path': path, 'error': str(e)})
                
                # Check if any files were added
                if not added:
                    os.remove(temp_zip_path)  # Clean up temp file
                    yield json.dumps({
                        'error': 'No valid files found to zip',
                        'failed': failed
                    }).encode()
                    return
                
                # Stream the zip file in chunks
                with open(temp_zip_path, 'rb') as f:
                    while True:
                        chunk = f.read(8192)  # 8KB chunks for optimal performance
                        if not chunk:
                            break
                        yield chunk
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_zip_path):
                    os.remove(temp_zip_path)
        
        # Check if we have any valid files before starting streaming
        # Pre-validate paths to avoid streaming empty response
        temp_failed = []
        temp_added = []
        for path in paths:
            absolute_path = os.path.join(media_path, path)
            try:
                if os.path.isfile(absolute_path):
                    temp_added.append(path)
                elif os.path.isdir(absolute_path):
                    temp_failed.append({'path': path, 'error': 'Folders are not supported — provide individual file paths'})
                else:
                    temp_failed.append({'path': path, 'error': 'File not found'})
            except Exception as e:
                temp_failed.append({'path': path, 'error': str(e)})
        
        if not temp_added:
            return Response(
                {
                    'error': 'No valid files found to zip',
                    'failed': temp_failed
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Return streaming response
        response = StreamingHttpResponse(
            zip_generator(),
            content_type='application/zip'
        )
        response['Content-Disposition'] = f'attachment; filename={zip_name}.zip'
        response['Cache-Control'] = 'no-cache'  # Prevent caching of large downloads
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
        media_path    = self.get_user_media_path(request)
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

class MixedDownloadAPIView(BaseFileAPIView):

    """Download a mix of files and folders as a zip archive."""
    throttle_classes = [BulkDownloadRateThrottle]

    @extend_schema(
        summary="Download files and folders as a zip archive",
        description="""
        Downloads a mix of files and folders as a single zip archive.
        Folder structures are preserved inside the zip exactly as they are on disk.
        
        **Example:**
        ```json
        {
            "paths": [
                "invoices/2024/sales.csv",
                "invoices/2025/",
                "reports/"
            ],
            "zip_name": "my_download"
        }
        ```
        Result zip structure:
        my_download.zip
        invoices/
            2024/
                sales.csv        ← single file
            2025/
                january.csv      ← from folder
                february.csv     ← from folder
        reports/
            annual.pdf           ← from folder
            summary.csv          ← from folder
            """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'paths': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'List of relative file and folder paths to include.',
                        'example': [
                            'invoices/2024/sales.csv',
                            'invoices/2025/',
                            'reports/'
                        ]
                    },
                    'zip_name': {
                        'type': 'string',
                        'description': 'Name of the zip file without extension. Defaults to download.',
                        'example': 'my_download'
                    }
                },
                'required': ['paths']
            }
        },
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.BINARY,
                description="Zip archive containing all requested files and folders"
            ),
            400: OpenApiResponse(
                description="No paths provided or no valid items found",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'paths is required and cannot be empty'},
                        'failed': {'type': 'array', 'items': {'type': 'object'}}
                    }
                }
            )
        }
    )
    def post(self, request):
        """Download a mix of files and folders as a zip."""
        media_path = self.get_user_media_path(request)
        paths      = request.data.get('paths')
        zip_name   = request.data.get('zip_name', 'download')

        # validate paths provided
        if not paths:
            return Response(
                {'error': 'paths is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # sanitize all paths
        paths = [self.sanitize_path(p) for p in paths]
        paths = [p for p in paths if p is not None]

        if not paths:
            return Response(
                {'error': 'No valid paths provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        zip_buffer = io.BytesIO()
        failed     = []
        added      = []

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for path in paths:
                absolute_path = os.path.join(media_path, path)

                try:
                    if os.path.isfile(absolute_path):
                        # single file — add directly
                        zip_file.write(absolute_path, arcname=path)
                        added.append(path)

                    elif os.path.isdir(absolute_path):
                        # folder — walk recursively and add all files
                        # preserving the folder structure inside the zip
                        for dirpath, dirnames, filenames in os.walk(absolute_path):
                            for filename in filenames:
                                file_full_path = os.path.join(dirpath, filename)

                                # arcname preserves relative structure inside zip
                                arcname = os.path.join(
                                    path,
                                    os.path.relpath(file_full_path, absolute_path)
                                )
                                zip_file.write(file_full_path, arcname=arcname)
                                added.append(arcname)

                    else:
                        failed.append({
                            'path':  path,
                            'error': 'File or folder not found'
                        })

                except Exception as e:
                    failed.append({'path': path, 'error': str(e)})

        if not added:
            return Response(
                {
                    'error':  'No valid files found to zip',
                    'failed': failed
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        zip_buffer.seek(0)

        response = FileResponse(zip_buffer, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename={zip_name}.zip'
        return response

class MixedMoveAPIView(BaseFileAPIView):
    """Move multiple files and folders to a new location."""

    @extend_schema(
        summary="Move multiple files and folders",
        description="""
        Moves multiple files and folders to a destination directory in a single request.
        Each item is processed independently — if one fails the rest continue.
        
        **How it works:**
        Provide a list of source paths and a single destination directory.
        All items will be moved into that destination directory preserving their names.
        
        **Example:**
    ```json
        {
            "paths": [
                "invoices/2024/sales.csv",
                "invoices/2025/",
                "reports/annual.pdf"
            ],
            "destination": "archive/2024"
        }
    ```
        Result:
        BEFORE:                         AFTER:
    invoices/                       archive/
        2024/                           2024/
            sales.csv    ──────►            sales.csv
        2025/            ──────►            2025/
    reports/                                    january.csv
        annual.pdf       ──────►            annual.pdf
        **Important notes:**
        - destination is a directory path — not a full file path.
        - Each item keeps its original name at the destination.
        - Destination directory is created automatically if it does not exist.
        - If an item already exists at the destination it will be overwritten.
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'paths': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'List of relative paths of files and folders to move.',
                        'example': [
                            'invoices/2024/sales.csv',
                            'invoices/2025/',
                            'reports/annual.pdf'
                        ]
                    },
                    'destination': {
                        'type': 'string',
                        'description': 'Relative path of the destination directory to move items into.',
                        'example': 'archive/2024'
                    }
                },
                'required': ['paths', 'destination']
            }
        },
        responses={
            200: OpenApiResponse(
                description="Move completed — check moved and failed lists for details",
                response={
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'example': '2 item(s) moved successfully, 1 failed'
                        },
                        'moved': {
                            'type': 'array',
                            'items': {'type': 'string'},
                            'example': ['invoices/2024/sales.csv', 'invoices/2025/']
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
            ),
            400: OpenApiResponse(
                description="Missing fields or no valid paths provided",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'paths and destination are required'}
                    }
                }
            ),
            404: OpenApiResponse(
                description="Destination directory not found after creation attempt",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Could not create destination directory'}
                    }
                }
            )
        }
    )
    def patch(self, request):
        """Move multiple files and folders to a destination directory."""
        media_path  = self.get_user_media_path(request)
        paths       = request.data.get('paths')
        destination = request.data.get('destination')

        # validate both fields provided
        if not paths or not destination:
            return Response(
                {'error': 'paths and destination are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # sanitize destination
        destination = self.sanitize_path(destination)
        if not destination:
            return Response(
                {'error': 'Invalid destination path'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # sanitize all source paths
        paths = [self.sanitize_path(p) for p in paths]
        paths = [p for p in paths if p is not None]

        if not paths:
            return Response(
                {'error': 'No valid paths provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        absolute_destination = os.path.join(media_path, destination)

        # create destination directory if it doesn't exist
        try:
            os.makedirs(absolute_destination, exist_ok=True)
        except Exception as e:
            return Response(
                {'error': f'Could not create destination directory: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        moved  = []
        failed = []

        for path in paths:
            absolute_source = os.path.join(media_path, path)

            try:
                # check source exists
                if not os.path.exists(absolute_source):
                    failed.append({'path': path, 'error': 'File or folder not found'})
                    continue

                # prevent moving into itself
                if absolute_destination.startswith(absolute_source + os.sep):
                    failed.append({'path': path, 'error': 'Cannot move a folder into itself'})
                    continue

                # build destination path — item keeps its original name
                item_name            = os.path.basename(absolute_source.rstrip(os.sep))
                absolute_destination_item = os.path.join(absolute_destination, item_name)

                # move the item
                shutil.move(absolute_source, absolute_destination_item)
                moved.append(path)

            except Exception as e:
                failed.append({'path': path, 'error': str(e)})

        return Response(
            {
                'message':     f'{len(moved)} item(s) moved successfully, {len(failed)} failed',
                'moved':       moved,
                'destination': destination,
                'failed':      failed
            },
            status=status.HTTP_200_OK if moved else status.HTTP_400_BAD_REQUEST
        )

class FileCompressAPIView(BaseFileAPIView):

    """Compress files and folders into a zip archive stored on the server."""

    @extend_schema(
        summary="Compress files and folders into a zip archive",
        description="""
        Compresses a mix of files and folders into a zip archive and saves it
        to a specified location on the server — without downloading it.
        
        **Difference from bulk download:**
        - bulk-download → zips and sends to the client as a download
        - compress       → zips and saves the zip file on the server
        
        **Example:**
        ```json
        {
            "paths": [
                "invoices/2024/sales.csv",
                "invoices/2025/",
                "reports/"
            ],
            "zip_name": "invoices_archive",
            "destination": "archives/"
        }
        ```
        Result:
        BEFORE:                         AFTER:
        invoices/                       invoices/
        2024/                           2024/
            sales.csv                       sales.csv
        2025/                           2025/
        reports/                        reports/
                                    archives/
                                        invoices_archive.zip  ← created here
                           **Important notes:**
        - destination is optional. Defaults to the root of the user's media folder.
        - zip_name is optional. Defaults to 'archive'.
        - If a zip with the same name already exists at the destination it will be overwritten.
        - The original files and folders are NOT deleted — only a compressed copy is created.
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'paths': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'List of relative paths of files and folders to compress.',
                        'example': [
                            'invoices/2024/sales.csv',
                            'invoices/2025/',
                            'reports/'
                        ]
                    },
                    'zip_name': {
                        'type': 'string',
                        'description': 'Name of the zip file without extension. Defaults to archive.',
                        'example': 'invoices_archive'
                    },
                    'destination': {
                        'type': 'string',
                        'description': 'Relative path of the directory to save the zip into. Defaults to root.',
                        'example': 'archives/'
                    }
                },
                'required': ['paths']
            }
        },
        responses={
            201: OpenApiResponse(
                description="Zip archive created successfully on the server",
                response={
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'example': 'Archive created successfully'
                        },
                        'zip_path': {
                            'type': 'string',
                            'description': 'Relative path of the created zip file',
                            'example': 'archives/invoices_archive.zip'
                        },
                        'zip_size_readable': {
                            'type': 'string',
                            'example': '1.2 MB'
                        },
                        'files_compressed': {
                            'type': 'integer',
                            'example': 5
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
            ),
            400: OpenApiResponse(
                description="Missing paths or no valid items found",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'paths is required and cannot be empty'}
                    }
                }
            )
        }
    )
    def post(self, request):
        """Compress files and folders into a zip archive saved on the server."""
        media_path  = self.get_user_media_path(request)
        paths       = request.data.get('paths')
        zip_name    = request.data.get('zip_name', 'archive')
        destination = request.data.get('destination', '')

        # validate paths provided
        if not paths:
            return Response(
                {'error': 'paths is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # sanitize destination and paths
        destination = self.sanitize_path(destination) or ''
        paths       = [self.sanitize_path(p) for p in paths]
        paths       = [p for p in paths if p is not None]

        if not paths:
            return Response(
                {'error': 'No valid paths provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # build the destination folder and zip file path
        destination_folder = os.path.join(media_path, destination)
        os.makedirs(destination_folder, exist_ok=True)
        zip_file_path = os.path.join(destination_folder, f'{zip_name}.zip')

        failed          = []
        files_compressed = 0

        try:
            with zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for path in paths:
                    absolute_path = os.path.join(media_path, path)

                    try:
                        if os.path.isfile(absolute_path):
                            # single file — add directly
                            zip_file.write(absolute_path, arcname=path)
                            files_compressed += 1

                        elif os.path.isdir(absolute_path):
                            # folder — walk recursively
                            for dirpath, dirnames, filenames in os.walk(absolute_path):
                                for filename in filenames:
                                    file_full_path = os.path.join(dirpath, filename)
                                    arcname        = os.path.join(
                                        path,
                                        os.path.relpath(file_full_path, absolute_path)
                                    )
                                    zip_file.write(file_full_path, arcname=arcname)
                                    files_compressed += 1

                        else:
                            failed.append({'path': path, 'error': 'File or folder not found'})

                    except Exception as e:
                        failed.append({'path': path, 'error': str(e)})

            # if nothing was compressed delete the empty zip and return error
            if files_compressed == 0:
                os.remove(zip_file_path)
                return Response(
                    {
                        'error':  'No valid files found to compress',
                        'failed': failed
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # get zip file size
            zip_size       = os.path.getsize(zip_file_path)
            zip_relative   = os.path.join(destination, f'{zip_name}.zip') if destination else f'{zip_name}.zip'

            return Response(
                {
                    'message':          'Archive created successfully',
                    'zip_path':         zip_relative,
                    'zip_size_readable': self.get_readable_size(zip_size),
                    'files_compressed': files_compressed,
                    'failed':           failed
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            # clean up partial zip if something went wrong
            if os.path.exists(zip_file_path):
                os.remove(zip_file_path)
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )    

class MixedShareAPIView(BaseFileAPIView):
    """Generate shareable links for multiple files and folders."""

    @extend_schema(
        summary="Generate shareable links for multiple files and folders",
        description="""
        Generates secure shareable links for multiple files and folders in a single request.
        
        **View control:**
        Set is_viewable to true to serve files inline in the browser.
        Set is_viewable to false to force a download prompt.
        Folders are always downloaded as zip — is_viewable is ignored for folders.
        
        **Viewable file types:**
        Images (jpg, jpeg, png, gif, bmp, webp, svg), PDF, txt, csv, mp4, webm, mp3, wav.
        
        **Example:**
        ```json
        {
            "paths": [
                "invoices/2024/sales.csv",
                "invoices/2025/",
                "reports/annual.pdf"
            ],
            "expires_in": 24,
            "max_access": 5,
            "is_viewable": true
        }
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'paths': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'List of relative paths of files and folders to share.',
                        'example': [
                            'invoices/2024/sales.csv',
                            'invoices/2025/',
                            'reports/annual.pdf'
                        ]
                    },
                    'expires_in': {
                        'type': 'integer',
                        'description': 'Hours until all links expire. Leave empty for no expiry.',
                        'example': 24
                    },
                    'max_access': {
                        'type': 'integer',
                        'description': 'Maximum accesses per link. Leave empty for unlimited.',
                        'example': 5
                    },
                    'is_viewable': {
                        'type': 'boolean',
                        'description': 'True to serve files inline in browser. False to force download. Ignored for folders.',
                        'example': True
                    }
                },
                'required': ['paths']
            }
        },
        responses={
            201: OpenApiResponse(
                description="Share links generated successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'example': '3 link(s) generated successfully, 0 failed'
                        },
                        'shared': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'path':        {'type': 'string'},
                                    'type':        {'type': 'string', 'example': 'file'},
                                    'is_viewable': {'type': 'boolean', 'example': True},
                                    'token':       {'type': 'string'},
                                    'share_url':   {'type': 'string'},
                                    'expires_at':  {'type': 'string'},
                                    'max_access':  {'type': 'integer'}
                                }
                            }
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
            ),
            400: OpenApiResponse(
                description="Missing paths or no valid items found",
                response={
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'paths is required and cannot be empty'}
                    }
                }
            )
        }
    )
    def post(self, request):
        """Generate shareable links for multiple files and folders."""
        media_path  = self.get_user_media_path(request)
        paths       = request.data.get('paths')
        expires_in  = request.data.get('expires_in')
        max_access  = request.data.get('max_access')
        is_viewable = request.data.get('is_viewable', False)

        if not paths:
            return Response(
                {'error': 'paths is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        paths = [self.sanitize_path(p) for p in paths]
        paths = [p for p in paths if p is not None]

        if not paths:
            return Response(
                {'error': 'No valid paths provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        expires_at = None
        if expires_in:
            expires_at = timezone.now() + timezone.timedelta(hours=int(expires_in))

        shared = []
        failed = []

        for path in paths:
            absolute_path = os.path.join(media_path, path)

            try:
                if os.path.isfile(absolute_path):
                    item_type = 'file'

                    # check if the file type actually supports viewing
                    # if is_viewable is True but file type is not supported
                    # force it to False silently
                    effective_viewable = is_viewable and self.is_file_viewable(absolute_path)

                elif os.path.isdir(absolute_path):
                    item_type          = 'folder'
                    effective_viewable = False   # folders are never viewable

                else:
                    failed.append({'path': path, 'error': 'File or folder not found'})
                    continue

                share = SharedFile.objects.create(
                    file_path   = path,
                    expires_at  = expires_at,
                    max_access  = max_access,
                    created_by  = request.user,
                    item_type   = item_type,
                    is_viewable = effective_viewable
                )

                share_url = request.build_absolute_uri(
                    f'/api/files/shared/{share.token}/'
                )

                shared.append({
                    'path':        path,
                    'type':        item_type,
                    'is_viewable': effective_viewable,
                    'token':       str(share.token),
                    'share_url':   share_url,
                    'expires_at':  expires_at,
                    'max_access':  max_access
                })

            except Exception as e:
                failed.append({'path': path, 'error': str(e)})

        if not shared:
            return Response(
                {
                    'error':  'No share links could be generated',
                    'failed': failed
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                'message': f'{len(shared)} link(s) generated successfully, {len(failed)} failed',
                'shared':  shared,
                'failed':  failed
            },
            status=status.HTTP_201_CREATED
        )
        """Generate shareable links for multiple files and folders."""
        media_path = self.get_user_media_path(request)
        paths      = request.data.get('paths')
        expires_in = request.data.get('expires_in')
        max_access = request.data.get('max_access')

        # validate paths provided
        if not paths:
            return Response(
                {'error': 'paths is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # sanitize all paths
        paths = [self.sanitize_path(p) for p in paths]
        paths = [p for p in paths if p is not None]

        if not paths:
            return Response(
                {'error': 'No valid paths provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # calculate expiry if provided
        expires_at = None
        if expires_in:
            expires_at = timezone.now() + timezone.timedelta(hours=int(expires_in))

        shared = []
        failed = []

        for path in paths:
            absolute_path = os.path.join(media_path, path)

            try:
                if os.path.isfile(absolute_path):
                    item_type = 'file'

                elif os.path.isdir(absolute_path):
                    item_type = 'folder'

                else:
                    failed.append({'path': path, 'error': 'File or folder not found'})
                    continue

                # create share record
                share = SharedFile.objects.create(
                    file_path  = path,
                    expires_at = expires_at,
                    max_access = max_access,
                    created_by = request.user,
                    item_type  = item_type    # ← new field on SharedFile model
                )

                share_url = request.build_absolute_uri(
                    f'/api/files/shared/{share.token}/'
                )

                shared.append({
                    'path':       path,
                    'type':       item_type,
                    'token':      str(share.token),
                    'share_url':  share_url,
                    'expires_at': expires_at,
                    'max_access': max_access
                })

            except Exception as e:
                failed.append({'path': path, 'error': str(e)})

        if not shared:
            return Response(
                {
                    'error':  'No share links could be generated',
                    'failed': failed
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                'message': f'{len(shared)} link(s) generated successfully, {len(failed)} failed',
                'shared':  shared,
                'failed':  failed
            },
            status=status.HTTP_201_CREATED
        )

class SharedItemsListAPIView(BaseFileAPIView):
    """List all active shared items for the logged in user."""

    @extend_schema(
        summary="List all shared items",
        description="""
        Returns all active share links created by the logged in user.
        
        **Filtering options:**
        - type=file     → only show shared files
        - type=folder   → only show shared folders
        - status=active → only show valid, non-expired links (default)
        - status=all    → show everything including expired and revoked
        
        **Example:**
        GET /api/files/shared-items/
    GET /api/files/shared-items/?type=file
    GET /api/files/shared-items/?type=folder
    GET /api/files/shared-items/?status=all
    GET /api/files/shared-items/?type=file&status=active
    """,
        parameters=[
            OpenApiParameter(
                name='type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by item type. Leave empty to return all.',
                required=False,
                enum=['file', 'folder'],
                examples=[
                    OpenApiExample('Files only',   value='file'),
                    OpenApiExample('Folders only', value='folder'),
                ]
            ),
            OpenApiParameter(
                name='status',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by link status. Defaults to active.',
                required=False,
                enum=['active', 'all'],
                examples=[
                    OpenApiExample('Active only', value='active'),
                    OpenApiExample('All',         value='all'),
                ]
            ),
        ],
        responses={
            200: OpenApiResponse(
                description="Shared items returned successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'total': {
                            'type': 'integer',
                            'description': 'Total number of shared items returned',
                            'example': 3
                        },
                        'items': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'token':        {'type': 'string',  'example': 'uuid'},
                                    'share_url':    {'type': 'string',  'example': 'http://yourdomain.com/api/files/shared/uuid/'},
                                    'file_path':    {'type': 'string',  'example': 'invoices/2024/sales.csv'},
                                    'type':         {'type': 'string',  'example': 'file'},
                                    'is_viewable':  {'type': 'boolean', 'example': True},
                                    'is_active':    {'type': 'boolean', 'example': True},
                                    'access_count': {'type': 'integer', 'example': 3},
                                    'max_access':   {'type': 'integer', 'example': 5, 'nullable': True},
                                    'expires_at':   {'type': 'string',  'example': '2024-01-16T10:30:00Z', 'nullable': True},
                                    'created_at':   {'type': 'string',  'example': '2024-01-15T10:30:00Z'},
                                    'is_expired':   {'type': 'boolean', 'example': False},
                                    'accesses_remaining': {'type': 'integer', 'example': 2, 'nullable': True}
                                }
                            }
                        }
                    }
                }
            )
        }
    )
    def get(self, request):
        """Get all shared items for the logged in user."""
        item_type   = request.query_params.get('type', '')
        show_status = request.query_params.get('status', 'active')

        # base queryset — only the logged in user's shares
        queryset = SharedFile.objects.filter(created_by=request.user)

        # filter by type if provided
        if item_type in ['file', 'folder']:
            queryset = queryset.filter(item_type=item_type)

        # filter by status
        if show_status == 'active':
            queryset = queryset.filter(is_active=True)

        # order by most recently created
        queryset = queryset.order_by('-id')

        items = []
        for share in queryset:

            # check if expired
            is_expired = (
                share.expires_at is not None and
                timezone.now() > share.expires_at
            )

            # calculate remaining accesses
            accesses_remaining = None
            if share.max_access is not None:
                accesses_remaining = max(0, share.max_access - share.access_count)

            share_url = request.build_absolute_uri(
                f'/api/files/shared/{share.token}/'
            )

            items.append({
                'token':              str(share.token),
                'share_url':          share_url,
                'file_path':          share.file_path,
                'type':               share.item_type,
                'is_viewable':        share.is_viewable,
                'is_active':          share.is_active,
                'access_count':       share.access_count,
                'max_access':         share.max_access,
                'accesses_remaining': accesses_remaining,
                'expires_at':         share.expires_at,
                'is_expired':         is_expired,
                'created_at':         share.created_at if hasattr(share, 'created_at') else None
            })

        return Response({
            'total': len(items),
            'items': items
        })

class TrashAPIView(BaseFileAPIView):
    """Move items to trash, list trash, and empty trash."""

    def get_user_trash_path(self, request):
        """Build and return the user's trash folder path."""
        trash_folder = os.path.join(
            self.get_user_media_path(request),
            '.trash'
        )
        os.makedirs(trash_folder, exist_ok=True)
        return trash_folder

    def calculate_size(self, absolute_path):
        """Calculate size of a file or folder."""
        if os.path.isfile(absolute_path):
            return os.path.getsize(absolute_path)
        total = 0
        for dirpath, dirnames, filenames in os.walk(absolute_path):
            for filename in filenames:
                total += os.path.getsize(os.path.join(dirpath, filename))
        return total

    @extend_schema(
        summary="List all trashed items",
        description="""
        Returns all items currently in the user's trash.
        
        **Example response:**
    ```json
        {
            "total": 2,
            "total_size_readable": "1.2 MB",
            "items": [
                {
                    "id": 1,
                    "item_name": "sales.csv",
                    "original_path": "invoices/2024/sales.csv",
                    "type": "file",
                    "size_readable": "200.0 KB",
                    "trashed_at": "2024-01-15 10:30:00"
                }
            ]
        }
    ```
        """,
        responses={
            200: OpenApiResponse(
                description="Trashed items returned successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'total': {
                            'type': 'integer',
                            'example': 2
                        },
                        'total_size_readable': {
                            'type': 'string',
                            'example': '1.2 MB'
                        },
                        'items': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'id':            {'type': 'integer', 'example': 1},
                                    'item_name':     {'type': 'string',  'example': 'sales.csv'},
                                    'original_path': {'type': 'string',  'example': 'invoices/2024/sales.csv'},
                                    'type':          {'type': 'string',  'example': 'file'},
                                    'size_bytes':    {'type': 'integer', 'example': 204800},
                                    'size_readable': {'type': 'string',  'example': '200.0 KB'},
                                    'trashed_at':    {'type': 'string',  'example': '2024-01-15 10:30:00'}
                                }
                            }
                        }
                    }
                }
            )
        }
    )
    def get(self, request):
        """List all trashed items."""
        trashed_items = TrashedItem.objects.filter(user=request.user)
        total_size    = sum(item.size_bytes for item in trashed_items)

        items = [
            {
                'id':            item.id,
                'item_name':     item.item_name,
                'original_path': item.original_path,
                'trash_path':    item.trash_path,
                'type':          item.item_type,
                'size_bytes':    item.size_bytes,
                'size_readable': self.get_readable_size(item.size_bytes),
                'trashed_at':    str(item.trashed_at)
            }
            for item in trashed_items
        ]

        return Response({
            'total':              len(items),
            'total_size_bytes':   total_size,
            'total_size_readable': self.get_readable_size(total_size),
            'items':              items
        })

    @extend_schema(
        summary="Move items to trash",
        description="""
        Moves multiple files and folders to the trash.
        Items can be restored later or permanently deleted.
        
        **Example:**
    ```json
        {
            "paths": [
                "invoices/2024/sales.csv",
                "reports/"
            ]
        }
    ```
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'paths': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'List of relative paths to move to trash.',
                        'example': ['invoices/2024/sales.csv', 'reports/']
                    }
                },
                'required': ['paths']
            }
        },
        responses={
            200: OpenApiResponse(
                description="Items moved to trash",
                response={
                    'type': 'object',
                    'properties': {
                        'message':  {'type': 'string', 'example': '2 item(s) moved to trash, 0 failed'},
                        'trashed':  {'type': 'array', 'items': {'type': 'string'}},
                        'failed':   {'type': 'array', 'items': {'type': 'object'}}
                    }
                }
            ),
            400: OpenApiResponse(description="Missing or invalid paths")
        }
    )
    def post(self, request):
        """Move items to trash."""
        media_path = self.get_user_media_path(request)
        trash_path = self.get_user_trash_path(request)
        paths      = request.data.get('paths')

        if not paths:
            return Response(
                {'error': 'paths is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        paths = [self.sanitize_path(p) for p in paths]
        paths = [p for p in paths if p is not None]

        if not paths:
            return Response(
                {'error': 'No valid paths provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        trashed = []
        failed  = []

        for path in paths:
            absolute_source = os.path.join(media_path, path)

            try:
                if not os.path.exists(absolute_source):
                    failed.append({'path': path, 'error': 'File or folder not found'})
                    continue

                # determine type and size
                item_type  = 'file' if os.path.isfile(absolute_source) else 'folder'
                item_name  = os.path.basename(absolute_source.rstrip(os.sep))
                size_bytes = self.calculate_size(absolute_source)

                # build destination path inside trash
                absolute_trash_destination = os.path.join(trash_path, path)

                # create parent folders inside trash if needed
                os.makedirs(
                    os.path.dirname(absolute_trash_destination)
                    if item_type == 'file'
                    else os.path.dirname(absolute_trash_destination.rstrip(os.sep)),
                    exist_ok=True
                )

                # if something already exists in trash at this path — remove it first
                if os.path.exists(absolute_trash_destination):
                    if os.path.isfile(absolute_trash_destination):
                        os.remove(absolute_trash_destination)
                    else:
                        shutil.rmtree(absolute_trash_destination)

                    # also remove the old database record
                    TrashedItem.objects.filter(
                        user=request.user,
                        original_path=path
                    ).delete()

                # move to trash
                shutil.move(absolute_source, absolute_trash_destination)

                # create database record
                TrashedItem.objects.create(
                    user          = request.user,
                    original_path = path,
                    trash_path    = path,   # relative to .trash folder
                    item_type     = item_type,
                    item_name     = item_name,
                    size_bytes    = size_bytes
                )

                trashed.append(path)

            except Exception as e:
                failed.append({'path': path, 'error': str(e)})

        return Response(
            {
                'message': f'{len(trashed)} item(s) moved to trash, {len(failed)} failed',
                'trashed': trashed,
                'failed':  failed
            },
            status=status.HTTP_200_OK if trashed else status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        summary="Empty trash",
        description="Permanently deletes everything in the user's trash. This action cannot be undone.",
        responses={
            200: OpenApiResponse(description="Trash emptied successfully"),
            400: OpenApiResponse(description="Error emptying trash")
        }
    )
    def delete(self, request):
        """Empty trash — permanently delete everything."""
        trash_path = self.get_user_trash_path(request)

        try:
            # delete all files inside trash folder
            for item in os.listdir(trash_path):
                item_path = os.path.join(trash_path, item)
                if os.path.isfile(item_path):
                    os.remove(item_path)
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)

            # delete all database records
            deleted_count = TrashedItem.objects.filter(user=request.user).delete()[0]

            return Response({
                'message': f'Trash emptied successfully. {deleted_count} item(s) permanently deleted.'
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class TrashRestoreAPIView(BaseFileAPIView):
    """Restore items from trash."""

    @extend_schema(
        summary="Restore items from trash",
        description="""
        Restores one or more items from trash back to their original locations.
        If the original location no longer exists it will be recreated automatically.
        If a file with the same name already exists at the original location,
        a timestamp is appended to the restored filename to avoid overwriting.
        
        **Example:**
    ```json
        {
            "ids": [1, 2, 3]
        }
    ```
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'ids': {
                        'type': 'array',
                        'items': {'type': 'integer'},
                        'description': 'List of TrashedItem IDs to restore.',
                        'example': [1, 2, 3]
                    }
                },
                'required': ['ids']
            }
        },
        responses={
            200: OpenApiResponse(
                description="Items restored successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'message':  {'type': 'string', 'example': '2 item(s) restored, 0 failed'},
                        'restored': {'type': 'array', 'items': {'type': 'string'}},
                        'failed':   {'type': 'array', 'items': {'type': 'object'}}
                    }
                }
            ),
            400: OpenApiResponse(description="Missing or invalid IDs")
        }
    )
    def post(self, request):
        """Restore items from trash."""
        media_path = self.get_user_media_path(request)
        trash_path = os.path.join(media_path, '.trash')
        ids        = request.data.get('ids')

        if not ids:
            return Response(
                {'error': 'ids is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        restored = []
        failed   = []

        for item_id in ids:
            try:
                # get the trashed item record — must belong to this user
                trashed_item = TrashedItem.objects.get(
                    id   = item_id,
                    user = request.user
                )

                absolute_trash_source      = os.path.join(trash_path, trashed_item.trash_path)
                absolute_restore_destination = os.path.join(media_path, trashed_item.original_path)

                # check the file still exists in trash
                if not os.path.exists(absolute_trash_source):
                    failed.append({
                        'id':    item_id,
                        'error': 'Item no longer exists in trash'
                    })
                    trashed_item.delete()
                    continue

                # recreate parent folders at original location if needed
                parent_dir = os.path.dirname(absolute_restore_destination)
                os.makedirs(parent_dir, exist_ok=True)

                # handle name conflict at original location
                if os.path.exists(absolute_restore_destination):
                    name, ext = os.path.splitext(trashed_item.item_name)
                    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
                    new_name  = f'{name}_restored_{timestamp}{ext}'
                    absolute_restore_destination = os.path.join(parent_dir, new_name)

                # move back to original location
                shutil.move(absolute_trash_source, absolute_restore_destination)

                # delete the database record
                trashed_item.delete()

                restored.append(trashed_item.original_path)

            except TrashedItem.DoesNotExist:
                failed.append({'id': item_id, 'error': 'Trashed item not found'})
            except Exception as e:
                failed.append({'id': item_id, 'error': str(e)})

        return Response(
            {
                'message':  f'{len(restored)} item(s) restored, {len(failed)} failed',
                'restored': restored,
                'failed':   failed
            },
            status=status.HTTP_200_OK if restored else status.HTTP_400_BAD_REQUEST
        )

class TrashDeleteAPIView(BaseFileAPIView):
    """Permanently delete specific items from trash."""

    @extend_schema(
        summary="Permanently delete specific items from trash",
        description="""
        Permanently deletes specific items from trash by their IDs.
        This action cannot be undone.
        
        **Example:**
    ```json
        {
            "ids": [1, 2, 3]
        }
    ```
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'ids': {
                        'type': 'array',
                        'items': {'type': 'integer'},
                        'description': 'List of TrashedItem IDs to permanently delete.',
                        'example': [1, 2, 3]
                    }
                },
                'required': ['ids']
            }
        },
        responses={
            200: OpenApiResponse(
                description="Items permanently deleted",
                response={
                    'type': 'object',
                    'properties': {
                        'message': {'type': 'string', 'example': '2 item(s) permanently deleted, 0 failed'},
                        'deleted': {'type': 'array', 'items': {'type': 'string'}},
                        'failed':  {'type': 'array', 'items': {'type': 'object'}}
                    }
                }
            ),
            400: OpenApiResponse(description="Missing or invalid IDs")
        }
    )
    def delete(self, request):
        """Permanently delete specific items from trash."""
        media_path = self.get_user_media_path(request)
        trash_path = os.path.join(media_path, '.trash')
        ids        = request.data.get('ids')

        if not ids:
            return Response(
                {'error': 'ids is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        deleted = []
        failed  = []

        for item_id in ids:
            try:
                trashed_item          = TrashedItem.objects.get(
                    id   = item_id,
                    user = request.user
                )
                absolute_trash_source = os.path.join(trash_path, trashed_item.trash_path)

                # delete from disk
                if os.path.exists(absolute_trash_source):
                    if os.path.isfile(absolute_trash_source):
                        os.remove(absolute_trash_source)
                    else:
                        shutil.rmtree(absolute_trash_source)

                # delete database record
                item_name = trashed_item.item_name
                trashed_item.delete()
                deleted.append(item_name)

            except TrashedItem.DoesNotExist:
                failed.append({'id': item_id, 'error': 'Trashed item not found'})
            except Exception as e:
                failed.append({'id': item_id, 'error': str(e)})

        return Response(
            {
                'message': f'{len(deleted)} item(s) permanently deleted, {len(failed)} failed',
                'deleted': deleted,
                'failed':  failed
            },
            status=status.HTTP_200_OK if deleted else status.HTTP_400_BAD_REQUEST
        )

class FavoritesAPIView(BaseFileAPIView):
    """Add, remove, and list favorite files and folders."""

    @extend_schema(
        summary="List all favorites",
        description="""
        Returns all favorited files and folders for the logged in user.
        Also checks if each item still exists on disk.
        
        **Example response:**
    ```json
        {
            "total": 2,
            "items": [
                {
                    "id": 1,
                    "path": "invoices/2024/sales.csv",
                    "item_name": "sales.csv",
                    "type": "file",
                    "exists": true,
                    "added_at": "2024-01-15 10:30:00"
                }
            ]
        }
    ```
        """,
        responses={
            200: OpenApiResponse(
                description="Favorites returned successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'total': {'type': 'integer', 'example': 2},
                        'items': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'id':        {'type': 'integer', 'example': 1},
                                    'path':      {'type': 'string',  'example': 'invoices/2024/sales.csv'},
                                    'item_name': {'type': 'string',  'example': 'sales.csv'},
                                    'type':      {'type': 'string',  'example': 'file'},
                                    'exists':    {'type': 'boolean', 'example': True},
                                    'added_at':  {'type': 'string',  'example': '2024-01-15 10:30:00'}
                                }
                            }
                        }
                    }
                }
            )
        }
    )
    def get(self, request):
        """List all favorites."""
        media_path = self.get_user_media_path(request)
        favorites  = FavoriteItem.objects.filter(user=request.user)

        items = []
        for fav in favorites:
            absolute_path = os.path.join(media_path, fav.path)
            
            # Get file/folder size
            size_bytes = 0
            if os.path.exists(absolute_path):
                if fav.item_type == 'file':
                    try:
                        size_bytes = os.path.getsize(absolute_path)
                    except (OSError, IOError):
                        size_bytes = 0
                elif fav.item_type == 'folder':
                    try:
                        size_bytes = self._get_folder_size(absolute_path)
                    except (OSError, IOError):
                        size_bytes = 0
            
            items.append({
                'id':        fav.id,
                'path':      fav.path,
                'item_name': fav.item_name,
                'type':      fav.item_type,
                'exists':    os.path.exists(absolute_path),  # check if still on disk
                'added_at':  str(fav.added_at),
                'size_bytes': size_bytes
            })

        return Response({
            'total': len(items),
            'items': items
        })

    @extend_schema(
        summary="Add items to favorites",
        description="""
        Adds one or more files or folders to favorites.
        Duplicates are ignored — adding an already favorited item does nothing.
        
        **Example:**
    ```json
        {
            "paths": [
                "invoices/2024/sales.csv",
                "reports/"
            ]
        }
    ```
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'paths': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'List of relative paths to add to favorites.',
                        'example': ['invoices/2024/sales.csv', 'reports/']
                    }
                },
                'required': ['paths']
            }
        },
        responses={
            200: OpenApiResponse(
                description="Items added to favorites",
                response={
                    'type': 'object',
                    'properties': {
                        'message':  {'type': 'string', 'example': '2 item(s) added to favorites, 0 failed'},
                        'added':    {'type': 'array', 'items': {'type': 'string'}},
                        'skipped':  {'type': 'array', 'items': {'type': 'string'},
                                     'description': 'Already in favorites'},
                        'failed':   {'type': 'array', 'items': {'type': 'object'}}
                    }
                }
            ),
            400: OpenApiResponse(description="Missing or invalid paths")
        }
    )
    def post(self, request):
        """Add items to favorites."""
        media_path = self.get_user_media_path(request)
        paths      = request.data.get('paths')

        if not paths:
            return Response(
                {'error': 'paths is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        paths = [self.sanitize_path(p) for p in paths]
        paths = [p for p in paths if p is not None]

        if not paths:
            return Response(
                {'error': 'No valid paths provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        added   = []
        skipped = []
        failed  = []

        for path in paths:
            absolute_path = os.path.join(media_path, path)

            try:
                # check item exists on disk
                if not os.path.exists(absolute_path):
                    failed.append({'path': path, 'error': 'File or folder not found'})
                    continue

                item_name = os.path.basename(absolute_path.rstrip(os.sep))
                item_type = 'file' if os.path.isfile(absolute_path) else 'folder'

                # get_or_create prevents duplicates
                favorite, created = FavoriteItem.objects.get_or_create(
                    user = request.user,
                    path = path,
                    defaults = {
                        'item_name': item_name,
                        'item_type': item_type
                    }
                )

                if created:
                    added.append(path)
                else:
                    skipped.append(path)   # already in favorites

            except Exception as e:
                failed.append({'path': path, 'error': str(e)})

        return Response(
            {
                'message': f'{len(added)} item(s) added to favorites, {len(failed)} failed',
                'added':   added,
                'skipped': skipped,
                'failed':  failed
            },
            status=status.HTTP_200_OK
        )

    @extend_schema(
        summary="Remove items from favorites",
        description="""
        Removes one or more items from favorites by their IDs.
        The actual files and folders are NOT deleted — only the favorite record is removed.
        
        **Example:**
    ```json
        {
            "ids": [1, 2, 3]
        }
    ```
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'ids': {
                        'type': 'array',
                        'items': {'type': 'integer'},
                        'description': 'List of FavoriteItem IDs to remove.',
                        'example': [1, 2, 3]
                    }
                },
                'required': ['ids']
            }
        },
        responses={
            200: OpenApiResponse(
                description="Items removed from favorites",
                response={
                    'type': 'object',
                    'properties': {
                        'message': {'type': 'string', 'example': '2 item(s) removed from favorites, 0 failed'},
                        'removed': {'type': 'array', 'items': {'type': 'string'}},
                        'failed':  {'type': 'array', 'items': {'type': 'object'}}
                    }
                }
            ),
            400: OpenApiResponse(description="Missing or invalid IDs")
        }
    )
    def delete(self, request):
        """Remove items from favorites."""
        ids = request.data.get('ids')

        if not ids:
            return Response(
                {'error': 'ids is required and cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        removed = []
        failed  = []

        for item_id in ids:
            try:
                favorite = FavoriteItem.objects.get(
                    id   = item_id,
                    user = request.user
                )
                item_name = favorite.item_name
                favorite.delete()
                removed.append(item_name)

            except FavoriteItem.DoesNotExist:
                failed.append({'id': item_id, 'error': 'Favorite not found'})
            except Exception as e:
                failed.append({'id': item_id, 'error': str(e)})

        return Response(
            {
                'message': f'{len(removed)} item(s) removed from favorites, {len(failed)} failed',
                'removed': removed,
                'failed':  failed
            },
            status=status.HTTP_200_OK if removed else status.HTTP_400_BAD_REQUEST
        )