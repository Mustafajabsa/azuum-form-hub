from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


# ── Auth throttles ──────────────────────────────────────────

class LoginRateThrottle(AnonRateThrottle):
    """Strict limit on login attempts — prevents brute force."""
    scope = 'auth_login'


class RegisterRateThrottle(AnonRateThrottle):
    """Limit registration attempts — prevents account spam."""
    scope = 'auth_register'


# ── Upload throttles ────────────────────────────────────────

class FileUploadRateThrottle(UserRateThrottle):
    """Limit single file uploads — prevents disk exhaustion."""
    scope = 'file_upload'


class FolderUploadRateThrottle(UserRateThrottle):
    """Limit folder uploads — bulk uploads are more expensive."""
    scope = 'folder_upload'


# ── Download throttles ──────────────────────────────────────

class FileDownloadRateThrottle(UserRateThrottle):
    """Limit single file downloads — prevents bandwidth exhaustion."""
    scope = 'file_download'


class BulkDownloadRateThrottle(UserRateThrottle):
    """Limit zip generation — RAM and bandwidth intensive."""
    scope = 'bulk_download'


# ── Expensive operation throttles ───────────────────────────

class StorageStatsRateThrottle(UserRateThrottle):
    """Limit storage stats — walks entire disk recursively."""
    scope = 'storage_stats'


class FileSearchRateThrottle(UserRateThrottle):
    """Limit file listing and search — directory walking cost."""
    scope = 'file_search'


# ── Destructive operation throttles ─────────────────────────

class BulkDeleteRateThrottle(UserRateThrottle):
    """Limit bulk deletions — prevents mass data destruction."""
    scope = 'bulk_delete'


# ── Share throttles ─────────────────────────────────────────

class ShareCreateRateThrottle(UserRateThrottle):
    """Limit share link generation — prevents token spam."""
    scope = 'share_create'