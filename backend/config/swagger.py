from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from drf_yasg.generators import OpenAPISchemaGenerator


class CustomSchemaGenerator(OpenAPISchemaGenerator):
    """Custom schema generator for better API documentation"""
    def get_schema(self, request=None, public=True):
        schema = super().get_schema(request, public)
        return schema


schema_view = get_schema_view(
    openapi.Info(
        title="Azuum Form Hub API",
        default_version='v1',
        description="Comprehensive form management and file storage API with advanced features",
        terms_of_service="https://azuumformhub.com/terms/",
        contact=openapi.Contact(email="support@azuum.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    generator_class=CustomSchemaGenerator,
    permission_classes=(permissions.AllowAny,),
)