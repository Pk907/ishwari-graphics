from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Ordered(models.Model):
    order = models.PositiveIntegerField(default=0, help_text='Lower numbers show first')

    class Meta:
        abstract = True
        ordering = ['order', 'id']


class SiteSettings(models.Model):
    """Single row: business details shown across the site."""
    whatsapp = models.CharField(max_length=15, help_text='Country code + number, digits only, e.g. 919876543210')
    phone_display = models.CharField(max_length=30)
    address = models.CharField(max_length=255, blank=True)
    hours = models.CharField(max_length=120, blank=True)
    rating = models.CharField(max_length=5, blank=True)
    review_count = models.CharField(max_length=10, blank=True)
    maps_url = models.URLField(blank=True)
    instagram = models.URLField(blank=True)
    price_note = models.CharField(max_length=200, blank=True, help_text='Small note under the price list')

    class Meta:
        verbose_name_plural = 'site settings'

    def clean(self):
        if not self.pk and SiteSettings.objects.exists():
            raise ValidationError('Site settings already exist; edit the existing row.')

    def __str__(self):
        return 'Site settings'


class Poster(Ordered):
    # keys match the front end's WORK categories
    CATEGORIES = [
        ('Banners', 'Banners'), ('Wedding', 'Wedding cards'), ('Social', 'Social media'),
        ('Logos', 'Logos'), ('Political', 'Political'), ('Calligraphy', 'Calligraphy'),
        ('Printing', 'Printing'),
    ]
    title = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    tag = models.CharField(max_length=80, blank=True, help_text='Short caption, e.g. "Flex · 10×3 ft"')
    # originals are stored untouched so quality is never degraded
    image = models.ImageField(upload_to='posters/', width_field='width', height_field='height')
    width = models.PositiveIntegerField(editable=False, null=True)
    height = models.PositiveIntegerField(editable=False, null=True)
    published = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class Service(Ordered):
    DEMOS = [('banner', 'Banner size picker'), ('card', 'Flip card'), ('logo', 'Logo slider'),
             ('cmyk', 'CMYK ink'), ('phone', 'Phone feed')]
    demo = models.CharField(max_length=10, choices=DEMOS, blank=True, help_text='Interactive widget shown in this panel')
    title_line1 = models.CharField(max_length=40)
    title_line2 = models.CharField(max_length=40, blank=True)
    english = models.CharField(max_length=60)
    items = models.TextField(help_text='One bullet per line')
    color = models.CharField(
        max_length=30, default='var(--saffron)',
        help_text='CSS colour: var(--saffron), var(--gold), var(--magenta), var(--cyan), var(--green) or a hex code')
    published = models.BooleanField(default=True)

    def __str__(self):
        return self.english


class Price(Ordered):
    item = models.CharField(max_length=80)
    price = models.CharField(max_length=60, help_text='Free text, e.g. ₹12 / चौ.फूट पासून')

    def __str__(self):
        return self.item


class Review(Ordered):
    name = models.CharField(max_length=80)
    text = models.TextField()
    when = models.CharField(max_length=40, blank=True, help_text='e.g. 2 आठवड्यांपूर्वी')
    published = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Step(Ordered):
    title = models.CharField(max_length=60)
    text = models.CharField(max_length=200)

    def __str__(self):
        return self.title


class InstagramPost(models.Model):
    """Filled by `manage.py sync_instagram`, or added by hand in the admin."""
    image = models.ImageField(upload_to='instagram/')
    permalink = models.URLField(help_text='Link to the post on Instagram')
    caption = models.TextField(blank=True)
    posted_at = models.DateTimeField(default=timezone.now)
    ig_id = models.CharField(max_length=40, unique=True, null=True, blank=True, editable=False)
    published = models.BooleanField(default=True)

    class Meta:
        ordering = ['-posted_at']

    def __str__(self):
        return self.caption[:40] or self.permalink


class Stat(Ordered):
    value = models.CharField(max_length=10, help_text='e.g. 10')
    suffix = models.CharField(max_length=10, blank=True, help_text='e.g. +')
    label = models.CharField(max_length=60)

    def __str__(self):
        return f'{self.value}{self.suffix} {self.label}'


# ---- Business Manager (orders and money). Amounts are whole rupees, like the Manager UI. ----

class Party(models.Model):
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)

    class Meta:
        abstract = True
        ordering = ['id']

    def __str__(self):
        return self.name


class Customer(Party):
    pass


class Vendor(Party):
    pass


class Order(models.Model):
    STATUSES = [(s, s) for s in ['Pending', 'Designing', 'Sent for Printing', 'Completed', 'Delivered']]
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='orders')
    desc = models.CharField('description', max_length=200)
    design = models.PositiveIntegerField('design charges', default=0)
    printing = models.PositiveIntegerField('printing charges', default=0)
    discount = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUSES, default='Pending')
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, null=True, blank=True, related_name='orders')
    cost = models.PositiveIntegerField('vendor printing cost', default=0)
    date = models.DateField(default=timezone.localdate)
    # set by "Mark as paid" once payments cover the total; cleared if the balance reopens
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['id']

    @property
    def total(self):
        return self.design + self.printing - self.discount

    def received(self):
        return self.transactions.filter(type='customer_payment').aggregate(s=models.Sum('amount'))['s'] or 0

    def clean(self):
        if self.discount > self.design + self.printing:
            raise ValidationError('Discount is more than the order amount.')

    def __str__(self):
        return f'ORD-{1000 + (self.pk or 0)}'


class Transaction(models.Model):
    TYPES = [('customer_payment', 'Customer payment'), ('vendor_payment', 'Vendor payment'), ('expense', 'Expense')]
    type = models.CharField(max_length=20, choices=TYPES)
    date = models.DateField(default=timezone.localdate)
    amount = models.PositiveIntegerField()
    method = models.CharField(max_length=20, blank=True)
    reference = models.CharField(max_length=60, blank=True, help_text='UPI / bank transaction ID')
    note = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=40, blank=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, null=True, blank=True, related_name='transactions')
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, null=True, blank=True, related_name='transactions')

    class Meta:
        ordering = ['id']

    def clean(self):
        if self.type != 'expense' and not self.order_id:
            raise ValidationError('Payments must be linked to an order.')
        if not self.amount:
            raise ValidationError('Amount must be more than zero.')

    def __str__(self):
        return f'{self.get_type_display()} {self.amount}'


def receipt_storage():
    # receipts are private: a non-public Supabase bucket in production, a folder outside MEDIA_ROOT locally
    from django.conf import settings
    from django.core.files.storage import FileSystemStorage
    from .storage import SupabaseStorage
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        return SupabaseStorage(bucket=settings.SUPABASE_RECEIPT_BUCKET, public=False)
    return FileSystemStorage(location=settings.BASE_DIR / 'private')


class Receipt(models.Model):
    """One payment receipt per fully paid order; the unique order link is what stops duplicates."""
    order = models.OneToOneField(Order, on_delete=models.PROTECT, related_name='receipt')
    pdf = models.FileField(upload_to='receipts/', storage=receipt_storage, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-id']

    @property
    def number(self):
        return f'IGR-{timezone.localtime(self.created_at):%Y}-{self.pk:05d}'

    def __str__(self):
        return self.number
