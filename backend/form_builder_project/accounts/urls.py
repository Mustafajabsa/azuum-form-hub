from django.urls import path
from .views import (
    RegisterAPIView,
    LoginAPIView,
    LogoutAPIView,
    MeAPIView,
    ChangePasswordAPIView,
    UserDeleteAPIView,
    ProfileAPIView,
    ProfilePictureAPIView,
    ProfilePictureServeAPIView,
    UserDetailAPIView,
    ListUsersAPIView,
    UserEditAPIView,
)

urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('users/delete/<int:id>/', UserDeleteAPIView.as_view(), name='delete'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('me/', MeAPIView.as_view(), name='me'),
    path('change-password/', ChangePasswordAPIView.as_view(), name='change-password'),
    path('users/', ListUsersAPIView.as_view(), name='list-users'),
    path('users/<int:id>/', UserDetailAPIView.as_view(), name='user-detail'),
    path('users/edit/<int:id>/', UserEditAPIView.as_view(), name='user-edit'),
    # profile endpoints

    path('profile/', ProfileAPIView.as_view(), name='auth-profile'),
    path('profile/picture/', ProfilePictureAPIView.as_view(), name='auth-profile-picture'),
    path('profile/picture/serve/', ProfilePictureServeAPIView.as_view(), name='auth-profile-picture-serve'),
]