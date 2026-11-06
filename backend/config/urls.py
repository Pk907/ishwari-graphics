from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from site_api.views import site_data

admin.site.site_header = admin.site.site_title = 'Ishwari Graphics'

# shortcut: static() only serves media when DEBUG; in production serve /media/ from nginx or a CDN
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/site/', site_data),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
