from django.contrib import admin
from django.utils.html import format_html

from .models import InstagramPost, Poster, Price, Review, Service, SiteSettings, Stat, Step


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Poster)
class PosterAdmin(admin.ModelAdmin):
    list_display = ['thumb', 'title', 'category', 'published', 'order']
    list_display_links = ['thumb', 'title']
    list_editable = ['published', 'order']
    list_filter = ['category', 'published']
    search_fields = ['title', 'tag']
    readonly_fields = ['thumb']

    @admin.display(description='Preview')
    def thumb(self, obj):
        return format_html('<img src="{}" style="height:60px;border-radius:4px">', obj.image.url) if obj.image else '-'


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['english', 'published', 'order']
    list_editable = ['published', 'order']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['name', 'published', 'order']
    list_editable = ['published', 'order']


@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    list_display = ['item', 'price', 'order']
    list_editable = ['price', 'order']


@admin.register(Stat)
class StatAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'order']
    list_editable = ['order']


@admin.register(Step)
class StepAdmin(admin.ModelAdmin):
    list_display = ['title', 'text', 'order']
    list_editable = ['order']


@admin.register(InstagramPost)
class InstagramPostAdmin(admin.ModelAdmin):
    list_display = ['thumb', '__str__', 'posted_at', 'published']
    list_display_links = ['thumb', '__str__']
    list_editable = ['published']
    readonly_fields = ['thumb']

    @admin.display(description='Preview')
    def thumb(self, obj):
        return format_html('<img src="{}" style="height:60px;border-radius:4px">', obj.image.url) if obj.image else '-'
