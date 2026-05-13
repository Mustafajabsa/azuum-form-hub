from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(
        write_only = True,
        required   = True,
        validators = [validate_password]
    )
    password2 = serializers.CharField(
        write_only = True,
        required   = True,
        label      = 'Confirm Password'
    )
    phone = serializers.CharField(required=False, default='')

    class Meta:
        model  = User
        fields = [
            'username',
            'first_name',
            'last_name',
            'email',
            'phone',
            'role',
            'storage_quota',
            'password',
            'password2'
        ]

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        phone         = validated_data.pop('phone', '')

        user = User.objects.create_user(
            username      = validated_data['username'],
            email         = validated_data.get('email', ''),
            password      = validated_data['password'],
            first_name    = validated_data.get('first_name', ''),
            last_name     = validated_data.get('last_name', ''),
            role          = validated_data.get('role', User.Role.USER),
            storage_quota = validated_data.get('storage_quota', 1073741824)
        )

        # save phone to profile
        if phone:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.phone = phone
            profile.save()

        return user
class UserEditSerializer(serializers.ModelSerializer):
    """Serializer for editing user details."""
    phone = serializers.CharField(source='profile.phone', required=False)
    class Meta:
        model  = User
        fields = ['first_name','last_name', 'email','phone','role','storage_quota']
        read_only_fields = ['id','created_at']
    def update(self, instance, validated_data):
        # 1. Extract the profile data (the nested 'phone' field)
        profile_data = validated_data.pop('profile', None)
        
        # 2. Update the User fields (first_name, last_name, etc.)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 3. Update the Profile fields if they were provided
        if profile_data:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            phone_val = profile_data.get('phone')
            if phone_val is not None:
                profile.phone = phone_val
                profile.save()

        return instance
class UserSerializer(serializers.ModelSerializer):
    """Serializer for returning user details."""
    phone = serializers.SerializerMethodField()
    class Meta:
        model  = User
        fields = [
            'id',
            'username',
            'email',
            'role',
            'storage_quota',
            'created_at',
            'is_active',
            'phone'
        ]
        read_only_fields = [
            'id',
            'role',           # role can only be changed by admin
            'storage_quota',  # quota can only be changed by admin
            'created_at'
        ]
    def get_phone(self, obj):
        try:
            phone = obj.profile.phone
            return str(phone) if phone else ''
        except Exception:
            return ''
class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password]
    )
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['new_password2']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match'})
        return data
class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""
    picture_url = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    class Meta:
        model  = UserProfile
        fields = [
            'bio',
            'phone',
            'picture_url',
            'updated_at'
        ]
        read_only_fields = ['picture_url', 'updated_at']

    def get_picture_url(self, obj):
        """Return the picture path or None."""
        return obj.get_picture_url()
    def get_phone(self, obj):
        try:
            return str(obj.phone) if obj.phone else ''
        except Exception:
            return ''
class UserWithProfileSerializer(serializers.ModelSerializer):
    """Full user details including profile."""
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model  = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'storage_quota',
            'created_at',
            'is_active',
            'profile'
        ]
        read_only_fields = ['id', 'role', 'storage_quota', 'created_at']