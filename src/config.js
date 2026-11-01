// Business details in one place. Everything marked TODO is a placeholder to replace
// with the studio's real details from its Google Business listing.
export const SITE = {
  nameMr: 'ईश्वरी ग्राफिक्स',
  nameEn: 'Ishwari Graphics And Advertising',
  whatsapp: '910000000000', // TODO: country code + number, digits only
  phoneDisplay: '+91 00000 00000', // TODO
  address: 'स्टुडिओचा पत्ता येथे येईल', // TODO
  hours: 'सोमवार ते शनिवार · सकाळी ९ ते रात्री ९', // TODO
  rating: '4.9', // TODO: real Google rating
  reviewCount: '120+', // TODO: real review count
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ishwari+Graphics+And+Advertising',
  instagram: 'https://www.instagram.com/ishwari_graphics/',
}

export const waLink = (text) =>
  `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
