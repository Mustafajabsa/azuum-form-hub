from rest_framework import serializers
from .models import Form, FormField


class FormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormField
        fields = ['id', 'label', 'field_type', 'required', 'placeholder', 'options', 'order']


class FormSerializer(serializers.ModelSerializer):
    fields = FormFieldSerializer(many=True, read_only=True)
    creator_name = serializers.CharField(source='creator.get_full_name', read_only=True)
    
    class Meta:
        model = Form
        fields = [
            'id', 'title', 'description', 'status', 'creator', 'creator_name',
            'created_at', 'updated_at', 'fields'
        ]
        read_only_fields = ['creator', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Set the creator to the current authenticated user
        validated_data['creator'] = self.context['request'].user
        return super().create(validated_data)


class FormCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating forms with fields"""
    fields = FormFieldSerializer(many=True)
    
    class Meta:
        model = Form
        fields = ['title', 'description', 'status', 'fields']
        read_only_fields = ['creator']
    
    def create(self, validated_data):
        fields_data = validated_data.pop('fields', [])
        form = Form.objects.create(**validated_data, creator=self.context['request'].user)
        
        # Create form fields
        for field_data in fields_data:
            FormField.objects.create(form=form, **field_data)
        
        return form


class FormUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating forms and their fields"""
    fields = FormFieldSerializer(many=True, partial=True)
    
    class Meta:
        model = Form
        fields = ['title', 'description', 'status', 'fields']
    
    def update(self, instance, validated_data):
        fields_data = validated_data.pop('fields', None)
        
        # Update form fields if provided
        if fields_data is not None:
            # Clear existing fields
            instance.fields.all().delete()
            
            # Create new fields
            for field_data in fields_data:
                FormField.objects.create(form=instance, **field_data)
        
        # Update form
        return super().update(instance, validated_data)
