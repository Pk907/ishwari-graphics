// Placeholder content. Replace WORK with the studio's real projects (add an `img` field
// and render it inside <Poster>) and REVIEWS with real Google reviews.
export const C = {
  ink: '#111012', paper: '#f4efe6', saf: '#ff6a00', mag: '#e6176f', lime: '#c6ff3d',
  cyan: '#22d3ee', maroon: '#4a0c22', gold: '#d9b46a', blue: '#1d2bff', green: '#2f7d32',
}

export const LABEL = {
  All: 'सर्व', Banners: 'बॅनर', Wedding: 'लग्नपत्रिका', Social: 'सोशल मीडिया', Logos: 'लोगो',
  Political: 'राजकीय', Calligraphy: 'सुलेखन', Printing: 'प्रिंटिंग',
}

// v = poster variant, r = aspect ratio
export const WORK = [
  { t: 'भव्य उद्घाटन', cat: 'Banners', v: 'big', r: '3/4', bg: C.saf, fg: C.ink, ac: C.ink, main: 'Open', deva: 'शुभारंभ', tag: 'Flex · 10×3 ft' },
  { t: 'शुभ विवाह', cat: 'Wedding', v: 'frame', r: '5/7', bg: C.maroon, fg: C.gold, ac: C.gold, main: 'शुभ विवाह', deva: '', tag: 'Wedding card' },
  { t: 'गणेशोत्सव', cat: 'Social', v: 'circle', r: '1/1', bg: C.ink, fg: C.paper, ac: C.saf, main: 'Ganesh\nUtsav', deva: 'गणपती बाप्पा मोरया', tag: 'Festival post' },
  { t: 'श्री ट्रेडर्स', cat: 'Logos', v: 'mark', r: '1/1', bg: C.paper, fg: C.ink, ac: C.mag, main: 'Shree\nTraders', deva: '', tag: 'Logo design' },
  { t: 'परिवर्तनासाठी मतदान', cat: 'Political', v: 'stripe', r: '2/3', bg: C.blue, fg: C.paper, ac: C.lime, main: 'Vote\nfor\nchange', deva: 'परिवर्तन', tag: 'Campaign poster' },
  { t: 'पाताळेश्वर कावड', cat: 'Banners', v: 'dots', r: '4/5', bg: C.mag, fg: C.ink, ac: C.ink, main: 'Kavad\nYatra', deva: 'श्री पाताळेश्वर', tag: 'Event banner' },
  { t: 'सुलेखन मालिका', cat: 'Calligraphy', v: 'frame', r: '3/4', bg: C.paper, fg: C.ink, ac: C.saf, main: 'अक्षर', deva: '', tag: 'Hand lettering' },
  { t: 'दिवाळी ऑफर', cat: 'Social', v: 'big', r: '4/5', bg: C.lime, fg: C.ink, ac: C.mag, main: '50%', deva: 'दिवाळी ऑफर', tag: 'Ad creative' },
  { t: 'दिनदर्शिका २०२७', cat: 'Printing', v: 'dots', r: '2/3', bg: C.cyan, fg: C.ink, ac: C.ink, main: '2027', deva: 'दिनदर्शिका', tag: 'Wall calendar' },
  { t: 'स्वागत समारंभ', cat: 'Wedding', v: 'frame', r: '4/5', bg: '#0f2a24', fg: C.gold, ac: C.gold, main: 'स्वागत', deva: '', tag: 'Reception invite' },
  { t: 'महादेव मंडळ', cat: 'Logos', v: 'mark', r: '1/1', bg: C.ink, fg: C.paper, ac: C.saf, main: 'Mahadev', deva: '', tag: 'Mandal identity' },
  { t: 'जाहीर सभा', cat: 'Political', v: 'circle', r: '3/4', bg: C.saf, fg: C.ink, ac: C.mag, main: 'Jahir\nSabha', deva: 'जाहीर सभा', tag: 'Rally banner' },
  { t: 'फ्रेश बेकरी', cat: 'Printing', v: 'stripe', r: '1/1', bg: C.paper, fg: C.maroon, ac: C.saf, main: 'Fresh\nDaily', deva: '', tag: 'Menu & flyer' },
  { t: 'श्री गणेशाय नमः', cat: 'Calligraphy', v: 'circle', r: '4/5', bg: C.ink, fg: C.paper, ac: C.mag, main: '', deva: 'श्री गणेशाय नमः', tag: 'Calligraphy' },
]

export const SERVICES = [
  { id: 'banner', c: 'var(--saffron)', title: ['फ्लेक्स', 'बॅनर'], en: 'Flex Banners', items: ['दुकान बोर्ड आणि होर्डिंग्ज', 'कार्यक्रम व सण बॅनर', 'त्याच दिवशी प्रिंटिंग'] },
  { id: 'card', c: 'var(--gold)', title: ['लग्न', 'पत्रिका'], en: 'Wedding Cards', items: ['पारंपरिक आणि आधुनिक डिझाइन', 'फॉइल, एम्बॉस, लेझर-कट', 'डिजिटल ई-निमंत्रण'] },
  { id: 'logo', c: 'var(--magenta)', title: ['लोगो आणि', 'ब्रँडिंग'], en: 'Logo & Branding', items: ['लोगो डिझाइन', 'व्हिजिटिंग कार्ड आणि लेटरहेड', 'संपूर्ण ब्रँड किट'] },
  { id: 'cmyk', c: 'var(--cyan)', title: ['प्रिंटिंग आणि', 'प्रचार'], en: 'Printing & Political', items: ['पत्रके आणि पोस्टर्स', 'निवडणूक प्रचार साहित्य', 'कॅलेंडर आणि डायरी'] },
  { id: 'phone', c: 'var(--green)', title: ['सोशल', 'मीडिया'], en: 'Social Creatives', items: ['सण शुभेच्छा पोस्ट', 'इंस्टाग्राम आणि WhatsApp पोस्ट', 'जाहिरात क्रिएटिव्ह'] },
]

// TODO: sample "from" prices; replace with the studio's real rates
export const PRICES = [
  { v: 'फ्लेक्स बॅनर', p: '₹12 / चौ.फूट पासून' },
  { v: 'लग्नपत्रिका', p: '₹8 / कार्ड पासून' },
  { v: 'लोगो आणि ब्रँडिंग', p: '₹1,499 पासून' },
  { v: 'पत्रके / प्रचार साहित्य', p: '₹1.5 / प्रत पासून' },
  { v: 'सोशल मीडिया पोस्ट', p: '₹199 / पोस्ट पासून' },
]

export const STEPS = [
  { b: 'ऑर्डर बुक करा', p: 'फॉर्म भरा किंवा थेट WhatsApp करा.' },
  { b: 'डिझाइन प्रीव्ह्यू', p: '२४ तासांत प्रीव्ह्यू. बदल हवे असल्यास सांगा.' },
  { b: 'मंजुरी आणि प्रिंटिंग', p: 'तुम्ही "OK" केल्यावरच प्रिंटिंग सुरू होते.' },
  { b: 'तयार / डिलिव्हरी', p: 'बहुतेक ऑर्डर १ ते ३ दिवसांत तयार.' },
]

// TODO: placeholder figures
export const STATS = [
  { b: '१०', em: '+', s: 'वर्षांचा अनुभव' },
  { b: '५०००', em: '+', s: 'पूर्ण प्रोजेक्ट्स' },
  { b: '४.९', em: '★', s: 'Google रेटिंग' },
  { b: '२४', em: 'तास', s: 'डिझाइन प्रीव्ह्यू' },
]

// TODO: sample reviews, never ship these as real ones
export const REVIEWS = [
  { n: 'राहुल पाटील', c: C.saf, w: '२ आठवड्यांपूर्वी', t: 'लग्नपत्रिकेचं डिझाइन अप्रतिम झालं. वेळेत डिलिव्हरी आणि प्रिंटिंग दर्जेदार.' },
  { n: 'स्नेहा देशमुख', c: C.mag, w: '१ महिन्यापूर्वी', t: 'दुकानाचा फ्लेक्स बॅनर एका दिवसात तयार करून दिला. रंग अगदी उठून दिसतात.' },
  { n: 'अमोल जाधव', c: C.blue, w: '३ आठवड्यांपूर्वी', t: 'आमच्या मंडळाचा लोगो खूप छान बनवला. सगळ्यांना आवडला!' },
  { n: 'प्रिया कुलकर्णी', c: C.green, w: '२ महिन्यांपूर्वी', t: 'सोशल मीडिया पोस्ट्स नियमित आणि आकर्षक. बिझनेससाठी खूप उपयोग झाला.' },
  { n: 'सचिन ठाकरे', c: C.maroon, w: '१ आठवड्यापूर्वी', t: 'निवडणूक प्रचाराचं सगळं साहित्य वेळेत आणि योग्य दरात मिळालं.' },
  { n: 'मयुरी शिंदे', c: '#0891b2', w: '३ महिन्यांपूर्वी', t: 'सुलेखनाचं काम अतिशय सुंदर. प्रत्येक अक्षर कलात्मक.' },
]

// Latest Instagram posts from the backend; empty means the section falls back to portfolio posters.
export const INSTAGRAM = []

export const MARQUEE = ['फ्लेक्स बॅनर', 'लग्नपत्रिका', 'लोगो डिझाइन', 'सुलेखन', 'राजकीय प्रचार', 'सोशल मीडिया', 'ऑफसेट प्रिंटिंग']
