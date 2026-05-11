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
    FileShareInfoAPIView,
    FileShareBulkInfoAPIView,
    FileShareAccessAPIView,
    FileShareRevokeAPIView,
    FileCopyAPIView,
    FileMetaDataAPIView,
    BulkFileDeleteAPIView,
    BulkFileDownloadAPIView,
    StorageStatsAPIView,
    MixedDownloadAPIView,
    MixedMoveAPIView,
    FileCompressAPIView,
    MixedShareAPIView,
    SharedItemsListAPIView,
    TrashAPIView,
    TrashRestoreAPIView,
    TrashDeleteAPIView,
    FavoritesAPIView,
)

router = DefaultRouter()
router.register(r'fileinfo', FileInfoViewSet, basename='fileinfo')

app_name = 'home_api'

urlpatterns = [
    # File/Folder Management
    path('files/', FileManagerAPIView.as_view(), name='file-list'),
    path('files/delete/<path:file_path>/', FileDeleteAPIView.as_view(), name='file-delete'),
    path('files/download/<path:file_path>/', FileDownloadAPIView.as_view(), name='file-download'),
    path('files/view/<path:file_path>/', FileViewAPIView.as_view(), name='file-view'),
    path('folders/create/', FolderCreateAPIView.as_view(), name='folder-create'),
    path('folders/upload/', FolderUploadAPIView.as_view(), name='folder-upload'),
    path('files/move/', FileMoveAPIView.as_view(), name='file-move'),
    path('files/rename/', FileRenameAPIView.as_view(), name='file-rename'),
    path('files/share/',FileShareCreateAPIView.as_view(), name='file-share-create'),
    path('files/share/<uuid:token>/',FileShareInfoAPIView.as_view(), name='file-share-info'),
    path('files/share/bulk/',FileShareBulkInfoAPIView.as_view(), name='file-share-bulk-info'),
    path('files/shared/<uuid:token>/',FileShareAccessAPIView.as_view(), name='file-share-access'),
    path('files/share/<uuid:token>/revoke/',FileShareRevokeAPIView.as_view(), name='file-share-revoke'),
    path('files/copy/', FileCopyAPIView.as_view(), name='file-copy'),
    path('files/info/', FileMetaDataAPIView.as_view(), name='file-info'),
    path('files/bulk-delete/', BulkFileDeleteAPIView.as_view(), name='file-bulk-delete'),
    path('files/bulk-download/', BulkFileDownloadAPIView.as_view(), name='file-bulk-download'),
    path('files/stats/', StorageStatsAPIView.as_view(), name='storage-stats'),
    path('files/mixed-download/', MixedDownloadAPIView.as_view(), name='mixed-download'),
    path('files/mixed-move/', MixedMoveAPIView.as_view(), name='mixed-move'),
    path('files/compress/', FileCompressAPIView.as_view(), name='file-compress'),
    path('files/mixed-share/', MixedShareAPIView.as_view(), name='mixed-share'),
    path('files/shared-items/', SharedItemsListAPIView.as_view(), name='shared-items-list'),
    path('files/trash/',         TrashAPIView.as_view(),       name='trash'),
    path('files/trash/restore/', TrashRestoreAPIView.as_view(), name='trash-restore'),
    path('files/trash/delete/',  TrashDeleteAPIView.as_view(),  name='trash-delete'),
    path('files/favorites/', FavoritesAPIView.as_view(), name='favorites'),
    # FileInfo metadata management
    path('fileinfo/', FileInfoListCreateAPIView.as_view(), name='fileinfo-list'),
    path('fileinfo/<int:pk>/', FileInfoDetailView.as_view(), name='fileinfo-detail'),
] + router.urls