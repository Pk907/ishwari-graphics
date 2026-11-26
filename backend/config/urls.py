from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.shortcuts import redirect
from django.templatetags.static import static as static_url
from django.urls import path

from site_api import views

admin.site.site_header = admin.site.site_title = 'Ishwari Graphics'

# shortcut: static() only serves media when DEBUG; in production serve /media/ from nginx or a CDN
urlpatterns = [
    # browsers ask for /favicon.ico; WhiteNoise serves the hashed copy. 302, not 301, so a changed icon's new hash is picked up
    path('favicon.ico', lambda request: redirect(static_url('favicon.ico'))),
    path('admin/', admin.site.urls),
    path('api/site/', views.site_data),
    path('api/manager/', views.manager_state),
    path('api/manager/orders/<str:id>/paid/', views.mark_paid),
    path('api/manager/orders/<str:id>/receipt/', views.order_receipt),
    path('api/manager/<str:kind>/', views.manager_save),
    path('api/manager/<str:kind>/<str:id>/', views.manager_delete),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
