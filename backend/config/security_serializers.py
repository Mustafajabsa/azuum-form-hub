from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
import re
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class SecurePasswordValidator:
    """
    Custom password validator for enhanced security
    """
    
    def validate(self, password, user=None):
        """
        Validate password with enhanced security rules
        """
        errors = []
        
        # Minimum length (already handled by Django's validator)
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long.")
        
        # Check for uppercase letters
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter.")
        
        # Check for lowercase letters
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter.")
        
        # Check for numbers
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one number.")
        
        # Check for special characters
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character.")
        
        # Check for common patterns
        if re.search(r'(.)\1{2,}', password):  # Repeated characters
            errors.append("Password cannot contain three or more repeated characters.")
        
        # Check for sequential characters
        if re.search(r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)', password.lower()):
            errors.append("Password cannot contain sequential characters.")
        
        # Check for common passwords
        common_passwords = [
            'password', '12345678', 'qwerty', 'abc123', 'password123',
            'admin', 'letmein', 'welcome', 'monkey', '123456789'
        ]
        if password.lower() in common_passwords:
            errors.append("Password is too common. Please choose a more secure password.")
        
        if errors:
            raise ValidationError(errors)
    
    def get_help_text(self):
        return """
        Password must be at least 8 characters long and contain:
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        - At least one special character
        - No three or more repeated characters
        - No sequential characters
        - Not be a common password
        """


class SecureRegistrationSerializer(serializers.ModelSerializer):
    """Enhanced registration serializer with security features"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm']
    
    def validate_email(self, value):
        """Validate email format and uniqueness"""
        if not value:
            raise serializers.ValidationError("Email is required.")
        
        # Check email format
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Invalid email format.")
        
        # Check for disposable email domains (basic check)
        disposable_domains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com']
        domain = value.split('@')[-1].lower()
        if any(disposable in domain for disposable in disposable_domains):
            raise serializers.ValidationError("Disposable email addresses are not allowed.")
        
        # Check uniqueness
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        return value.lower()
    
    def validate_username(self, value):
        """Validate username"""
        if not value:
            raise serializers.ValidationError("Username is required.")
        
        # Username format validation
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError("Username can only contain letters, numbers, and underscores.")
        
        # Length validation
        if len(value) < 3 or len(value) > 30:
            raise serializers.ValidationError("Username must be between 3 and 30 characters.")
        
        # Check for reserved usernames
        reserved_usernames = ['admin', 'root', 'system', 'api', 'www', 'mail', 'ftp']
        if value.lower() in reserved_usernames:
            raise serializers.ValidationError("This username is reserved.")
        
        # Check uniqueness
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        
        return value.lower()
    
    def validate(self, attrs):
        """Validate password confirmation and strength"""
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        if password != password_confirm:
            raise serializers.ValidationError("Passwords do not match.")
        
        # Validate password strength
        try:
            validate_password(password, user=None)
        except ValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        
        # Additional custom validation
        validator = SecurePasswordValidator()
        try:
            validator.validate(password)
        except ValidationError as e:
            raise serializers.ValidationError({'password': list(e)})
        
        return attrs
    
    def create(self, validated_data):
        """Create user with secure password handling"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        logger.info(f"New user registered: {user.email}")
        
        return user


class SecureLoginSerializer(serializers.Serializer):
    """Enhanced login serializer with security features"""
    
    email = serializers.EmailField()
    password = serializers.CharField()
    remember_me = serializers.BooleanField(default=False)
    
    def validate_email(self, value):
        """Validate email and check for account lockout"""
        try:
            user = User.objects.get(email__iexact=value)
            
            # Check if account is locked
            if hasattr(user, 'is_locked') and user.is_locked:
                raise serializers.ValidationError("Account is temporarily locked. Please try again later.")
            
            # Check if account is active
            if not user.is_active:
                raise serializers.ValidationError("This account has been deactivated.")
                
        except User.DoesNotExist:
            # Don't reveal that user doesn't exist
            pass
        
        return value.lower()


class PasswordChangeSerializer(serializers.Serializer):
    """Secure password change serializer"""
    
    current_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    new_password_confirm = serializers.CharField()
    
    def validate_current_password(self, value):
        """Validate current password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value
    
    def validate(self, attrs):
        """Validate new password"""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')
        
        if new_password != new_password_confirm:
            raise serializers.ValidationError("New passwords do not match.")
        
        # Check if new password is same as current
        current_password = attrs.get('current_password')
        if new_password == current_password:
            raise serializers.ValidationError("New password must be different from current password.")
        
        # Validate password strength
        try:
            validate_password(new_password, user=self.context['request'].user)
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': list(e.messages)})
        
        # Additional custom validation
        validator = SecurePasswordValidator()
        try:
            validator.validate(new_password)
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': list(e)})
        
        return attrs


class SecuritySettingsSerializer(serializers.Serializer):
    """Serializer for user security settings"""
    
    enable_two_factor = serializers.BooleanField(default=False)
    email_notifications = serializers.BooleanField(default=True)
    session_timeout = serializers.IntegerField(default=24, min_value=1, max_value=168)  # 1 hour to 1 week
    require_password_change = serializers.BooleanField(default=False)
    
    def validate_session_timeout(self, value):
        """Validate session timeout"""
        if value < 1 or value > 168:
            raise serializers.ValidationError("Session timeout must be between 1 and 168 hours.")
        return value


class SecurityAuditSerializer(serializers.Serializer):
    """Serializer for security audit events"""
    
    event_type = serializers.ChoiceField(choices=[
        ('login_success', 'Successful Login'),
        ('login_failed', 'Failed Login'),
        ('password_change', 'Password Changed'),
        ('account_locked', 'Account Locked'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('api_access', 'API Access'),
    ])
    ip_address = serializers.IPAddressField()
    user_agent = serializers.CharField(max_length=500)
    details = serializers.JSONField(default=dict)
    timestamp = serializers.DateTimeField()
