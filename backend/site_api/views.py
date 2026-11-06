from django.http import JsonResponse

from .models import InstagramPost, Poster, Price, Review, Service, SiteSettings, Stat, Step


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
