from rest_framework import serializers
from .models import Folder, File, FileShare, UserActivity
from django.contrib.auth import get_user_model

User = get_user_model()


class FolderSerializer(serializers.ModelSerializer):
    """Serializer for Folder model"""
    file_count = serializers.SerializerMethodField()
    total_size = serializers.SerializerMethodField()
    
    class Meta:
        model = Folder
        fields = ['id', 'name', 'description', 'parent', 'owner', 'created_at', 
                  'updated_at', 'file_count', 'total_size']
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']
    
    def get_file_count(self, obj):
        return obj.files.count()
    
    def get_total_size(self, obj):
        return obj.size


class FileSerializer(serializers.ModelSerializer):
    """Serializer for File model"""
    owner_email = serializers.SerializerMethodField()
    folder_name = serializers.SerializerMethodField()
    size_display = serializers.SerializerMethodField()
    
    class Meta:
        model = File
        fields = ['id', 'name', 'original_name', 'file_path', 'file_size', 
                  'mime_type', 'folder', 'owner', 'uploaded_at', 
                  'owner_email', 'folder_name', 'size_display']
        read_only_fields = ['id', 'uploaded_at', 'owner_email']
        extra_kwargs = {'owner': {'required': False}}
    
    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else None
    
    def get_folder_name(self, obj):
        return obj.folder.name if obj.folder else None
    
    def validate(self, attrs):
        """Validate file size and type"""
        if 'file_path' in attrs:
            file = attrs['file_path']
            if file.size > 100 * 1024 * 1024:  # 100MB limit
                raise serializers.ValidationError("File size cannot exceed 100MB")
        return super().validate(attrs)


class FileCreateSerializer(serializers.ModelSerializer):
    """Serializer for file creation"""
    class Meta:
        model = File
        fields = ['name', 'file_path', 'folder', 'mime_type']
    
    def create(self, validated_data):
        """Create file with owner from request context"""
        validated_data['owner'] = self.context['request'].user
        
        # Handle file_path field properly
        file_path = validated_data['file_path']
        validated_data['original_name'] = file_path.name
        validated_data['file_size'] = file_path.size
        
        # mime_type is already provided in the request, so don't override it
        # validated_data['mime_type'] = file_path.content_type
        
        return super().create(validated_data)


class FileShareSerializer(serializers.ModelSerializer):
    """Serializer for FileShare model"""
    shared_with_email = serializers.SerializerMethodField()
    shared_by_email = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    
    class Meta:
        model = FileShare
        fields = ['id', 'file', 'shared_with', 'shared_by', 'can_edit', 
                  'can_download', 'expires_at', 'created_at',
                  'shared_with_email', 'shared_by_email', 'file_name']
        read_only_fields = ['id', 'created_at', 'shared_by_email']
    
    def get_shared_with_email(self, obj):
        return obj.shared_with.email if obj.shared_with else None
    
    def get_shared_by_email(self, obj):
        return obj.shared_by.email if obj.shared_by else None
    
    def get_file_name(self, obj):
        return obj.file.name


class UserActivitySerializer(serializers.ModelSerializer):
    """Serializer for UserActivity model"""
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = UserActivity
        fields = ['id', 'user', 'action', 'object_type', 'object_id', 
                  'details', 'ip_address', 'user_agent', 'timestamp', 'user_email']
        read_only_fields = ['id', 'timestamp', 'user_email']
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else None


class FolderTreeSerializer(serializers.Serializer):
    """Serializer for folder hierarchy"""
    def to_representation(self, obj):
        """Convert folder to tree structure"""
        if isinstance(obj, Folder):
            return {
                'id': str(obj.id),
                'name': obj.name,
                'type': 'folder',
                'children': self.to_representation(obj.children.all()),
                'file_count': obj.files.count(),
                'size': obj.size
            }
        elif isinstance(obj, File):
            return {
                'id': str(obj.id),
                'name': obj.name,
                'type': 'file',
                'size': obj.file_size,
                'size_display': obj.size_display,
                'extension': obj.extension,
                'uploaded_at': obj.uploaded_at.isoformat()
            }
        return super().to_representation(obj)
