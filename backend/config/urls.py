"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from drf_yasg.generators import OpenAPISchemaGenerator

from .swagger import schema_view
from .api_info import api_info, rate_limit_status
from .health_checks import health_check, readiness_check, liveness_check, metrics_endpoint

# Custom schema generator for better documentation
class CustomSchemaGenerator(OpenAPISchemaGenerator):
    def get_schema(self, request=None, public=True):
        schema = super().get_schema(request, public)
        return schema

schema_view = get_schema_view(
   openapi.Info(
      title="Azuum Form Hub API",
      default_version='v1',
      description="Comprehensive form management and file storage API with advanced features",
      terms_of_service="https://azuumformhub.com/terms/",
      contact=openapi.Contact(email="support@azuumformhub.com"),
      license=openapi.License(name="MIT License"),
   ),
   public=True,
   generator_class=CustomSchemaGenerator,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # API Documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    # API Information
    path('api/info/', api_info, name='api-info'),
    path('api/rate-limit/', rate_limit_status, name='rate-limit-status'),
    # Health Checks
    path('health/', health_check, name='health-check'),
    path('health/ready/', readiness_check, name='readiness-check'),
    path('health/live/', liveness_check, name='liveness-check'),
    path('metrics/', metrics_endpoint, name='metrics-endpoint'),
    # API Endpoints
    path('api/accounts/', include('accounts.urls')),
    path('api/forms/', include('forms.urls')),
    path('api/submissions/', include('submissions.urls')),
    path('api/storage/', include('storage.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/advanced/', include('advanced.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
