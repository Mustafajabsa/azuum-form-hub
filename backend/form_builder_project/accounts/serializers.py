from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password  = serializers.CharField(
        write_only=True,           # password never returned in response
        required=True,
        validators=[validate_password]  # enforces Django's password rules
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        label='Confirm Password'
    )

    class Meta:
        model  = User
        fields = ['username', 'email', 'password', 'password2']

    def validate(self, data):
        """Check that both passwords match."""
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        return data

    def create(self, validated_data):
        """Create user — remove password2 before saving."""
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=User.Role.USER    # every new user is a regular user by default
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for returning user details."""

    class Meta:
        model  = User
        fields = [
            'id',
            'username',
            'email',
            'role',
            'storage_quota',
            'created_at',
            'is_active'
        ]
        read_only_fields = [
            'id',
            'role',           # role can only be changed by admin
            'storage_quota',  # quota can only be changed by admin
            'created_at'
        ]


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