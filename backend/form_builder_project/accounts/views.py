from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, ChangePasswordSerializer
from storage.throttles import RegisterRateThrottle, LoginRateThrottle
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter

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