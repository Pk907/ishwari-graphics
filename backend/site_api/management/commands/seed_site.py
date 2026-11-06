from django.core.management.base import BaseCommand

from site_api.models import Price, Service, SiteSettings, Stat, Step

PRICES = [
    ('फ्लेक्स बॅनर', '₹12 / चौ.फूट पासून'), ('लग्नपत्रिका', '₹8 / कार्ड पासून'),
    ('लोगो आणि ब्रँडिंग', '₹1,499 पासून'), ('पत्रके / प्रचार साहित्य', '₹1.5 / प्रत पासून'),
    ('सोशल मीडिया पोस्ट', '₹199 / पोस्ट पासून'),
]
STEPS = [
    ('ऑर्डर बुक करा', 'फॉर्म भरा किंवा थेट WhatsApp करा.'),
    ('डिझाइन प्रीव्ह्यू', '२४ तासांत प्रीव्ह्यू. बदल हवे असल्यास सांगा.'),
    ('मंजुरी आणि प्रिंटिंग', 'तुम्ही "OK" केल्यावरच प्रिंटिंग सुरू होते.'),
    ('तयार / डिलिव्हरी', 'बहुतेक ऑर्डर १ ते ३ दिवसांत तयार.'),
]
STATS = [('१०', '+', 'वर्षांचा अनुभव'), ('५०००', '+', 'पूर्ण प्रोजेक्ट्स'), ('४.९', '★', 'Google रेटिंग'), ('२४', 'तास', 'डिझाइन प्रीव्ह्यू')]
SERVICES = [
    ('banner', 'var(--saffron)', 'फ्लेक्स', 'बॅनर', 'Flex Banners', 'दुकान बोर्ड आणि होर्डिंग्ज\nकार्यक्रम व सण बॅनर\nत्याच दिवशी प्रिंटिंग'),
    ('card', 'var(--gold)', 'लग्न', 'पत्रिका', 'Wedding Cards', 'पारंपरिक आणि आधुनिक डिझाइन\nफॉइल, एम्बॉस, लेझर-कट\nडिजिटल ई-निमंत्रण'),
    ('logo', 'var(--magenta)', 'लोगो आणि', 'ब्रँडिंग', 'Logo & Branding', 'लोगो डिझाइन\nव्हिजिटिंग कार्ड आणि लेटरहेड\nसंपूर्ण ब्रँड किट'),
    ('cmyk', 'var(--cyan)', 'प्रिंटिंग आणि', 'प्रचार', 'Printing & Political', 'पत्रके आणि पोस्टर्स\nनिवडणूक प्रचार साहित्य\nकॅलेंडर आणि डायरी'),
    ('phone', 'var(--green)', 'सोशल', 'मीडिया', 'Social Creatives', 'सण शुभेच्छा पोस्ट\nइंस्टाग्राम आणि WhatsApp पोस्ट\nजाहिरात क्रिएटिव्ह'),
]


class Command(BaseCommand):
    help = 'Load the sample prices, steps, stats and services into empty admin tables so they can be edited.'

    def handle(self, *args, **opts):
        def fill(model, rows, make):
            if model.objects.exists():
                return self.stdout.write(f'{model.__name__}: already has data, skipped')
            model.objects.bulk_create([make(i, r) for i, r in enumerate(rows)])
            self.stdout.write(f'{model.__name__}: added {len(rows)}')

        fill(Price, PRICES, lambda i, r: Price(order=i, item=r[0], price=r[1]))
        fill(Step, STEPS, lambda i, r: Step(order=i, title=r[0], text=r[1]))
        fill(Stat, STATS, lambda i, r: Stat(order=i, value=r[0], suffix=r[1], label=r[2]))
        fill(Service, SERVICES, lambda i, r: Service(order=i, demo=r[0], color=r[1], title_line1=r[2],
                                                    title_line2=r[3], english=r[4], items=r[5]))
        if not SiteSettings.objects.exists():
            SiteSettings.objects.create(
                whatsapp='910000000000', phone_display='+91 00000 00000',
                price_note='* नमुना दर. अंतिम दर आकार, संख्या आणि कागदानुसार ठरतो.')
            self.stdout.write('SiteSettings: added (edit the phone number!)')
