import mimetypes
from django.conf import settings
from rest_framework import serializers
from .models import Folder, File, FileShare, UserActivity
from django.contrib.auth import get_user_model

User = get_user_model()


class FolderSerializer(serializers.ModelSerializer):
    """Serializer for Folder model — used for list, retrieve, create, update."""
    file_count = serializers.SerializerMethodField()
    total_size = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'description', 'parent', 'owner',
            'created_at', 'updated_at', 'file_count', 'total_size',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']

    def get_file_count(self, obj):
        return obj.files.filter(is_deleted=False).count()

    def get_total_size(self, obj):
        return obj.size


class FileSerializer(serializers.ModelSerializer):
    """
    Serializer for File model — used for list and retrieve.
    file_path is write-only on create; read responses return the URL via
    SerializerMethodField so the raw filesystem path is never exposed.
    """
    owner_email = serializers.SerializerMethodField()
    folder_name = serializers.SerializerMethodField()
    size_display = serializers.SerializerMethodField()
    # Expose a clean download URL instead of the raw file_path string
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = [
            'id', 'name', 'original_name', 'file_size', 'mime_type',
            'folder', 'owner', 'uploaded_at',
            'owner_email', 'folder_name', 'size_display', 'download_url',
        ]
        read_only_fields = ['id', 'uploaded_at', 'owner', 'owner_email']

    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else None

    def get_folder_name(self, obj):
        return obj.folder.name if obj.folder else None

    def get_size_display(self, obj):
        # Re-implement here so we don't mutate obj.file_size in the model property
        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.2f} TB"

    def get_download_url(self, obj):
        request = self.context.get('request')
        if request and obj.file_path:
            return request.build_absolute_uri(f'/api/storage/files/{obj.id}/download/')
        return None


class FileCreateSerializer(serializers.ModelSerializer):
    """
    Serializer used only for the ViewSet create() path (POST /storage/files/).
    The unified_upload_view does NOT use this — it writes directly to the model
    inside a transaction so it can handle batches efficiently.
    """
    class Meta:
        model = File
        fields = ['name', 'file_path', 'folder', 'mime_type']

    def validate_file_path(self, value):
        """Validate size and MIME type against settings."""
        max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 50 * 1024 * 1024)
        allowed_types = getattr(settings, 'ALLOWED_FILE_TYPES', [])

        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size {value.size} exceeds the maximum allowed "
                f"{max_size // (1024 * 1024)} MB."
            )

        # Detect MIME from content_type header; fall back to extension sniffing
        mime = value.content_type or mimetypes.guess_type(value.name)[0] or ''
        if allowed_types and mime not in allowed_types:
            raise serializers.ValidationError(
                f"File type '{mime}' is not allowed."
            )
        return value

    def create(self, validated_data):
        file_obj = validated_data['file_path']
        validated_data['owner'] = self.context['request'].user
        validated_data['original_name'] = file_obj.name
        validated_data['file_size'] = file_obj.size
        # Use provided mime_type; fall back to detected value
        if not validated_data.get('mime_type'):
            validated_data['mime_type'] = (
                file_obj.content_type
                or mimetypes.guess_type(file_obj.name)[0]
                or 'application/octet-stream'
            )
        return super().create(validated_data)


class FileShareSerializer(serializers.ModelSerializer):
    """Serializer for FileShare model."""
    shared_with_email = serializers.SerializerMethodField()
    shared_by_email = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = FileShare
        fields = [
            'id', 'file', 'shared_with', 'shared_by', 'can_edit',
            'can_download', 'expires_at', 'created_at',
            'shared_with_email', 'shared_by_email', 'file_name',
        ]
        read_only_fields = ['id', 'created_at', 'shared_by']

    def get_shared_with_email(self, obj):
        return obj.shared_with.email if obj.shared_with else None

    def get_shared_by_email(self, obj):
        return obj.shared_by.email if obj.shared_by else None

    def get_file_name(self, obj):
        return obj.file.name if obj.file else None


class UserActivitySerializer(serializers.ModelSerializer):
    """Read-only serializer for UserActivity audit log."""
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = UserActivity
        fields = [
            'id', 'user', 'action', 'object_type', 'object_id',
            'details', 'ip_address', 'user_agent', 'timestamp', 'user_email',
        ]
        read_only_fields = fields  # everything is read-only

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None


class FolderTreeSerializer(serializers.Serializer):
    """
    Recursive serializer that renders a Folder (and its children) as a tree.
    Used by the folder list endpoint when ?tree=1 is passed.
    """

    def to_representation(self, obj):
        if isinstance(obj, Folder):
            return {
                'id': str(obj.id),
                'name': obj.name,
                'type': 'folder',
                'children': [
                    self.to_representation(child)
                    for child in obj.children.filter(is_deleted=False)
                ] + [
                    self.to_representation(f)
                    for f in obj.files.filter(is_deleted=False)
                ],
                'file_count': obj.files.filter(is_deleted=False).count(),
                'size': obj.size,
            }
        if isinstance(obj, File):
            return {
                'id': str(obj.id),
                'name': obj.name,
                'type': 'file',
                'size': obj.file_size,
                'mime_type': obj.mime_type,
                'extension': obj.extension,
                'uploaded_at': obj.uploaded_at.isoformat(),
            }
        # Fallback for querysets / iterables
        return [self.to_representation(item) for item in obj]