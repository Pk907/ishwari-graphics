"""Payment receipt PDF (ReportLab). Not a GST tax invoice: no GSTIN or tax lines."""
from html import escape
from io import BytesIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import SiteSettings

BUSINESS = 'Ishwari Graphics And Advertising'  # English: ReportLab can't shape Devanagari
INK, ACCENT, MUTE, LINE, TINT = (colors.HexColor(c) for c in ('#1f1b16', '#d94a1e', '#6b645b', '#e4ddd2', '#faf6f0'))

S = {
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=9.5, leading=13, textColor=INK),
    'mute': ParagraphStyle('mute', fontName='Helvetica', fontSize=8.5, leading=12, textColor=MUTE),
    'label': ParagraphStyle('label', fontName='Helvetica-Bold', fontSize=7.5, leading=10, textColor=ACCENT),
    'name': ParagraphStyle('name', fontName='Helvetica-Bold', fontSize=15, leading=18, textColor=INK),
    'title': ParagraphStyle('title', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=ACCENT, alignment=TA_RIGHT),
    'right': ParagraphStyle('right', fontName='Helvetica', fontSize=9.5, leading=13, textColor=INK, alignment=TA_RIGHT),
}


def rs(n):
    # Indian digit grouping (1,23,456); "Rs." because the built-in PDF fonts have no rupee glyph
    s = str(n)
    if len(s) > 3:
        head, s = s[:-3], s[-3:]
        while head:
            head, s = head[:-2], head[-2:] + ',' + s
    return f'Rs. {s}.00'


def p(text, style='body'):
    return Paragraph(text, S[style])


def lines(*parts):
    return '<br/>'.join(escape(x) for x in parts if x)


def render_receipt(receipt):
    o, c = receipt.order, receipt.order.customer
    site = SiteSettings.objects.first()
    payments = list(o.transactions.filter(type='customer_payment').order_by('date', 'id'))
    received = sum(t.amount for t in payments)
    issued = timezone.localtime(receipt.created_at)
    order_no = f'ORD-{1000 + o.pk}'
    W = A4[0] - 36 * mm

    logo = Table([[p('LOGO', 'mute')]], 24 * mm, 24 * mm, style=[
        ('BOX', (0, 0), (-1, -1), 0.8, LINE), ('BACKGROUND', (0, 0), (-1, -1), TINT),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')])
    business = [p(BUSINESS, 'name'), p('Graphic Design · Printing · Advertising', 'mute'), Spacer(0, 3),
                p(lines(site and site.address, site and site.phone_display and f'Phone: {site.phone_display}',
                        site and site.hours), 'mute')]
    title = [p('PAYMENT RECEIPT', 'title'), Spacer(0, 4),
             p(f'<b>Receipt No:</b> {receipt.number}<br/><b>Date:</b> {issued:%d %b %Y}', 'right')]
    header = Table([[logo, business, title]], [28 * mm, W - 28 * mm - 72 * mm, 72 * mm],
                   style=[('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (0, 0), 0)])

    info = Table([
        [p('RECEIVED FROM', 'label'), p('ORDER DETAILS', 'label')],
        [p(f'<b>{escape(c.name)}</b><br/>' + lines(c.phone, c.address)),
         p(f'<b>Order ID:</b> {order_no}<br/><b>Order date:</b> {o.date:%d %b %Y}<br/>'
           f'<b>Payment status:</b> <font color="#1f6a24"><b>PAID IN FULL</b></font>')],
    ], [W / 2] * 2, style=[('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0)])

    items = [['#', 'Description', 'Qty', 'Amount']]
    for label, amount in (('Design charges', o.design), ('Printing charges', o.printing)):
        if amount:
            items.append([str(len(items)), p(f'{label}<br/><font color="#6b645b" size="8.5">{escape(o.desc)}</font>'), '1', rs(amount)])
    n = len(items)
    items += [['', 'Subtotal', '', rs(o.design + o.printing)],
              ['', 'Discount', '', f'- {rs(o.discount)}'],
              ['', 'Total amount', '', rs(o.total)],
              ['', 'Amount received', '', rs(received)],
              ['', 'Balance due', '', rs(o.total - received)]]
    item_table = Table(items, [10 * mm, W - 10 * mm - 16 * mm - 34 * mm, 16 * mm, 34 * mm], repeatRows=1, style=[
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 9.5), ('TEXTCOLOR', (0, 0), (-1, -1), INK),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 8), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 0), (-1, 0), INK), ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LINEBELOW', (0, 1), (-1, n - 1), 0.5, LINE),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('SPAN', (1, n), (2, n)), ('SPAN', (1, n + 1), (2, n + 1)), ('SPAN', (1, n + 2), (2, n + 2)),
        ('SPAN', (1, n + 3), (2, n + 3)), ('SPAN', (1, n + 4), (2, n + 4)),
        ('ALIGN', (1, n), (1, -1), 'RIGHT'),
        ('FONT', (1, n + 2), (-1, n + 2), 'Helvetica-Bold', 10.5),
        ('BACKGROUND', (1, n + 2), (-1, n + 2), TINT), ('LINEABOVE', (1, n + 2), (-1, n + 2), 1, INK),
        ('FONT', (1, n + 3), (-1, n + 3), 'Helvetica-Bold', 9.5), ('TEXTCOLOR', (1, n + 3), (-1, n + 3), colors.HexColor('#1f6a24')),
    ])

    pay = [['Date', 'Payment method', 'Transaction reference', 'Amount']] + [
        [f'{t.date:%d %b %Y}', t.method or '-', p(escape(t.reference) or '-'), rs(t.amount)] for t in payments]
    pay_table = Table(pay, [28 * mm, 38 * mm, W - 28 * mm - 38 * mm - 34 * mm, 34 * mm], repeatRows=1, style=[
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 9), ('TEXTCOLOR', (0, 0), (-1, -1), INK),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 8), ('TEXTCOLOR', (0, 0), (-1, 0), MUTE),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, LINE), ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')])

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(ACCENT)
        canvas.rect(0, A4[1] - 4 * mm, A4[0], 4 * mm, stroke=0, fill=1)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(MUTE)
        canvas.drawCentredString(A4[0] / 2, 12 * mm, f'{BUSINESS}  ·  Receipt {receipt.number}  ·  This is a computer-generated receipt and needs no signature.')
        canvas.restoreState()

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=22 * mm,
                            title=f'Payment Receipt {receipt.number}', author=BUSINESS)
    doc.build([
        header, Spacer(0, 6 * mm), HRFlowable(width='100%', thickness=1.5, color=ACCENT), Spacer(0, 6 * mm),
        info, Spacer(0, 8 * mm), item_table, Spacer(0, 8 * mm),
        p('PAYMENTS RECEIVED', 'label'), Spacer(0, 2 * mm), pay_table, Spacer(0, 10 * mm),
        p('Thank you for your business!', 'body'),
        p('Received with thanks the amount stated above against the order mentioned.', 'mute'),
    ], onFirstPage=footer, onLaterPages=footer)
    return buf.getvalue()
