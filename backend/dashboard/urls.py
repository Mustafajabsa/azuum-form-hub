from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'stats', views.DashboardStatsViewSet, basename='dashboard-stats')
router.register(r'system', views.SystemStatsViewSet, basename='system-stats')

urlpatterns = [
    path('', include(router.urls)),
]
