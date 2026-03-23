from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Form, FormField
from .serializers import (
    FormSerializer, 
    FormCreateSerializer, 
    FormUpdateSerializer,
    FormFieldSerializer
)


class FormViewSet(viewsets.ModelViewSet):
    """ViewSet for managing forms"""
    queryset = Form.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'creator']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return FormCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return FormUpdateSerializer
        return FormSerializer
    
    def get_queryset(self):
        # Filter forms based on user role
        user = self.request.user
        if user.role in ['super_admin', 'admin', 'manager']:
            # Admins and managers can see all forms
            return Form.objects.all()
        else:
            # Other users can only see their own forms
            return Form.objects.filter(creator=user)
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a form"""
        form = self.get_object()
        if form.status == 'published':
            return Response(
                {'detail': 'Form is already published'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        form.status = 'published'
        form.save()
        return Response({'detail': 'Form published successfully'})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a form"""
        form = self.get_object()
        if form.status == 'archived':
            return Response(
                {'detail': 'Form is already archived'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        form.status = 'archived'
        form.save()
        return Response({'detail': 'Form archived successfully'})
    
    @action(detail=True, methods=['get'])
    def clone(self, request, pk=None):
        """Clone a form"""
        original_form = self.get_object()
        
        # Create new form
        new_form = Form.objects.create(
            title=f"{original_form.title} (Copy)",
            description=original_form.description,
            status='draft',
            creator=request.user
        )
        
        # Clone fields
        for field in original_form.fields.all():
            FormField.objects.create(
                form=new_form,
                label=field.label,
                field_type=field.field_type,
                required=field.required,
                placeholder=field.placeholder,
                options=field.options,
                order=field.order
            )
        
        serializer = self.get_serializer(new_form)
        return Response(serializer.data)


class FormFieldViewSet(viewsets.ModelViewSet):
    """ViewSet for managing form fields"""
    queryset = FormField.objects.all()
    serializer_class = FormFieldSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only return fields for forms the user can access
        form_id = self.request.query_params.get('form_id')
        if form_id:
            try:
                form = Form.objects.get(id=form_id)
                user = self.request.user
                
                # Check if user can access this form
                if (user.role in ['super_admin', 'admin', 'manager'] or 
                    form.creator == user):
                    return FormField.objects.filter(form=form)
            except Form.DoesNotExist:
                pass
        
        return FormField.objects.none()
