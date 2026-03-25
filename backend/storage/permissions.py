from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners to edit objects.
    Read-only access is allowed for any authenticated user.
    """
    
    def has_object_permission(self, request, view, obj):
        # Allow read-only access for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Write permissions only for object owner
        if obj and hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        # For queryset-level operations, check if user is authenticated
        return request.user.is_authenticated
