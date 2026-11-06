import json
import os
import urllib.parse
import urllib.request

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_datetime

from site_api.models import InstagramPost

API = 'https://graph.instagram.com'
FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'


def fetch(url):
    with urllib.request.urlopen(url, timeout=20) as r:
        return r.read()


class Command(BaseCommand):
    help = ('Import the latest posts from the studio Instagram account (Instagram API with Instagram Login). '
            'Needs INSTAGRAM_ACCESS_TOKEN of a Business/Creator account. Run it daily from cron or Task Scheduler.')

    def handle(self, *args, **opts):
        token = os.environ.get('INSTAGRAM_ACCESS_TOKEN')
        if not token:
            raise CommandError('Set INSTAGRAM_ACCESS_TOKEN first (see README: Instagram sync).')
        q = urllib.parse.urlencode({'fields': FIELDS, 'limit': 12, 'access_token': token})
        posts = json.loads(fetch(f'{API}/me/media?{q}'))['data']

        added = 0
        for m in posts:
            if InstagramPost.objects.filter(ig_id=m['id']).exists():
                continue
            # Instagram image links expire, so keep our own copy; videos use their cover frame
            src = m.get('thumbnail_url') if m['media_type'] == 'VIDEO' else m.get('media_url')
            if not src:
                continue
            p = InstagramPost(ig_id=m['id'], permalink=m['permalink'], caption=m.get('caption', ''),
                              posted_at=parse_datetime(m['timestamp']))
            p.image.save(f"{m['id']}.jpg", ContentFile(fetch(src)), save=True)
            added += 1
        self.stdout.write(f'Instagram: {added} new post(s)')

        # long-lived tokens last 60 days; refreshing on each run keeps this one alive
        try:
            fetch(f'{API}/refresh_access_token?' + urllib.parse.urlencode({'grant_type': 'ig_refresh_token', 'access_token': token}))
        except OSError as e:
            self.stderr.write(f'Token refresh failed: {e}')
