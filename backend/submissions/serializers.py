from rest_framework import serializers
from .models import Submission, GeneratedPDF
from forms.models import Form


class SubmissionSerializer(serializers.ModelSerializer):
    """Serializer for form submissions"""
    form_title = serializers.CharField(source='form.title', read_only=True)
    submitter_name = serializers.CharField(source='submitter.get_full_name', read_only=True)
    submitter_email = serializers.CharField(source='submitter.email', read_only=True)
    
    class Meta:
        model = Submission
        fields = [
            'id', 'form', 'form_title', 'submitter', 'submitter_name', 
            'submitter_email', 'data', 'submitted_at'
        ]
        read_only_fields = ['submitter', 'submitted_at']


class SubmissionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating form submissions"""
    form_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Submission
        fields = ['form_id', 'data']
    
    def validate_form_id(self, value):
        """Validate that the form exists and is published"""
        try:
            form = Form.objects.get(id=value, status='published')
            return value
        except Form.DoesNotExist:
            raise serializers.ValidationError("Form not found or not published")
    
    def create(self, validated_data):
        form_id = validated_data.pop('form_id')
        form = Form.objects.get(id=form_id)
        
        return Submission.objects.create(
            form=form,
            submitter=self.context['request'].user,
            data=validated_data['data']
        )


class GeneratedPDFSerializer(serializers.ModelSerializer):
    """Serializer for generated PDFs"""
    submission_id = serializers.IntegerField(source='submission.id', read_only=True)
    form_title = serializers.CharField(source='submission.form.title', read_only=True)
    
    class Meta:
        model = GeneratedPDF
        fields = [
            'id', 'submission', 'submission_id', 'form_title', 
            'pdf_file', 'generated_at'
        ]
        read_only_fields = ['submission', 'generated_at']
