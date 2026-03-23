from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubmissionViewSet, GeneratedPDFViewSet

router = DefaultRouter()
router.register(r'submissions', SubmissionViewSet)
router.register(r'pdfs', GeneratedPDFViewSet)

app_name = 'submissions'

urlpatterns = [
    path('', include(router.urls)),
]
