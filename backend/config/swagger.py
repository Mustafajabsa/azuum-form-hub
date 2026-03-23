from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="Azuum Form Hub API",
        default_version='v1',
        description="API documentation for Azuum Form Hub - A comprehensive form management system",
        contact=openapi.Contact(email="support@azuum.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
    patterns=[
        # Will be populated in urls.py
    ]
)
