import json
from functools import wraps

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import ProtectedError
from django.http import FileResponse, Http404, JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .auth import admin_required
from .models import (Customer, InstagramPost, Order, Poster, Price, Receipt, Review, Service, SiteSettings, Stat, Step,
                     Transaction, Vendor)
from .receipts import render_receipt


def site_data(request):
    """Everything the React site renders, in one read-only call."""
    s = SiteSettings.objects.first()
    return JsonResponse({
        'settings': {
            'whatsapp': s.whatsapp, 'phoneDisplay': s.phone_display, 'address': s.address,
            'hours': s.hours, 'rating': s.rating, 'reviewCount': s.review_count,
            'mapsUrl': s.maps_url, 'instagram': s.instagram, 'priceNote': s.price_note,
        } if s else None,
        'posters': [
            {'id': p.id, 'title': p.title, 'category': p.category, 'tag': p.tag,
             'image': request.build_absolute_uri(p.image.url), 'width': p.width, 'height': p.height}
            for p in Poster.objects.filter(published=True)
        ],
        'services': [
            {'id': x.id, 'title': [x.title_line1, x.title_line2], 'en': x.english,
             'items': [i for i in x.items.splitlines() if i.strip()], 'color': x.color, 'demo': x.demo}
            for x in Service.objects.filter(published=True)
        ],
        'prices': [{'item': x.item, 'price': x.price} for x in Price.objects.all()],
        'reviews': [{'name': x.name, 'text': x.text, 'when': x.when} for x in Review.objects.filter(published=True)],
        'steps': [{'title': x.title, 'text': x.text} for x in Step.objects.all()],
        'instagram': [
            {'image': request.build_absolute_uri(x.image.url), 'link': x.permalink, 'caption': x.caption[:140]}
            for x in InstagramPost.objects.filter(published=True)[:5]
        ],
        'stats': [{'value': x.value, 'suffix': x.suffix, 'label': x.label} for x in Stat.objects.all()],
    })


# ---- Business Manager API (admin only). Rows use the Manager's JSON shape and display ids (ORD-1001, C-01, T-0001). ----

CODES = {'customers': ('C-', 0, 2), 'vendors': ('V-', 0, 2), 'orders': ('ORD-', 1000, 0), 'transactions': ('T-', 0, 4)}
MODELS = {'customers': Customer, 'vendors': Vendor, 'orders': Order, 'transactions': Transaction}
# JSON key -> model field; keys ending in Id carry display ids of the kind in ID_KIND
FIELDS = {
    'customers': {'name': 'name', 'phone': 'phone', 'address': 'address'},
    'orders': {'customerId': 'customer_id', 'desc': 'desc', 'design': 'design', 'print': 'printing', 'discount': 'discount',
               'status': 'status', 'vendorId': 'vendor_id', 'cost': 'cost', 'date': 'date'},
    'transactions': {'type': 'type', 'date': 'date', 'amount': 'amount', 'method': 'method', 'reference': 'reference',
                     'note': 'note', 'category': 'category', 'orderId': 'order_id', 'vendorId': 'vendor_id'},
}
FIELDS['vendors'] = FIELDS['customers']
ID_KIND = {'customerId': 'customers', 'vendorId': 'vendors', 'orderId': 'orders'}
LOCKED = ['customer_id', 'design', 'printing', 'discount']  # fixed once a receipt exists
RECEIPT_LOCK = 'This order already has a receipt, so its customer payments can no longer change.'


def code(kind, pk):
    prefix, offset, pad = CODES[kind]
    return f'{prefix}{pk + offset:0{pad}d}' if pk else ''


def pk_of(kind, value):
    prefix, offset, _ = CODES[kind]
    try:
        return int(str(value).removeprefix(prefix)) - offset if value else None
    except ValueError:
        raise ValidationError(f'Unknown id {value}.')


def manager_json():
    def party(kind):
        return [{'id': code(kind, x.pk), 'name': x.name, 'phone': x.phone, 'address': x.address} for x in MODELS[kind].objects.all()]
    # shortcut: every call returns all rows (fine for thousands); page by date when the payload gets slow
    return JsonResponse({
        'customers': party('customers'),
        'vendors': party('vendors'),
        'orders': [{
            'id': code('orders', o.pk), 'customerId': code('customers', o.customer_id), 'desc': o.desc, 'design': o.design,
            'print': o.printing, 'discount': o.discount, 'status': o.status, 'vendorId': code('vendors', o.vendor_id),
            'cost': o.cost, 'date': o.date.isoformat(), 'paidAt': o.paid_at and o.paid_at.isoformat(),
            'receipt': o.receipt.number if hasattr(o, 'receipt') else None,
        } for o in Order.objects.select_related('receipt')],
        'transactions': [{
            'id': code('transactions', t.pk), 'type': t.type, 'date': t.date.isoformat(), 'amount': t.amount, 'method': t.method,
            'reference': t.reference, 'note': t.note, 'category': t.category,
            'orderId': code('orders', t.order_id), 'vendorId': code('vendors', t.vendor_id),
        } for t in Transaction.objects.all()],
    })


def has_receipt(order_id):
    return bool(order_id) and Receipt.objects.filter(order_id=order_id).exists()


def settle(order_id):
    """Payments may never exceed the total; a paid order whose balance reopens is no longer paid."""
    if not order_id:
        return
    o = Order.objects.get(pk=order_id)
    received = o.received()
    if received > o.total:
        raise ValidationError(f'{o}: payments (Rs. {received}) would be more than the order total (Rs. {o.total}).')
    if o.paid_at and received < o.total:
        o.paid_at = None
        o.save(update_fields=['paid_at'])


def upsert(kind, row):
    Model = MODELS[kind]
    obj = Model.objects.get(pk=pk_of(kind, row['id'])) if row.get('id') else Model()
    old = Model.objects.filter(pk=obj.pk).values().first() or {}
    for key, field in FIELDS[kind].items():
        if key in row:
            setattr(obj, field, pk_of(ID_KIND[key], row[key]) if key in ID_KIND else row[key])
    if kind == 'transactions' and obj.type == 'vendor_payment' and obj.order_id:
        obj.vendor_id = Order.objects.get(pk=obj.order_id).vendor_id
    obj.full_clean()
    if kind == 'orders' and has_receipt(obj.pk) and any(old[f] != getattr(obj, f) for f in LOCKED):
        raise ValidationError(f'{obj} already has a receipt, so its customer and charges can no longer change.')
    if kind == 'transactions' and 'customer_payment' in (obj.type, old.get('type')) \
            and (has_receipt(obj.order_id) or has_receipt(old.get('order_id'))):
        raise ValidationError(RECEIPT_LOCK)
    obj.save()
    if kind == 'orders':
        settle(obj.pk)
    if kind == 'transactions':
        settle(obj.order_id)
        if old.get('order_id') != obj.order_id:
            settle(old.get('order_id'))
    return obj


def manager_errors(view):
    """Runs the view in one DB transaction and turns rule violations into {error} responses the Manager shows."""
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        try:
            with transaction.atomic():
                return view(request, *args, **kwargs)
        except ValidationError as e:
            return JsonResponse({'error': ' '.join(e.messages)}, status=400)
        except ProtectedError:
            return JsonResponse({'error': 'This is linked to other records (orders, payments or a receipt), so it cannot be deleted.'}, status=400)
        except ObjectDoesNotExist:
            return JsonResponse({'error': 'Record not found. Refresh and try again.'}, status=404)
    return wrapped


@admin_required
@require_GET
def manager_state(request):
    return manager_json()


@admin_required
@require_POST
@manager_errors
def manager_save(request, kind):
    """Body: {row} upserts one row. A new order may also carry {customer} (created first) and {advance: {amount, method}}."""
    if kind not in MODELS:
        raise Http404
    try:
        body = json.loads(request.body or b'{}')
    except ValueError:
        raise ValidationError('Invalid JSON.')
    row = dict(body.get('row') or {})
    if kind == 'orders' and body.get('customer'):
        row['customerId'] = code('customers', upsert('customers', body['customer']).pk)
    obj = upsert(kind, row)
    advance = body.get('advance') or {}
    if kind == 'orders' and not row.get('id') and advance.get('amount'):
        upsert('transactions', {'type': 'customer_payment', 'orderId': code('orders', obj.pk), 'note': 'Advance',
                                'date': obj.date, 'amount': advance['amount'], 'method': advance.get('method', '')})
    return manager_json()


@admin_required
@require_http_methods(['DELETE'])
@manager_errors
def manager_delete(request, kind, id):
    if kind not in MODELS:
        raise Http404
    obj = MODELS[kind].objects.get(pk=pk_of(kind, id))
    if kind == 'transactions' and obj.type == 'customer_payment' and has_receipt(obj.order_id):
        raise ValidationError(RECEIPT_LOCK)
    obj.delete()  # an order's payments go with it (CASCADE); a receipt or linked orders block it (PROTECT)
    if kind == 'transactions':
        settle(obj.order_id)
    return manager_json()


@admin_required
@require_POST
@manager_errors
def mark_paid(request, id):
    o = Order.objects.select_for_update().get(pk=pk_of('orders', id))
    due = o.total - o.received()
    if due > 0:
        raise ValidationError(f'{o} still has Rs. {due} to be received.')
    if not o.paid_at:
        o.paid_at = timezone.now()
        o.save(update_fields=['paid_at'])
    return manager_json()


@admin_required
@require_http_methods(['GET', 'POST'])
@manager_errors
def order_receipt(request, id):
    """POST creates the order's receipt once (repeat calls return the same one); GET downloads an existing one."""
    o = Order.objects.select_for_update().get(pk=pk_of('orders', id))  # serialises double clicks on "Generate bill"
    r = Receipt.objects.filter(order=o).first()
    if not r:
        if request.method == 'GET':
            raise Http404
        if not o.paid_at:
            raise ValidationError(f'Mark {o} as paid before generating the bill.')
        r = Receipt.objects.create(order=o)
        r.pdf.save(f'{r.number}.pdf', ContentFile(render_receipt(r)))
    return FileResponse(r.pdf.open('rb'), as_attachment=True, filename=f'{r.number}.pdf', content_type='application/pdf')
