from django.conf import settings


def public_site_url(_request):
    return {'public_site_url': settings.PUBLIC_SITE_URL}
