import json
import mimetypes
import os
import posixpath
import urllib.error
import urllib.parse
import urllib.request
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


@deconstructible
class SupabaseStorage(Storage):
    """
    Persistent Django file storage using Supabase Storage REST API.
    Uploads are authenticated using the server-side SUPABASE_SERVICE_ROLE_KEY to a dedicated
    media bucket (e.g. 'django-media').
    Public read URLs are returned for frontend display without exposing credentials.
    """

    def __init__(self, **kwargs):
        self.supabase_url = (
            kwargs.get('supabase_url')
            or getattr(settings, 'SUPABASE_URL', None)
            or os.environ.get('SUPABASE_URL', '')
        ).rstrip('/')

        self.service_role_key = (
            kwargs.get('service_role_key')
            or getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)
            or os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
        ).strip()

        self.bucket = (
            kwargs.get('bucket')
            or getattr(settings, 'SUPABASE_MEDIA_BUCKET', None)
            or os.environ.get('SUPABASE_MEDIA_BUCKET', 'django-media')
        ).strip()

        # public=False: private bucket, reads are signed with the service-role key and no public URL exists
        self.public = kwargs.get('public', True)

        self.base_url = f"{self.supabase_url}/storage/v1"

    def _read_headers(self):
        return {} if self.public else {'Authorization': f'Bearer {self.service_role_key}', 'apikey': self.service_role_key}

    def _normalize_name(self, name):
        """Normalize name to forward slashes without leading slashes."""
        return str(name).replace('\\', '/').lstrip('/')

    def get_available_name(self, name, max_length=None):
        """
        Ensure filenames are unique and prevent accidental overwrites.
        If a file already exists in Supabase Storage, append an incremental counter (_1, _2, etc.).
        Always uses clean POSIX forward slashes regardless of host OS.
        """
        clean_name = self._normalize_name(name)
        dir_name, file_name = posixpath.split(clean_name)
        file_root, file_ext = posixpath.splitext(file_name)

        candidate = clean_name
        count = 1
        while self.exists(candidate):
            candidate = posixpath.join(dir_name, f"{file_root}_{count}{file_ext}")
            count += 1

        return candidate

    def _save(self, name, content):
        clean_name = self._normalize_name(name)
        if not self.supabase_url or not self.service_role_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use SupabaseStorage.")

        content_type, _ = mimetypes.guess_type(clean_name)
        if not content_type:
            content_type = getattr(content, 'content_type', 'application/octet-stream')

        # Read content bytes
        if hasattr(content, 'read'):
            content.seek(0)
            data = content.read()
        else:
            data = bytes(content)

        encoded_path = '/'.join(urllib.parse.quote(part) for part in clean_name.split('/'))
        url = f"{self.base_url}/object/{urllib.parse.quote(self.bucket)}/{encoded_path}"

        # Note: x-upsert is set to false to prevent accidental overwrites
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                'Authorization': f'Bearer {self.service_role_key}',
                'apikey': self.service_role_key,
                'Content-Type': content_type,
                'x-upsert': 'false',
            },
            method='POST',
        )

        try:
            with urllib.request.urlopen(req, timeout=30):
                pass
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8', errors='ignore')
            raise OSError(f"Supabase Storage upload failed with status {e.code}: {error_body}") from e
        except Exception as e:
            raise OSError(f"Supabase Storage upload error: {e}") from e

        return clean_name

    def _open(self, name, mode='rb'):
        clean_name = self._normalize_name(name)
        url = self.url(clean_name)
        req = urllib.request.Request(url, headers=self._read_headers())
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return ContentFile(r.read(), name=clean_name)
        except Exception as e:
            raise OSError(f"Could not open file '{clean_name}' from Supabase Storage: {e}") from e

    def exists(self, name):
        clean_name = self._normalize_name(name)
        if not self.supabase_url:
            return False
        url = self.url(clean_name)
        req = urllib.request.Request(url, method='HEAD', headers=self._read_headers())
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status == 200
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):
                return False
            raise
        except Exception:
            return False

    def size(self, name):
        clean_name = self._normalize_name(name)
        if not self.supabase_url:
            return 0
        url = self.url(clean_name)
        req = urllib.request.Request(url, method='HEAD', headers=self._read_headers())
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                length = r.headers.get('Content-Length')
                return int(length) if length else 0
        except Exception as e:
            raise OSError(f"Could not determine size of '{clean_name}': {e}") from e

    def delete(self, name):
        clean_name = self._normalize_name(name)
        if not self.supabase_url or not self.service_role_key:
            return
        url = f"{self.base_url}/object/{urllib.parse.quote(self.bucket)}"
        payload = json.dumps({'prefixes': [clean_name]}).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                'Authorization': f'Bearer {self.service_role_key}',
                'apikey': self.service_role_key,
                'Content-Type': 'application/json',
            },
            method='DELETE',
        )
        try:
            with urllib.request.urlopen(req, timeout=20):
                pass
        except Exception:
            pass

    def url(self, name):
        """
        Return public CDN URL for the object.
        Notice: Service role credentials are NEVER included or exposed in this URL.
        """
        clean_name = self._normalize_name(name)
        encoded_path = '/'.join(urllib.parse.quote(part) for part in clean_name.split('/'))
        access = 'public' if self.public else 'authenticated'
        return f"{self.base_url}/object/{access}/{urllib.parse.quote(self.bucket)}/{encoded_path}"
