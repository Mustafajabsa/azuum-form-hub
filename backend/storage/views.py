from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django_ratelimit.decorators import ratelimit
from config.rate_limits import rate_limit_upload, rate_limit_standard
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import zipfile
import tarfile
import tempfile
import mimetypes
import os

# Custom decorator to bypass CSRF for API endpoints
def csrf_exempt_api(view):
    """Custom decorator to bypass CSRF for API endpoints while maintaining auth"""
    def wrapped_view(request, *args, **kwargs):
        # Bypass CSRF for API requests with valid JWT
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return csrf_exempt(view)(request, *args, **kwargs)
        return view(request, *args, **kwargs)
    return wrapped_view

from .models import Folder, File, FileShare, UserActivity
from .serializers import (
    FolderSerializer, FileSerializer, FileCreateSerializer, 
    FileShareSerializer, UserActivitySerializer, FolderTreeSerializer
)
from .permissions import IsOwnerOrReadOnly


@csrf_exempt
@rate_limit_upload(rate='50/h')
def file_upload_view(request):
    """Direct file upload endpoint - simplified version"""
    # Use the same authentication pattern as ViewSet
    from rest_framework.permissions import IsAuthenticated
    from rest_framework.decorators import authentication_classes, permission_classes
    
    # Check authentication
    if not request.user.is_authenticated:
        return JsonResponse(
            {'error': 'Authentication required'}, 
            status=401
        )
    
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
        folder, _ = Folder.objects.get_or_create(
                name='Root',
                owner=request.user,
                parent=None
            )
    
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


@csrf_exempt
@rate_limit_upload(rate='50/h')
def folder_upload_view(request):
    """Folder upload endpoint for zip/tar files"""
    # Manual JWT authentication for CSRF-exempt view
    try:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        jwt_auth = JWTAuthentication()
        auth_result = jwt_auth.authenticate(request)
        if auth_result is None:
            return JsonResponse(
                {'error': 'Authentication required'}, 
                status=401
            )
        request.user = auth_result[0]
    except Exception as e:
        return JsonResponse(
            {'error': f'Authentication error: {str(e)}'}, 
            status=401
        )
    
    if not request.FILES.get('folder'):
        return JsonResponse(
            {'error': 'No folder file provided'}, 
            status=400
        )
    
    uploaded_folder = request.FILES['folder']
    parent_folder_id = request.POST.get('parent_folder_id')
    folder_name = request.POST.get('folder_name', uploaded_folder.name)
    
    # Get parent folder
    parent_folder = None
    if parent_folder_id:
        parent_folder = get_object_or_404(Folder, id=parent_folder_id, owner=request.user)
    
    # Create main folder
    main_folder = Folder.objects.create(
        name=folder_name.replace('.zip', '').replace('.tar', '').replace('.tar.gz', ''),
        parent=parent_folder,
        owner=request.user
    )
    
    try:
        # Handle different archive types
        if uploaded_folder.name.endswith('.zip'):
            files_created = _extract_zip(uploaded_folder, main_folder, request.user)
        elif uploaded_folder.name.endswith(('.tar', '.tar.gz', '.tgz')):
            files_created = _extract_tar(uploaded_folder, main_folder, request.user)
        else:
            main_folder.delete()
            return JsonResponse(
                {'error': 'Unsupported file format. Only ZIP and TAR files are supported'}, 
                status=400
            )
        
        # Log activity
        UserActivity.objects.create(
            user=request.user,
            action='upload_folder',
            object_type='folder',
            object_id=main_folder.id,
            details={
                'folder_name': main_folder.name,
                'files_count': len(files_created),
                'original_filename': uploaded_folder.name
            }
        )
        
        return JsonResponse({
            'id': str(main_folder.id),
            'name': main_folder.name,
            'files_count': len(files_created),
            'message': f'Folder uploaded successfully with {len(files_created)} files'
        })
        
    except Exception as e:
        # Cleanup on error
        main_folder.delete()
        return JsonResponse(
            {'error': f'Failed to extract folder: {str(e)}'}, 
            status=500
        )


def _extract_zip(uploaded_file, parent_folder, user):
    """Extract ZIP file and create file records"""
    files_created = []
    
    with zipfile.ZipFile(uploaded_file, 'r') as zip_ref:
        for file_info in zip_ref.infolist():
            if file_info.is_dir():
                # Create subfolder
                folder_path = file_info.filename.rstrip('/')
                folder_name = folder_path.split('/')[-1]
                
                # Create nested folder structure
                current_parent = parent_folder
                for part in folder_path.split('/'):
                    if part:
                        folder, created = Folder.objects.get_or_create(
                            name=part,
                            parent=current_parent,
                            owner=user,
                            defaults={'is_deleted': False}
                        )
                        current_parent = folder
            else:
                # Create file
                file_path = file_info.filename
                file_name = file_path.split('/')[-1]
                
                # Get folder for this file
                current_parent = parent_folder
                for part in file_path.split('/')[:-1]:
                    if part:
                        folder, _ = Folder.objects.get_or_create(
                            name=part,
                            parent=current_parent,
                            owner=user,
                            defaults={'is_deleted': False}
                        )
                        current_parent = folder
                
                # Extract file content
                file_content = zip_ref.read(file_info.filename)
                
                # Create file record
                django_file = ContentFile(file_content, file_name)
                file_obj = File.objects.create(
                    name=file_name,
                    original_name=file_name,
                    file_path=django_file,
                    file_size=len(file_content),
                    mime_type=mimetypes.guess_type(file_name)[0] or 'application/octet-stream',
                    folder=current_parent,
                    owner=user
                )
                files_created.append(file_obj)
    
    return files_created


def _extract_tar(uploaded_file, parent_folder, user):
    """Extract TAR file and create file records"""
    files_created = []
    
    with tarfile.open(fileobj=uploaded_file, mode='r:*') as tar_ref:
        for member in tar_ref.getmembers():
            if member.isdir():
                # Create subfolder
                folder_path = member.name.rstrip('/')
                folder_name = folder_path.split('/')[-1]
                
                # Create nested folder structure
                current_parent = parent_folder
                for part in folder_path.split('/'):
                    if part:
                        folder, created = Folder.objects.get_or_create(
                            name=part,
                            parent=current_parent,
                            owner=user,
                            defaults={'is_deleted': False}
                        )
                        current_parent = folder
            elif member.isfile():
                # Create file
                file_path = member.name
                file_name = file_path.split('/')[-1]
                
                # Get folder for this file
                current_parent = parent_folder
                for part in file_path.split('/')[:-1]:
                    if part:
                        folder, _ = Folder.objects.get_or_create(
                            name=part,
                            parent=current_parent,
                            owner=user,
                            defaults={'is_deleted': False}
                        )
                        current_parent = folder
                
                # Extract file content
                file_content = tar_ref.extractfile(member).read()
                
                # Create file record
                django_file = ContentFile(file_content, file_name)
                file_obj = File.objects.create(
                    name=file_name,
                    original_name=file_name,
                    file_path=django_file,
                    file_size=len(file_content),
                    mime_type=mimetypes.guess_type(file_name)[0] or 'application/octet-stream',
                    folder=current_parent,
                    owner=user
                )
                files_created.append(file_obj)
    
    return files_created


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
    
    @action(detail=True, methods=['delete'])
    def delete_folder(self, request, pk=None):
        """Delete folder with cascade delete for all contents"""
        folder = self.get_object()
        
        # Collect all files and subfolders to delete
        deleted_files = []
        deleted_folders = []
        
        def delete_folder_contents(folder_obj):
            """Recursively delete folder contents"""
            # Delete files in current folder
            files = File.objects.filter(folder=folder_obj, is_deleted=False)
            for file_obj in files:
                # Delete physical file
                if default_storage.exists(file_obj.file_path.name):
                    default_storage.delete(file_obj.file_path.name)
                
                # Log file deletion
                UserActivity.objects.create(
                    user=request.user,
                    action='delete_file',
                    object_type='file',
                    object_id=file_obj.id,
                    details={
                        'name': file_obj.name,
                        'original_name': file_obj.original_name,
                        'file_size': file_obj.file_size,
                        'deleted_via_folder': True,
                        'folder_name': folder_obj.name
                    }
                )
                
                # Mark as deleted
                file_obj.is_deleted = True
                file_obj.save()
                deleted_files.append({
                    'id': str(file_obj.id),
                    'name': file_obj.name,
                    'folder': folder_obj.name
                })
            
            # Recursively delete subfolders
            subfolders = Folder.objects.filter(parent=folder_obj, is_deleted=False)
            for subfolder in subfolders:
                delete_folder_contents(subfolder)
                subfolder.is_deleted = True
                subfolder.save()
                deleted_folders.append({
                    'id': str(subfolder.id),
                    'name': subfolder.name,
                    'parent': folder_obj.name
                })
        
        # Start cascade deletion
        delete_folder_contents(folder)
        
        # Log folder deletion
        UserActivity.objects.create(
            user=request.user,
            action='delete_folder',
            object_type='folder',
            object_id=folder.id,
            details={
                'name': folder.name,
                'files_deleted': len(deleted_files),
                'subfolders_deleted': len(deleted_folders)
            }
        )
        
        # Mark main folder as deleted
        folder.is_deleted = True
        folder.save()
        deleted_folders.append({
            'id': str(folder.id),
            'name': folder.name,
            'parent': 'Root'
        })
        
        return Response({
            'message': f'Folder "{folder.name}" deleted successfully',
            'deleted_folder': {
                'id': str(folder.id),
                'name': folder.name
            },
            'deleted_files_count': len(deleted_files),
            'deleted_folders_count': len(deleted_folders),
            'deleted_files': deleted_files[:10],  # Show first 10 for brevity
            'deleted_folders': deleted_folders[:10]   # Show first 10 for brevity
        })
    
    @action(detail=False, methods=['delete'])
    def batch_delete(self, request):
        """Delete multiple folders"""
        folder_ids = request.data.get('folder_ids', [])
        
        if not folder_ids:
            return Response(
                {'error': 'No folder IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_folders = []
        total_files_deleted = 0
        total_subfolders_deleted = 0
        errors = []
        
        for folder_id in folder_ids:
            try:
                folder = Folder.objects.get(id=folder_id, owner=request.user, is_deleted=False)
                
                # Collect deletion stats
                files_in_folder = File.objects.filter(folder=folder, is_deleted=False).count()
                subfolders_in_folder = Folder.objects.filter(parent=folder, is_deleted=False).count()
                
                # Delete folder contents (reuse the recursive function)
                def delete_contents(folder_obj):
                    files = File.objects.filter(folder=folder_obj, is_deleted=False)
                    for file_obj in files:
                        if default_storage.exists(file_obj.file_path.name):
                            default_storage.delete(file_obj.file_path.name)
                        file_obj.is_deleted = True
                        file_obj.save()
                    
                    subfolders = Folder.objects.filter(parent=folder_obj, is_deleted=False)
                    for subfolder in subfolders:
                        delete_contents(subfolder)
                        subfolder.is_deleted = True
                        subfolder.save()
                
                delete_contents(folder)
                
                # Log activity
                UserActivity.objects.create(
                    user=request.user,
                    action='delete_folder',
                    object_type='folder',
                    object_id=folder.id,
                    details={
                        'name': folder.name,
                        'files_deleted': files_in_folder,
                        'subfolders_deleted': subfolders_in_folder,
                        'batch_operation': True
                    }
                )
                
                # Mark folder as deleted
                folder.is_deleted = True
                folder.save()
                
                deleted_folders.append({
                    'id': str(folder.id),
                    'name': folder.name,
                    'files_count': files_in_folder,
                    'subfolders_count': subfolders_in_folder
                })
                
                total_files_deleted += files_in_folder
                total_subfolders_deleted += subfolders_in_folder
                
            except Folder.DoesNotExist:
                errors.append(f'Folder {folder_id} not found')
            except Exception as e:
                errors.append(f'Error deleting folder {folder_id}: {str(e)}')
        
        return Response({
            'message': f'Deleted {len(deleted_folders)} folders successfully',
            'deleted_folders': deleted_folders,
            'total_files_deleted': total_files_deleted,
            'total_subfolders_deleted': total_subfolders_deleted,
            'errors': errors
        })


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
    
    @action(detail=True, methods=['delete'])
    def delete_file(self, request, pk=None):
        """Delete file with proper cleanup"""
        file_obj = self.get_object()
        
        # Delete physical file
        if default_storage.exists(file_obj.file_path.name):
            default_storage.delete(file_obj.file_path.name)
        
        # Log activity before deletion
        UserActivity.objects.create(
            user=request.user,
            action='delete_file',
            object_type='file',
            object_id=file_obj.id,
            details={
                'name': file_obj.name,
                'original_name': file_obj.original_name,
                'file_size': file_obj.file_size
            }
        )
        
        # Mark as deleted (soft delete)
        file_obj.is_deleted = True
        file_obj.save()
        
        return Response({
            'message': 'File deleted successfully',
            'file_id': str(file_obj.id),
            'file_name': file_obj.name
        })
    
    @action(detail=False, methods=['delete'])
    def batch_delete(self, request):
        """Delete multiple files"""
        file_ids = request.data.get('file_ids', [])
        
        if not file_ids:
            return Response(
                {'error': 'No file IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_files = []
        errors = []
        
        for file_id in file_ids:
            try:
                file_obj = File.objects.get(id=file_id, owner=request.user, is_deleted=False)
                
                # Delete physical file
                if default_storage.exists(file_obj.file_path.name):
                    default_storage.delete(file_obj.file_path.name)
                
                # Log activity
                UserActivity.objects.create(
                    user=request.user,
                    action='delete_file',
                    object_type='file',
                    object_id=file_obj.id,
                    details={
                        'name': file_obj.name,
                        'original_name': file_obj.original_name,
                        'file_size': file_obj.file_size
                    }
                )
                
                # Mark as deleted
                file_obj.is_deleted = True
                file_obj.save()
                
                deleted_files.append({
                    'id': str(file_obj.id),
                    'name': file_obj.name
                })
                
            except File.DoesNotExist:
                errors.append(f'File {file_id} not found')
            except Exception as e:
                errors.append(f'Error deleting file {file_id}: {str(e)}')
        
        return Response({
            'message': f'Deleted {len(deleted_files)} files successfully',
            'deleted_files': deleted_files,
            'errors': errors
        })


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
