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


class SupabaseStorageTests(TestCase):
    def test_storage_url_generation(self):
        from .storage import SupabaseStorage
        storage = SupabaseStorage(
            supabase_url='https://testproject.supabase.co',
            service_role_key='test-secret-key',
            bucket='django-media'
        )
        url = storage.url('posters/sample.jpg')
        self.assertEqual(
            url,
            'https://testproject.supabase.co/storage/v1/object/public/django-media/posters/sample.jpg'
        )
        # Ensure secret key is never part of public URL
        self.assertNotIn('test-secret-key', url)

    def test_storage_normalization_and_collision_prevention(self):
        from .storage import SupabaseStorage
        storage = SupabaseStorage(
            supabase_url='https://testproject.supabase.co',
            service_role_key='test-secret-key',
            bucket='django-media'
        )
        # Verify Windows backslashes normalize to POSIX forward slashes
        self.assertEqual(storage._normalize_name(r'posters\test.png'), 'posters/test.png')

        # Test collision handling using mock exists
        with mock.patch.object(storage, 'exists', side_effect=lambda name: name == 'posters/test.png'):
            new_name = storage.get_available_name('posters/test.png')
            self.assertEqual(new_name, 'posters/test_1.png')


