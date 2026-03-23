from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FormViewSet, FormFieldViewSet

router = DefaultRouter()
router.register(r'forms', FormViewSet)
router.register(r'fields', FormFieldViewSet)

app_name = 'forms'

urlpatterns = [
    path('', include(router.urls)),
]
