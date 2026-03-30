import mimetypes
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import Folder, File, FileShare, UserActivity
from .serializers import (
    FolderSerializer,
    FileSerializer,
    FileCreateSerializer,
    FileShareSerializer,
    UserActivitySerializer,
    FolderTreeSerializer,
)
from .permissions import IsOwnerOrReadOnly


# ---------------------------------------------------------------------------
# Helper: authenticate a request manually using JWT.
# Used in @csrf_exempt function-based views where middleware has not run.
# Returns (user, None) on success or raises ValueError with an error message.
# ---------------------------------------------------------------------------
def _jwt_authenticate(request):
    """
    Manually run JWT authentication.
    Raises ValueError with a human-readable message on failure.
    Returns the authenticated user on success.
    """
    jwt_auth = JWTAuthentication()
    try:
        result = jwt_auth.authenticate(request)
    except Exception as exc:
        raise ValueError(str(exc))
    if result is None:
        raise ValueError('Authentication credentials were not provided.')
    user, token = result
    return user


# ---------------------------------------------------------------------------
# Helper: build or get the nested folder structure from a relative path.
# e.g. "myproject/src/utils.js"  →  creates/gets  myproject → src
#                                    and returns the 'src' Folder instance.
# ---------------------------------------------------------------------------
def _get_or_create_folder_path(path_parts, owner, parent=None):
    """
    Recursively ensure all folders in path_parts exist.
    Returns the deepest Folder instance.
    """
    if not path_parts:
        return parent

    name = path_parts[0]
    folder, _ = Folder.objects.get_or_create(
        name=name,
        parent=parent,
        owner=owner,
        defaults={'is_deleted': False},
    )
    # If it existed but was soft-deleted, restore it
    if folder.is_deleted:
        folder.is_deleted = False
        folder.save(update_fields=['is_deleted'])

    return _get_or_create_folder_path(path_parts[1:], owner, parent=folder)


# ---------------------------------------------------------------------------
# Unified upload view  —  POST /api/storage/upload/
#
# Handles both flat file uploads and folder-tree uploads in one endpoint.
#
# Request (multipart/form-data):
#   files[]          — one or more files
#   relative_paths[] — one path string per file
#                      flat:   "document.pdf"
#                      folder: "myproject/src/index.js"
#   folder_id        — (optional) UUID of an existing parent folder
#
# Detection:
#   If any relative_path contains '/' → folder_tree mode
#   Otherwise → flat mode
#
# Response:
#   {
#     "mode": "flat" | "folder_tree",
#     "files_created": N,
#     "folders_created": N,
#     "root_folder_id": "<uuid>" | null,
#     "message": "Uploaded successfully"
#   }
# ---------------------------------------------------------------------------
@csrf_exempt                       # outermost — bypasses CSRF middleware
def unified_upload_view(request):  # rate limiting removed: RATELIMIT_ENABLE=False
    """
    Single endpoint for uploading files or entire folder trees.
    Authentication is handled manually via JWT so this works correctly
    as a @csrf_exempt view without relying on session middleware.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed. Use POST.'}, status=405)

    # --- 1. Authenticate -------------------------------------------------------
    try:
        user = _jwt_authenticate(request)
    except ValueError as exc:
        return JsonResponse({'error': str(exc)}, status=401)

    # --- 2. Extract payload ----------------------------------------------------
    files = request.FILES.getlist('files')
    relative_paths = request.POST.getlist('relative_paths')
    folder_id = request.POST.get('folder_id')

    # --- 3. Validate inputs ----------------------------------------------------
    if not files:
        return JsonResponse({'error': 'No files provided. Send at least one file in files[].'}, status=400)

    if not relative_paths:
        return JsonResponse({'error': 'No relative_paths provided. Send one path string per file.'}, status=400)

    if len(files) != len(relative_paths):
        return JsonResponse(
            {
                'error': (
                    f'files[] and relative_paths[] must have the same length. '
                    f'Got {len(files)} files and {len(relative_paths)} paths.'
                )
            },
            status=400,
        )

    # Validate each file against size and type settings
    max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 50 * 1024 * 1024)
    allowed_types = getattr(settings, 'ALLOWED_FILE_TYPES', [])
    for uploaded_file in files:
        if uploaded_file.size > max_size:
            return JsonResponse(
                {
                    'error': (
                        f"'{uploaded_file.name}' exceeds the maximum upload size of "
                        f"{max_size // (1024 * 1024)} MB."
                    )
                },
                status=400,
            )
        mime = (
            uploaded_file.content_type
            or mimetypes.guess_type(uploaded_file.name)[0]
            or ''
        )
        if allowed_types and mime not in allowed_types:
            return JsonResponse(
                {'error': f"File type '{mime}' is not allowed for '{uploaded_file.name}'."},
                status=400,
            )

    # --- 4. Determine upload mode ----------------------------------------------
    # folder_tree mode if ANY path contains a directory separator
    mode = 'folder_tree' if any('/' in p for p in relative_paths) else 'flat'

    # --- 5. Resolve optional parent folder -------------------------------------
    parent_folder = None
    if folder_id:
        try:
            parent_folder = Folder.objects.get(id=folder_id, owner=user, is_deleted=False)
        except Folder.DoesNotExist:
            return JsonResponse(
                {'error': f'folder_id {folder_id!r} not found or does not belong to you.'},
                status=404,
            )

    # --- 6. Write everything in a single atomic transaction --------------------
    try:
        with transaction.atomic():
            files_created = []
            folders_created_ids = set()
            root_folder = None

            if mode == 'flat':
                # All files go directly into parent_folder (or a 'Root' folder)
                if parent_folder is None:
                    parent_folder, created = Folder.objects.get_or_create(
                        name='Root',
                        parent=None,
                        owner=user,
                        defaults={'is_deleted': False},
                    )
                    # if created:
                    #     folders_created_ids.add(str(parent_folder.id))

                for uploaded_file, rel_path in zip(files, relative_paths):
                    file_name = rel_path.split('/')[-1] or uploaded_file.name
                    mime = (
                        uploaded_file.content_type
                        or mimetypes.guess_type(file_name)[0]
                        or 'application/octet-stream'
                    )
                    file_obj = File.objects.create(
                        name=file_name,
                        original_name=uploaded_file.name,
                        file_path=uploaded_file,
                        file_size=uploaded_file.size,
                        mime_type=mime,
                        folder=parent_folder,
                        owner=user,
                    )
                    files_created.append(file_obj)

            else:
                # folder_tree mode: reconstruct directory structure from paths
                # Track how many unique folder objects get created
                folder_cache = {}  # path_string → Folder instance

                def get_folder_for_path(path_parts):
                    """
                    Return the Folder for the given path segments,
                    creating intermediate folders as needed.
                    Uses a local cache to avoid redundant DB queries
                    within the same request.
                    """
                    cache_key = '/'.join(path_parts)
                    if cache_key in folder_cache:
                        return folder_cache[cache_key]

                    current_parent = parent_folder
                    for i, part in enumerate(path_parts):
                        partial_key = '/'.join(path_parts[:i + 1])
                        if partial_key in folder_cache:
                            current_parent = folder_cache[partial_key]
                            continue
                        folder, created = Folder.objects.get_or_create(
                            name=part,
                            parent=current_parent,
                            owner=user,
                            defaults={'is_deleted': False},
                        )
                        if folder.is_deleted:
                            folder.is_deleted = False
                            folder.save(update_fields=['is_deleted'])
                        if created:
                            folders_created_ids.add(str(folder.id))
                        folder_cache[partial_key] = folder
                        current_parent = folder

                    folder_cache[cache_key] = current_parent
                    return current_parent

                for uploaded_file, rel_path in zip(files, relative_paths):
                    parts = [p for p in rel_path.split('/') if p]
                    file_name = parts[-1] if parts else uploaded_file.name
                    dir_parts = parts[:-1]  # everything except the filename

                    target_folder = get_folder_for_path(dir_parts) if dir_parts else parent_folder

                    # If still no target folder, use/create Root
                    if target_folder is None:
                        target_folder, created = Folder.objects.get_or_create(
                            name='Root',
                            parent=None,
                            owner=user,
                            defaults={'is_deleted': False},
                        )
                        if created:
                            folders_created_ids.add(str(target_folder.id))

                    # The "root" folder is the top-most directory across all paths
                    if dir_parts:
                        top_key = dir_parts[0]
                        if top_key in folder_cache and root_folder is None:
                            root_folder = folder_cache[top_key]

                    mime = (
                        uploaded_file.content_type
                        or mimetypes.guess_type(file_name)[0]
                        or 'application/octet-stream'
                    )
                    file_obj = File.objects.create(
                        name=file_name,
                        original_name=uploaded_file.name,
                        file_path=uploaded_file,
                        file_size=uploaded_file.size,
                        mime_type=mime,
                        folder=target_folder,
                        owner=user,
                    )
                    files_created.append(file_obj)

            # --- 7. Log one activity record for the whole upload ---------------
            UserActivity.objects.create(
                user=user,
                action='upload',
                object_type='storage',
                object_id=files_created[0].id if files_created else user.id,
                details={
                    'mode': mode,
                    'files_created': len(files_created),
                    'folders_created': len(folders_created_ids),
                    'root_folder_id': str(root_folder.id) if root_folder else None,
                    'file_names': [f.name for f in files_created[:20]],
                },
            )

    except Exception as exc:
        return JsonResponse(
            {'error': f'Upload failed and was rolled back: {str(exc)}'},
            status=500,
        )

    return JsonResponse(
        {
            'mode': mode,
            'files_created': len(files_created),
            'folders_created': len(folders_created_ids),
            'root_folder_id': str(root_folder.id) if root_folder else None,
            'message': 'Uploaded successfully',
        },
        status=201,
    )


# ---------------------------------------------------------------------------
# FolderViewSet
# Provides: list, create, retrieve, update, partial_update, destroy
# Custom actions: share, move, delete_folder, batch_delete
# ---------------------------------------------------------------------------
class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filterset_fields = ['name', 'parent']
    search_fields = ['name', 'description']

    def get_queryset(self):
        return Folder.objects.filter(owner=self.request.user, is_deleted=False)

    def perform_create(self, serializer):
        instance = serializer.save(owner=self.request.user)
        UserActivity.objects.create(
            user=self.request.user,
            action='create_folder',
            object_type='folder',
            object_id=instance.id,
            details={'name': instance.name},
        )

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Share a folder with another user by email (future feature)."""
        folder = self.get_object()
        email = request.data.get('email')
        if not email:
            return Response({'error': 'email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = type(request.user).objects.get(email=email)
        except type(request.user).DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        # Folder-level share record would be created here in a future iteration
        return Response({'message': f'Folder shared with {email}.'})

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move folder under a different parent."""
        folder = self.get_object()
        new_parent_id = request.data.get('parent_id')
        if new_parent_id:
            new_parent = get_object_or_404(
                Folder, id=new_parent_id, owner=request.user, is_deleted=False
            )
            folder.parent = new_parent
        else:
            folder.parent = None
        folder.save(update_fields=['parent', 'updated_at'])
        UserActivity.objects.create(
            user=request.user,
            action='move_folder',
            object_type='folder',
            object_id=folder.id,
            details={'new_parent_id': new_parent_id},
        )
        return Response({'message': 'Folder moved successfully.'})

    @action(detail=True, methods=['delete'])
    def delete_folder(self, request, pk=None):
        """Recursively soft-delete a folder and all its contents."""
        folder = self.get_object()
        deleted_files, deleted_folders = _recursive_delete_folder(folder, request.user)
        UserActivity.objects.create(
            user=request.user,
            action='delete_folder',
            object_type='folder',
            object_id=folder.id,
            details={
                'name': folder.name,
                'files_deleted': len(deleted_files),
                'subfolders_deleted': len(deleted_folders),
            },
        )
        return Response(
            {
                'message': f'Folder "{folder.name}" deleted successfully.',
                'files_deleted': len(deleted_files),
                'folders_deleted': len(deleted_folders),
            }
        )

    @action(detail=False, methods=['delete'])
    def batch_delete(self, request):
        """Delete multiple folders by ID."""
        folder_ids = request.data.get('folder_ids', [])
        if not folder_ids:
            return Response(
                {'error': 'folder_ids is required and must not be empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted, errors = [], []
        for fid in folder_ids:
            try:
                folder = Folder.objects.get(id=fid, owner=request.user, is_deleted=False)
                d_files, d_folders = _recursive_delete_folder(folder, request.user)
                deleted.append({'id': str(folder.id), 'name': folder.name})
                UserActivity.objects.create(
                    user=request.user,
                    action='delete_folder',
                    object_type='folder',
                    object_id=folder.id,
                    details={'batch': True, 'files_deleted': len(d_files)},
                )
            except Folder.DoesNotExist:
                errors.append(f'Folder {fid} not found.')
            except Exception as exc:
                errors.append(f'Error deleting folder {fid}: {exc}')
        return Response(
            {
                'message': f'Deleted {len(deleted)} folder(s).',
                'deleted': deleted,
                'errors': errors,
            }
        )


def _recursive_delete_folder(folder, user):
    """
    Soft-delete all files and subfolders inside `folder`, then soft-delete
    the folder itself. Returns (deleted_files, deleted_folders) lists.
    """
    deleted_files, deleted_folders = [], []

    for f in File.objects.filter(folder=folder, is_deleted=False):
        if default_storage.exists(f.file_path.name):
            default_storage.delete(f.file_path.name)
        f.is_deleted = True
        f.save(update_fields=['is_deleted'])
        deleted_files.append(str(f.id))

    for sub in Folder.objects.filter(parent=folder, is_deleted=False):
        sub_files, sub_folders = _recursive_delete_folder(sub, user)
        deleted_files.extend(sub_files)
        deleted_folders.extend(sub_folders)

    folder.is_deleted = True
    folder.save(update_fields=['is_deleted'])
    deleted_folders.append(str(folder.id))
    return deleted_files, deleted_folders


# ---------------------------------------------------------------------------
# FileViewSet
# Provides: list, create, retrieve, update, partial_update, destroy
# Custom actions: share, move, download, delete_file, batch_delete
# ---------------------------------------------------------------------------
class FileViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filterset_fields = ['name', 'folder', 'mime_type']
    search_fields = ['name', 'original_name']

    def get_serializer_class(self):
        if self.action == 'create':
            return FileCreateSerializer
        return FileSerializer

    def get_queryset(self):
        return File.objects.filter(owner=self.request.user, is_deleted=False)

    def create(self, request, *args, **kwargs):
        serializer = FileCreateSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        file_obj = serializer.save()
        UserActivity.objects.create(
            user=request.user,
            action='upload_file',
            object_type='file',
            object_id=file_obj.id,
            details={'name': file_obj.name, 'size': file_obj.file_size},
        )
        return Response(
            FileSerializer(file_obj, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Share a file with another user by email."""
        file_obj = self.get_object()
        email = request.data.get('email')
        can_edit = bool(request.data.get('can_edit', False))
        if not email:
            return Response({'error': 'email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = type(request.user).objects.get(email=email)
        except type(request.user).DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        FileShare.objects.create(
            file=file_obj,
            shared_with=target_user,
            shared_by=request.user,
            can_edit=can_edit,
        )
        UserActivity.objects.create(
            user=request.user,
            action='share_file',
            object_type='file',
            object_id=file_obj.id,
            details={'shared_with': email, 'can_edit': can_edit},
        )
        return Response({'message': f'File shared with {email}.'})

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move file to a different folder."""
        file_obj = self.get_object()
        new_folder_id = request.data.get('folder_id')  # fixed: was new_parent_id
        if new_folder_id:
            new_folder = get_object_or_404(
                Folder, id=new_folder_id, owner=request.user, is_deleted=False
            )
            file_obj.folder = new_folder
        else:
            file_obj.folder = None
        file_obj.save(update_fields=['folder'])
        UserActivity.objects.create(
            user=request.user,
            action='move_file',
            object_type='file',
            object_id=file_obj.id,
            details={'new_folder_id': new_folder_id},
        )
        return Response({'message': 'File moved successfully.'})

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Stream file download."""
        file_obj = self.get_object()
        if not default_storage.exists(file_obj.file_path.name):
            return Response({'error': 'File not found on storage.'}, status=status.HTTP_404_NOT_FOUND)
        UserActivity.objects.create(
            user=request.user,
            action='download_file',
            object_type='file',
            object_id=file_obj.id,
            details={'name': file_obj.name},
        )
        with default_storage.open(file_obj.file_path.name, 'rb') as fh:
            response = HttpResponse(fh.read(), content_type=file_obj.mime_type)
            response['Content-Disposition'] = (
                f'attachment; filename="{file_obj.original_name}"'
            )
            return response

    @action(detail=True, methods=['delete'])
    def delete_file(self, request, pk=None):
        """Soft-delete a single file and remove it from storage."""
        file_obj = self.get_object()
        if default_storage.exists(file_obj.file_path.name):
            default_storage.delete(file_obj.file_path.name)
        UserActivity.objects.create(
            user=request.user,
            action='delete_file',
            object_type='file',
            object_id=file_obj.id,
            details={'name': file_obj.name, 'size': file_obj.file_size},
        )
        file_obj.is_deleted = True
        file_obj.save(update_fields=['is_deleted'])
        return Response({'message': f'File "{file_obj.name}" deleted successfully.'})

    @action(detail=False, methods=['delete'])
    def batch_delete(self, request):
        """Delete multiple files by ID."""
        file_ids = request.data.get('file_ids', [])
        if not file_ids:
            return Response(
                {'error': 'file_ids is required and must not be empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted, errors = [], []
        for fid in file_ids:
            try:
                file_obj = File.objects.get(id=fid, owner=request.user, is_deleted=False)
                if default_storage.exists(file_obj.file_path.name):
                    default_storage.delete(file_obj.file_path.name)
                UserActivity.objects.create(
                    user=request.user,
                    action='delete_file',
                    object_type='file',
                    object_id=file_obj.id,
                    details={'name': file_obj.name, 'batch': True},
                )
                file_obj.is_deleted = True
                file_obj.save(update_fields=['is_deleted'])
                deleted.append({'id': str(file_obj.id), 'name': file_obj.name})
            except File.DoesNotExist:
                errors.append(f'File {fid} not found.')
            except Exception as exc:
                errors.append(f'Error deleting file {fid}: {exc}')
        return Response(
            {
                'message': f'Deleted {len(deleted)} file(s).',
                'deleted': deleted,
                'errors': errors,
            }
        )


# ---------------------------------------------------------------------------
# FileShareViewSet  — not wired to frontend at this stage
# ---------------------------------------------------------------------------
class FileShareViewSet(viewsets.ModelViewSet):
    serializer_class = FileShareSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        return FileShare.objects.filter(
            Q(shared_by=user) | Q(shared_with=user)
        ).select_related('file', 'shared_with', 'shared_by')

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        share = self.get_object()
        if share.shared_by != request.user:
            return Response(
                {'error': 'Only the user who created this share can revoke it.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        UserActivity.objects.create(
            user=request.user,
            action='revoke_share',
            object_type='file',
            object_id=share.file.id,
            details={'shared_with': share.shared_with.email},
        )
        share.delete()
        return Response({'message': 'Share revoked.'})


# ---------------------------------------------------------------------------
# UserActivityViewSet  — read-only audit log
# ---------------------------------------------------------------------------
class UserActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = UserActivity.objects.filter(user=self.request.user)
        action_type = self.request.query_params.get('action')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if action_type:
            qs = qs.filter(action=action_type)
        if start_date:
            qs = qs.filter(timestamp__gte=start_date)
        if end_date:
            qs = qs.filter(timestamp__lte=end_date)
        return qs