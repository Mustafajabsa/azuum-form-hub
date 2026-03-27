from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from django.http import JsonResponse, HttpResponse
from django_ratelimit.decorators import ratelimit
from config.rate_limits import rate_limit_upload, rate_limit_standard
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.utils.decorators import method_decorator
import mimetypes
import os

from .models import Folder, File, FileShare, UserActivity
from .serializers import (
    FolderSerializer, FileSerializer, FileCreateSerializer, 
    FileShareSerializer, UserActivitySerializer, FolderTreeSerializer
)
from .permissions import IsOwnerOrReadOnly


class FileUploadView(generics.CreateAPIView):
    """File upload view with proper authentication"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, *args, **kwargs):
        """Handle file upload"""
        if not request.FILES.get('file'):
            return JsonResponse(
                {'error': 'No file provided'}, 
                status=400
            )
        
        uploaded_file = request.FILES['file']
        folder_id = request.POST.get('folder_id')
        
        # Get or create folder
        if folder_id:
            folder = get_object_or_404(Folder, id=folder_id, owner=request.user)
        else:
            folder = None
        
        # Create file record
        file_obj = File.objects.create(
            name=uploaded_file.name,
            original_name=uploaded_file.name,
            file_path=uploaded_file,
            file_size=uploaded_file.size,
            mime_type=uploaded_file.content_type or 'application/octet-stream',
            folder=folder,
            owner=request.user
        )
        
        # Log activity
        UserActivity.objects.create(
            user=request.user,
            action='upload_file',
            object_type='file',
            object_id=file_obj.id,
            details={
                'name': file_obj.name,
                'size': file_obj.file_size,
                'mime_type': file_obj.mime_type
            }
        )
        
        return JsonResponse({
            'id': str(file_obj.id),
            'name': file_obj.name,
            'size': file_obj.file_size,
            'message': 'File uploaded successfully'
        })


class FolderViewSet(viewsets.ModelViewSet):
    """ViewSet for folder operations"""
    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filterset_fields = ['name', 'parent']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        """Return folders for current user"""
        return Folder.objects.filter(owner=self.request.user, is_deleted=False)
    
    def perform_create(self, serializer):
        """Set owner on folder creation"""
        serializer.save(owner=self.request.user)
        
        # Log activity
        UserActivity.objects.create(
            user=self.request.user,
            action='create_folder',
            object_type='folder',
            object_id=serializer.instance.id,
            details={'name': serializer.instance.name}
        )
    
    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Share folder with another user"""
        folder = self.get_object()
        email = request.data.get('email')
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            target_user = User.objects.get(email=email)
            
            # Create share (folder-level sharing logic would go here)
            return Response({'message': f'Folder shared with {email}'})
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move folder to another parent"""
        folder = self.get_object()
        new_parent_id = request.data.get('parent_id')
        
        if new_parent_id:
            new_parent = get_object_or_404(Folder, id=new_parent_id, owner=request.user)
            folder.parent = new_parent
        else:
            folder.parent = None
            
        folder.save()
        
        UserActivity.objects.create(
            user=request.user,
            action='move_folder',
            object_type='folder',
            object_id=folder.id,
            details={'new_parent': new_parent_id}
        )
        
        return Response({'message': 'Folder moved successfully'})
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download folder as ZIP"""
        folder = self.get_object()
        
        # Import zipfile for creating ZIP archive
        import zipfile
        import tempfile
        from pathlib import Path
        
        # Log activity
        UserActivity.objects.create(
            user=request.user,
            action='download_folder',
            object_type='folder',
            object_id=folder.id,
            details={'name': folder.name}
        )
        
        # Create temporary ZIP file
        temp_file = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
        temp_path = temp_file.name
        
        try:
            with zipfile.ZipFile(temp_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Add files from this folder and subfolders
                def add_folder_to_zip(current_folder, zip_path=''):
                    # Add files in current folder
                    files = File.objects.filter(
                        owner=request.user, 
                        folder=current_folder, 
                        is_deleted=False
                    )
                    
                    for file in files:
                        if file.file_path and os.path.exists(file.file_path.path):
                            # Calculate relative path for ZIP
                            file_zip_path = os.path.join(zip_path, file.name)
                            zip_file.write(file.file_path.path, file_zip_path)
                    
                    # Recursively add subfolders
                    subfolders = Folder.objects.filter(
                        owner=request.user, 
                        parent=current_folder
                    )
                    
                    for subfolder in subfolders:
                        subfolder_zip_path = os.path.join(zip_path, subfolder.name)
                        add_folder_to_zip(subfolder, subfolder_zip_path)
                
                # Start with the current folder
                folder_zip_path = folder.name
                add_folder_to_zip(folder, folder_zip_path)
            
            # Read the ZIP file and return it
            with open(temp_path, 'rb') as f:
                zip_data = f.read()
            
            response = HttpResponse(
                zip_data,
                content_type='application/zip'
            )
            response['Content-Disposition'] = f'attachment; filename="{folder.name}.zip"'
            response['Content-Length'] = len(zip_data)
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Error creating ZIP file: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except:
                pass


class FileViewSet(viewsets.ModelViewSet):
    """ViewSet for file operations"""
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filterset_fields = ['name', 'folder', 'mime_type']
    search_fields = ['name', 'original_name']
    
    def get_queryset(self):
        """Return files for current user"""
        return File.objects.filter(owner=self.request.user, is_deleted=False)
    
    def create(self, request, *args, **kwargs):
        """Handle file upload"""
        serializer = FileCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        file_obj = serializer.save()
        
        # Log activity
        UserActivity.objects.create(
            user=request.user,
            action='upload_file',
            object_type='file',
            object_id=file_obj.id,
            details={
                'name': file_obj.name,
                'size': file_obj.file_size,
                'mime_type': file_obj.mime_type
            }
        )
        
        return Response(
            FileSerializer(file_obj, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Share file with another user"""
        file_obj = self.get_object()
        email = request.data.get('email')
        can_edit = request.data.get('can_edit', False)
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            target_user = User.objects.get(email=email)
            
            FileShare.objects.create(
                file=file_obj,
                shared_with=target_user,
                shared_by=request.user,
                can_edit=can_edit
            )
            
            UserActivity.objects.create(
                user=request.user,
                action='share_file',
                object_type='file',
                object_id=file_obj.id,
                details={'shared_with': email, 'can_edit': can_edit}
            )
            
            return Response({'message': f'File shared with {email}'})
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download file"""
        file_obj = self.get_object()
        
        # Check if file exists
        if not file_obj.file_path or not os.path.exists(file_obj.file_path.path):
            return Response(
                {'error': 'File not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log activity
        UserActivity.objects.create(
            user=request.user,
            action='download_file',
            object_type='file',
            object_id=file_obj.id,
            details={
                'name': file_obj.name,
                'size': file_obj.file_size
            }
        )
        
        # Return file response
        try:
            with open(file_obj.file_path.path, 'rb') as f:
                response = HttpResponse(
                    f.read(),
                    content_type=file_obj.mime_type or 'application/octet-stream'
                )
                response['Content-Disposition'] = f'attachment; filename="{file_obj.name}"'
                response['Content-Length'] = file_obj.file_size
                return response
        except Exception as e:
            return Response(
                {'error': f'Error reading file: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move file to another folder"""
        file_obj = self.get_object()
        new_folder_id = request.data.get('folder_id')
        
        if new_folder_id:
            new_parent = get_object_or_404(Folder, id=new_parent_id, owner=request.user)
            file_obj.folder = new_parent
        else:
            file_obj.folder = None
            
        file_obj.save()
        
        UserActivity.objects.create(
            user=request.user,
            action='move_file',
            object_type='file',
            object_id=file_obj.id,
            details={'new_folder': new_folder_id}
        )
        
        return Response({'message': 'File moved successfully'})
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download file"""
        file_obj = self.get_object()
        
        if not default_storage.exists(file_obj.file_path.name):
            return Response(
                {'error': 'File not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Log download
        UserActivity.objects.create(
            user=request.user,
            action='download_file',
            object_type='file',
            object_id=file_obj.id,
            details={'name': file_obj.name}
        )
        
        # Serve file
        if default_storage.exists(file_obj.file_path.name):
            with default_storage.open(file_obj.file_path.name, 'rb') as f:
                response = HttpResponse(f.read(), content_type=file_obj.mime_type)
                response['Content-Disposition'] = f'attachment; filename="{file_obj.original_name}"'
                return response
        
        return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)


class FileShareViewSet(viewsets.ModelViewSet):
    """ViewSet for file shares"""
    serializer_class = FileShareSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return shares for current user (both shared by and shared with)"""
        user = self.request.user
        return FileShare.objects.filter(
            Q(shared_by=user) | Q(shared_with=user)
        ).select_related('file', 'shared_with', 'shared_by')
    
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke file share"""
        share = self.get_object()
        
        UserActivity.objects.create(
            user=request.user,
            action='revoke_share',
            object_type='file_share',
            object_id=share.file.id,
            details={'shared_with': share.shared_with.email}
        )
        
        share.delete()
        return Response({'message': 'Share revoked'})


class UserActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user activity logs"""
    serializer_class = UserActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return activities for current user"""
        return UserActivity.objects.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """Filter activities by type and date range"""
        queryset = self.get_queryset()
        
        # Filter by action type
        action_type = request.query_params.get('action')
        if action_type:
            queryset = queryset.filter(action=action_type)
        
        # Filter by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
