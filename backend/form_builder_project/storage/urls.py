from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    FileInfoViewSet,
    FileManagerAPIView,
    FileDeleteAPIView,
    FolderCreateAPIView,
    FileDownloadAPIView,
    FileInfoListCreateAPIView,
    FileInfoDetailView,
    FileViewAPIView,
    FolderUploadAPIView,
    FileMoveAPIView,
    FileRenameAPIView,
    FileShareCreateAPIView,
    FileShareAccessAPIView,
    FileShareRevokeAPIView,
    FileCopyAPIView,
    FileMetaDataAPIView,
    BulkFileDeleteAPIView,
    BulkFileDownloadAPIView,
    StorageStatsAPIView
)

router = DefaultRouter()
router.register(r'fileinfo', FileInfoViewSet, basename='fileinfo')

app_name = 'home_api'

urlpatterns = [
    # File/Folder Management
    path('files/', FileManagerAPIView.as_view(), name='file-list'),
    path('files/delete/<path:file_path>/', FileDeleteAPIView.as_view(), name='file-delete'),
    path('files/download/<path:file_path>/', FileDownloadAPIView.as_view(), name='file-download'),
    path('files/view/<str:file_path>/', FileViewAPIView.as_view(), name='file-view'),
    path('folders/create/', FolderCreateAPIView.as_view(), name='folder-create'),
    path('folders/upload/', FolderUploadAPIView.as_view(), name='folder-upload'),
    path('files/move/', FileMoveAPIView.as_view(), name='file-move'),
    path('files/rename/', FileRenameAPIView.as_view(), name='file-rename'),
    path('files/share/',FileShareCreateAPIView.as_view(), name='file-share-create'),
    path('files/shared/<uuid:token>/',FileShareAccessAPIView.as_view(), name='file-share-access'),
    path('files/share/<uuid:token>/revoke/',FileShareRevokeAPIView.as_view(), name='file-share-revoke'),
    path('files/copy/', FileCopyAPIView.as_view(), name='file-copy'),
    path('files/info/', FileMetaDataAPIView.as_view(), name='file-info'),
    path('files/bulk-delete/', BulkFileDeleteAPIView.as_view(), name='file-bulk-delete'),
    path('files/bulk-download/', BulkFileDownloadAPIView.as_view(), name='file-bulk-download'),
    path('files/stats/', StorageStatsAPIView.as_view(), name='storage-stats'),

    # FileInfo metadata management
    path('fileinfo/', FileInfoListCreateAPIView.as_view(), name='fileinfo-list'),
    path('fileinfo/<int:pk>/', FileInfoDetailView.as_view(), name='fileinfo-detail'),
] + router.urls