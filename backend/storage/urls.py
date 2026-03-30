from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'folders', views.FolderViewSet, basename='folder')
router.register(r'files', views.FileViewSet, basename='file')
router.register(r'shares', views.FileShareViewSet, basename='share')
router.register(r'activities', views.UserActivityViewSet, basename='activity')

urlpatterns = [
    # Unified upload endpoint — handles both flat files and folder trees
    path('upload/', views.unified_upload_view, name='upload'),
    # All ViewSet routes
    path('', include(router.urls)),
]