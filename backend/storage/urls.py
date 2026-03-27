from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import FileUploadView

router = DefaultRouter()
router.register(r'folders', views.FolderViewSet, basename='folder')
router.register(r'files', views.FileViewSet, basename='file')
router.register(r'shares', views.FileShareViewSet, basename='share')
router.register(r'activities', views.UserActivityViewSet, basename='activity')

urlpatterns = [
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('', include(router.urls)),
]
