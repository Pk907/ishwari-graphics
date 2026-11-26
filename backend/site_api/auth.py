import hashlib
import json
import urllib.error
import urllib.request
from functools import wraps

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


def is_admin(token):
    """Ask Supabase (PostgREST verifies the JWT) whether this signed-in user passes the existing public.is_admin()."""
    key = 'admin:' + hashlib.sha256(token.encode()).hexdigest()
    cached = cache.get(key)
    if cached is not None:
        return cached
    req = urllib.request.Request(
        f'{settings.SUPABASE_URL}/rest/v1/rpc/is_admin', data=b'{}', method='POST',
        headers={'apikey': settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_ROLE_KEY,
                 'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            ok = json.load(r) is True
    except (urllib.error.URLError, ValueError):
        return False  # don't cache network errors
    cache.set(key, ok, 60)  # one Supabase round trip per minute instead of per click
    return ok


def admin_required(view):
    # Bearer-token auth sends no cookies, so CSRF can't apply
    @csrf_exempt
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        token = request.headers.get('Authorization', '').removeprefix('Bearer ').strip()
        if not (settings.SUPABASE_URL and token and is_admin(token)):
            return JsonResponse({'error': 'Sign in with a Supabase admin account.'}, status=403)
        return view(request, *args, **kwargs)
    return wrapped
