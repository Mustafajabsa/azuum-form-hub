from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'search', views.AdvancedSearchViewSet, basename='advanced-search')
router.register(r'saved-searches', views.SavedSearchViewSet, basename='saved-search')
router.register(r'file-versions', views.FileVersionViewSet, basename='file-version')
router.register(r'bulk-operations', views.BulkOperationViewSet, basename='bulk-operation')

urlpatterns = [
    path('', include(router.urls)),
]
