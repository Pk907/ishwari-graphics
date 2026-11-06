import io
import json
import os
from unittest import mock

from django.core.management import call_command
from django.test import TestCase
from PIL import Image

from .models import InstagramPost, Review


class SiteDataTests(TestCase):
    def test_empty_site_returns_json(self):
        r = self.client.get('/api/site/')
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()['settings'])

    def test_unpublished_review_hidden(self):
        Review.objects.create(name='a', text='x', published=False)
        Review.objects.create(name='b', text='y')
        self.assertEqual([x['name'] for x in self.client.get('/api/site/').json()['reviews']], ['b'])


class SyncInstagramTests(TestCase):
    def fake_fetch(self, url):
        if 'refresh_access_token' in url:
            return b'{}'
        if '/me/media' in url:
            return json.dumps({'data': [{
                'id': '1', 'caption': 'hello', 'media_type': 'IMAGE', 'media_url': 'https://cdn/x.jpg',
                'permalink': 'https://www.instagram.com/p/abc/', 'timestamp': '2026-11-01T10:00:00+0000'}]}).encode()
        b = io.BytesIO()
        Image.new('RGB', (10, 10)).save(b, 'JPEG')
        return b.getvalue()

    def test_sync_imports_once(self):
        with mock.patch.dict(os.environ, {'INSTAGRAM_ACCESS_TOKEN': 't'}), \
                mock.patch('site_api.management.commands.sync_instagram.fetch', self.fake_fetch), \
                self.settings(MEDIA_ROOT=self.enterContext(__import__('tempfile').TemporaryDirectory())):
            call_command('sync_instagram')
            call_command('sync_instagram')
            self.assertEqual(InstagramPost.objects.count(), 1)
            self.assertEqual(self.client.get('/api/site/').json()['instagram'][0]['caption'], 'hello')
