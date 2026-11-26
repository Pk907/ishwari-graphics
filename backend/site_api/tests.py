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




class ManagerApiTests(TestCase):
    """Orders, payments, mark-as-paid and the one-receipt-per-order rule, through the admin-only API."""

    def setUp(self):
        import tempfile
        from django.core.files.storage import FileSystemStorage
        from .models import Receipt
        self.enterContext(self.settings(SUPABASE_URL='https://test.supabase.co'))
        self.enterContext(mock.patch('site_api.auth.is_admin', return_value=True))
        field = Receipt._meta.get_field('pdf')
        self.enterContext(mock.patch.object(field, 'storage', FileSystemStorage(self.enterContext(tempfile.TemporaryDirectory()))))

    def api(self, method, path, body=None):
        data = {'data': json.dumps(body or {}), 'content_type': 'application/json'} if method == 'post' else {}
        return getattr(self.client, method)(f'/api/manager/{path}', **data, HTTP_AUTHORIZATION='Bearer t')

    def new_order(self, advance=0, discount=0):
        r = self.api('post', 'orders/', {'row': {'desc': 'Flex & banner 10x3', 'design': 800, 'print': 3200, 'discount': discount,
                                                 'status': 'Pending', 'date': '2026-11-01'},
                                         'customer': {'name': 'Rahul & Sons', 'phone': '9822011101'},
                                         'advance': {'amount': advance, 'method': 'Cash'}})
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['orders'][-1]['id']

    def pay(self, order, amount, **kw):
        return self.api('post', 'transactions/', {'row': {'type': 'customer_payment', 'orderId': order, 'amount': amount,
                                                          'date': '2026-11-02', 'method': 'UPI', **kw}})

    def test_requires_admin(self):
        self.assertEqual(self.client.get('/api/manager/').status_code, 403)
        with mock.patch('site_api.auth.is_admin', return_value=False):
            self.assertEqual(self.api('get', '').status_code, 403)

    def test_paid_receipt_once(self):
        oid = self.new_order(advance=1000, discount=500)  # total 3500
        self.assertEqual(oid, 'ORD-1001')
        self.assertEqual(self.api('post', f'orders/{oid}/receipt/').status_code, 400)  # not paid yet
        self.assertEqual(self.api('post', f'orders/{oid}/paid/').status_code, 400)  # 2500 still due
        self.assertEqual(self.pay(oid, 3000).status_code, 400)  # more than the balance
        self.assertEqual(self.pay(oid, 2500, reference='UPI123').status_code, 200)
        order = self.api('post', f'orders/{oid}/paid/').json()['orders'][0]
        self.assertTrue(order['paidAt'])

        r1 = self.api('post', f'orders/{oid}/receipt/')
        self.assertEqual(r1.status_code, 200)
        pdf = b''.join(r1.streaming_content)
        self.assertTrue(pdf.startswith(b'%PDF'))
        # repeat "Generate bill" and "Download" return the stored PDF; rendering again would raise
        with mock.patch('site_api.views.render_receipt', side_effect=AssertionError('receipt regenerated')):
            r2 = self.api('post', f'orders/{oid}/receipt/')
            r3 = self.api('get', f'orders/{oid}/receipt/')
            self.assertEqual(r1['Content-Disposition'], r2['Content-Disposition'])
            self.assertEqual(r1['Content-Disposition'], r3['Content-Disposition'])
            self.assertEqual(b''.join(r2.streaming_content), pdf)
            self.assertEqual(b''.join(r3.streaming_content), pdf)
        for r in (r1, r2, r3):
            r.close()  # release the PDF file handle (Windows can't delete open files)
        from .models import Receipt
        self.assertEqual(Receipt.objects.count(), 1)

        # a receipted order's charges and payments are frozen, and it can't be deleted
        state = self.api('get', '').json()
        self.assertRegex(state['orders'][0]['receipt'], r'^IGR-\d{4}-00001$')
        tid = state['transactions'][-1]['id']
        self.assertEqual(self.api('delete', f'transactions/{tid}/').status_code, 400)
        self.assertEqual(self.api('post', 'orders/', {'row': {**state['orders'][0], 'design': 900}}).status_code, 400)
        self.assertEqual(self.api('post', 'orders/', {'row': {**state['orders'][0], 'status': 'Delivered'}}).status_code, 200)
        self.assertEqual(self.api('delete', f'orders/{oid}/').status_code, 400)
        # no API route can remove the receipt, directly or by deleting what it hangs off
        self.assertEqual(self.api('delete', 'receipts/1/').status_code, 404)
        self.assertEqual(self.api('delete', f'orders/{oid}/receipt/').status_code, 405)
        self.assertEqual(self.api('delete', f"customers/{state['orders'][0]['customerId']}/").status_code, 400)
        self.assertEqual(Receipt.objects.count(), 1)

    def test_reopened_balance_clears_paid(self):
        oid = self.new_order(advance=4000)
        self.api('post', f'orders/{oid}/paid/')
        state = self.api('get', '').json()
        self.assertTrue(state['orders'][0]['paidAt'])
        state = self.api('delete', f"transactions/{state['transactions'][0]['id']}/").json()
        self.assertIsNone(state['orders'][0]['paidAt'])


class ReceiptAdminTests(TestCase):
    def test_admin_cannot_delete_receipt(self):
        from django.conf import settings
        from django.contrib.auth.models import User
        from .models import Customer, Order, Receipt
        # admin pages need static URLs; the production manifest storage only works after collectstatic
        self.enterContext(self.settings(STORAGES={**settings.STORAGES, 'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}}))
        r = Receipt.objects.create(order=Order.objects.create(customer=Customer.objects.create(name='A'), desc='x'))
        self.client.force_login(User.objects.create_superuser('admin', 'a@example.com', 'pw'))
        self.assertEqual(self.client.get(f'/admin/site_api/receipt/{r.pk}/delete/').status_code, 403)
        self.client.post('/admin/site_api/receipt/', {'action': 'delete_selected', '_selected_action': [r.pk], 'post': 'yes'})
        self.assertTrue(Receipt.objects.filter(pk=r.pk).exists())
