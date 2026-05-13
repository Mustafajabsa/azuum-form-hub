from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from storage.throttles import RegisterRateThrottle, LoginRateThrottle
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter
from .models import CustomUser, UserProfile
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    UserWithProfileSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    UserEditSerializer,
)
import os
from drf_spectacular.utils import OpenApiResponse
from django.conf import settings
import uuid
from django.http import FileResponse

User = get_user_model()

class UserDeleteAPIView(APIView):
    """Delete a user account."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAdminUser]
    
    @extend_schema(
        summary="Delete a user account",
        description="Permanently removes a user from the system. Restricted to Administrators only.",
        responses={
            204: None,  # Success with no content
            400: OpenApiTypes.OBJECT, # For the "cannot delete self" error
            403: OpenApiTypes.OBJECT, # Permission denied
            404: OpenApiTypes.OBJECT, # User not found
        },
        # If your URL uses a variable like <int:id>, it shows up here:
        parameters=[
            OpenApiParameter(
                name='id', 
                type=int, 
                location=OpenApiParameter.PATH, 
                description="The unique ID of the user to delete"
            )
        ]
    )

    def delete(self, request, id):

        target_user = get_object_or_404(User, id=id)
        if request.user.id == target_user.id:
            return Response(
                {"error": "You cannot delete your own admin account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        target_user.delete()
        return Response(
            {"message": f"User {target_user.username} deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )
class RegisterAPIView(APIView):
    """
    Register a new user. 
    Restricted: Only Admins can access this endpoint.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAdminUser]
    throttle_classes       = [RegisterRateThrottle]
    
    @extend_schema(
        description="Create a new user account. Only accessible by administrators.",
        request=RegisterSerializer,
        responses={201: UserSerializer}
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    'message': f'Account created successfully. Welcome {user.username}.',
                    'user':    UserSerializer(user).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class LoginAPIView(APIView):
    """Login and receive JWT tokens."""
    authentication_classes = []
    permission_classes     = [AllowAny]
    throttle_classes       = [LoginRateThrottle]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'username and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # authenticate the user
        user = User.objects.filter(username=username).first()

        if not user or not user.check_password(password):
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is disabled. Contact your administrator.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # generate tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'access':  str(refresh.access_token),
                'refresh': str(refresh),
                'user':    UserSerializer(user).data
            },
            status=status.HTTP_200_OK
        )
class LogoutAPIView(APIView):
    """Logout — blacklist the refresh token."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'error': 'refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()    # invalidate the refresh token
            return Response(
                {'message': 'Logged out successfully'},
                status=status.HTTP_200_OK
            )
        except TokenError:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )
class MeAPIView(APIView):
    """Get current logged in user details."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    @extend_schema(
        request=UserSerializer,
        responses={200: UserSerializer}
    )
    def delete(self, request):
        """Delete user."""
        request.user.delete()
        return Response({'message': 'User deleted successfully'}, status=status.HTTP_200_OK)
    
    def patch(self, request):
        """Update user details."""
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True    # allow partial updates
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class ChangePasswordAPIView(APIView):

    """Change user password."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={200: {"detail": "Password changed successfully"}}
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user

            # verify old password
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'error': 'Old password is incorrect'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # set new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()

            return Response(
                {'message': 'Password changed successfully'},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class ProfileAPIView(APIView):
    """Get and update user profile."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    @extend_schema(
        summary="Get user profile",
        description="Returns the full profile of the logged in user including bio, phone, and profile picture path.",
        responses={
            200: OpenApiResponse(
                description="Profile returned successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'id':           {'type': 'integer', 'example': 1},
                        'username':     {'type': 'string',  'example': 'john'},
                        'email':        {'type': 'string',  'example': 'john@example.com'},
                        'first_name':   {'type': 'string',  'example': 'John'},
                        'last_name':    {'type': 'string',  'example': 'Doe'},
                        'role':         {'type': 'string',  'example': 'user'},
                        'profile': {
                            'type': 'object',
                            'properties': {
                                'bio':         {'type': 'string',  'example': 'Software developer'},
                                'phone':       {'type': 'string',  'example': '+1234567890'},
                                'picture_url': {'type': 'string',  'example': '1/avatar.jpg', 'nullable': True},
                                'updated_at':  {'type': 'string',  'example': '2024-01-15 10:30:00'}
                            }
                        }
                    }
                }
            )
        }
    )
    def get(self, request):
        """Get user profile."""
        # get_or_create ensures profile always exists
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserWithProfileSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        summary="Update user profile",
        description="""
        Update profile fields. All fields are optional — only send what you want to change.
        
        **Updatable user fields:** first_name, last_name, email
        **Updatable profile fields:** bio, phone
        
        Profile picture is updated separately via POST /api/auth/profile/picture/
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'first_name': {'type': 'string', 'example': 'John'},
                    'last_name':  {'type': 'string', 'example': 'Doe'},
                    'email':      {'type': 'string', 'example': 'john@example.com'},
                    'bio':        {'type': 'string', 'example': 'Software developer'},
                    'phone':      {'type': 'string', 'example': '+1234567890'}
                }
            }
        },
        responses={
            200: OpenApiResponse(description="Profile updated successfully"),
            400: OpenApiResponse(description="Validation error")
        }
    )
    def patch(self, request):
        """Update user profile."""
        user = request.user

        # get_or_create instead of user.profile — handles existing users
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        # update user fields
        user_fields  = ['first_name', 'last_name', 'email']
        user_updated = False
        for field in user_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
                user_updated = True
        if user_updated:
            user.save()

        # update profile fields
        profile_serializer = UserProfileSerializer(
            profile,
            data    = request.data,
            partial = True
        )
        if profile_serializer.is_valid():
            profile_serializer.save()
            return Response(
                UserWithProfileSerializer(user).data,
                status=status.HTTP_200_OK
            )
        return Response(
            profile_serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

class ProfilePictureAPIView(APIView):
    """Upload and delete profile picture."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    MAX_SIZE_BYTES      = 5 * 1024 * 1024   # 5MB

    @extend_schema(
        summary="Upload profile picture",
        description="""
        Uploads a new profile picture for the logged in user.
        Replaces any existing profile picture automatically.
        
        **Allowed formats:** jpg, jpeg, png, gif, webp
        **Maximum size:** 5MB
        """,
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'picture': {
                        'type':        'string',
                        'format':      'binary',
                        'description': 'Profile picture file.'
                    }
                },
                'required': ['picture']
            }
        },
        responses={
            200: OpenApiResponse(
                description="Profile picture uploaded successfully",
                response={
                    'type': 'object',
                    'properties': {
                        'message':     {'type': 'string', 'example': 'Profile picture updated successfully'},
                        'picture_url': {'type': 'string', 'example': '1/avatar.jpg'},
                        'updated_at':  {'type': 'integer', 'example': 1714900000,
                                        'description': 'Unix timestamp for cache busting'}
                    }
                }
            ),
            400: OpenApiResponse(description="Invalid file or file too large")
        }
    )
    def post(self, request):
        """Upload profile picture."""
        if 'picture' not in request.FILES:
            return Response(
                {'error': 'picture file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        picture = request.FILES['picture']

        # validate extension
        _, ext = os.path.splitext(picture.name)
        if ext.lower() not in self.ALLOWED_EXTENSIONS:
            return Response(
                {'error': f'Invalid file type. Allowed: {", ".join(self.ALLOWED_EXTENSIONS)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # validate size
        if picture.size > self.MAX_SIZE_BYTES:
            return Response(
                {'error': 'File too large. Maximum size is 5MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile        = request.user.profile
        profile_folder = os.path.join(
            str(settings.PROFILE_PICTURES_ROOT),
            str(request.user.id)
        )
        os.makedirs(profile_folder, exist_ok=True)

        # delete old picture if exists
        if profile.profile_picture:
            old_path = os.path.join(
                str(settings.PROFILE_PICTURES_ROOT),
                profile.profile_picture
            )
            if os.path.exists(old_path):
                os.remove(old_path)

        # save new picture with a unique name to avoid caching issues
        unique_filename  = f'avatar_{uuid.uuid4().hex}{ext.lower()}'
        relative_path    = os.path.join(str(request.user.id), unique_filename)
        absolute_path    = os.path.join(profile_folder, unique_filename)

        with open(absolute_path, 'wb') as f:
            for chunk in picture.chunks():
                f.write(chunk)

        # update profile record
        profile.profile_picture = relative_path
        profile.save()

        import time
        return Response(
            {
                'message':     'Profile picture updated successfully',
                'picture_url': relative_path,
                'updated_at':  int(time.time())   # unix timestamp for cache busting
            },
            status=status.HTTP_200_OK
        )

    @extend_schema(
        summary="Delete profile picture",
        description="Removes the current profile picture. The user will have no profile picture after this.",
        responses={
            200: OpenApiResponse(description="Profile picture deleted successfully"),
            400: OpenApiResponse(description="No profile picture to delete")
        }
    )
    def delete(self, request):
        """Delete profile picture."""
        profile = request.user.profile

        if not profile.profile_picture:
            return Response(
                {'error': 'No profile picture to delete'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # delete from disk
        absolute_path = os.path.join(
            str(settings.PROFILE_PICTURES_ROOT),
            profile.profile_picture
        )
        if os.path.exists(absolute_path):
            os.remove(absolute_path)

        # clear from profile
        profile.profile_picture = ''
        profile.save()

        return Response(
            {'message': 'Profile picture deleted successfully'},
            status=status.HTTP_200_OK
        )

class ProfilePictureServeAPIView(APIView):
    """Serve the profile picture file."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    @extend_schema(
        summary="Get profile picture",
        description="Serves the profile picture file for the logged in user.",
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.BINARY,
                description="Profile picture file"
            ),
            404: OpenApiResponse(description="No profile picture found")
        }
    )
    def get(self, request):
        """Serve profile picture."""
        profile = request.user.profile

        if not profile.profile_picture:
            return Response(
                {'error': 'No profile picture found'},
                status=status.HTTP_404_NOT_FOUND
            )

        absolute_path = os.path.join(
            str(settings.PROFILE_PICTURES_ROOT),
            profile.profile_picture
        )

        if not os.path.exists(absolute_path):
            return Response(
                {'error': 'Profile picture file not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        _, ext       = os.path.splitext(absolute_path)
        content_type = {
            '.jpg':  'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png':  'image/png',
            '.gif':  'image/gif',
            '.webp': 'image/webp'
        }.get(ext.lower(), 'image/jpeg')

        fh       = open(absolute_path, 'rb')
        response = FileResponse(fh, content_type=content_type)

        # cache for 1 hour — the unique filename handles cache busting
        response['Cache-Control'] = 'max-age=3600'
        return response
class ListUsersAPIView(APIView):
    """List all users."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAdminUser]

    @extend_schema(
        summary="List users",
        description="Lists all the users on the app.",
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="List of users"
            )
        }
    )
    def get(self, request):
        """List all users."""
        users = User.objects.all()
        serializer = UserWithProfileSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
class UserDetailAPIView(APIView):
    """Get user detail."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    @extend_schema(
        summary="Get current user detail",
        description="Gets current loggedin user detail.",
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="User detail"
            )
        }
    )
    def get(self, request, id):
        """Get user detail."""
        user = get_object_or_404(User, id=id)
        serializer = UserWithProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
class UserEditAPIView(APIView):
    """Edit user."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAdminUser]

    @extend_schema(
        summary="Edit user",
        description="Edits a user.",
        request=UserEditSerializer,
        tags=["Users"],
        parameters=[
            OpenApiParameter(
                name="id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description="User ID",
                required=True
            )
        ],
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.OBJECT,
                description="User edited"
            )
        }
    )
    def patch(self, request, id):
        """Edit user details."""
        user = get_object_or_404(User, id=id)
        serializer = UserEditSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
