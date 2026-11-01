// Small, mostly static sections.
import { MARQUEE, STATS, REVIEWS } from '../data'
import { SITE, waLink } from '../config'
import { Magnetic, WhatsAppIcon } from './ui'

export function Nav() {
  return (
    <nav className="nav" aria-label="मुख्य">
      <a href="#top" className="logo"><b>ईश्वरी</b>Graphics</a>
      <ul>
        <li><a href="#services">सेवा</a></li><li><a href="#work">आमचे काम</a></li>
        <li><a href="#order">ऑर्डर</a></li><li><a href="#reviews">रिव्ह्यू</a></li><li><a href="#contact">संपर्क</a></li>
      </ul>
    </nav>
  )
}

export function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[...MARQUEE, ...MARQUEE].flatMap((w, i) => [<span key={i}>{w}</span>, <em key={`s${i}`}>✦</em>])}
      </div>
    </div>
  )
}

export function Stats() {
  return (
    <section className="stats" aria-label="आमच्याबद्दल आकडे">
      {STATS.map((s) => <div key={s.s}><b>{s.b}<em>{s.em}</em></b><span>{s.s}</span></div>)}
    </section>
  )
}

const Google = () => <span className="g">{[...'Google'].map((l, i) => <i key={i}>{l}</i>)}</span>

function ReviewCard({ r }) {
  return (
    <article className="r-card">
      <div className="r-top">
        <span className="av" style={{ '--c': r.c }}>{[...r.n][0]}</span>
        <div><b>{r.n}</b><small>{r.w}</small></div>
        <span className="g"><i>G</i></span>
      </div>
      <div className="stars" aria-label="5 स्टार">★★★★★</div>
      <p>{r.t}</p>
    </article>
  )
}

export function Reviews() {
  const row2 = [...REVIEWS.slice(3), ...REVIEWS.slice(0, 3)]
  return (
    <section className="reviews" id="reviews">
      <div className="sec-head">
        <div>
          <h2>ग्राहक<br />काय म्हणतात</h2>
          <div className="rating">
            <span className="big">{SITE.rating}</span>
            <div>
              <div className="stars" aria-label={`5 पैकी ${SITE.rating} स्टार`}>★★★★★</div>
              <span><Google /> वर {SITE.reviewCount} रिव्ह्यू</span>
            </div>
            <Magnetic className="btn btn-ghost" target="_blank" rel="noopener" href={SITE.mapsUrl}>Google वर रिव्ह्यू लिहा</Magnetic>
          </div>
        </div>
        <p>हे नमुना रिव्ह्यू आहेत. अंतिम वेबसाइटवर स्टुडिओचे खरे Google रिव्ह्यू दिसतील.</p>
      </div>
      {/* each row holds its cards twice so the -50% marquee loops seamlessly */}
      <div className="r-row">{[...REVIEWS, ...REVIEWS].map((r, i) => <ReviewCard r={r} key={i} />)}</div>
      <div className="r-row rev">{[...row2, ...row2].map((r, i) => <ReviewCard r={r} key={i} />)}</div>
    </section>
  )
}

export function Contact() {
  return (
    <section className="contact" id="contact">
      <div>
        <h2>चला, काहीतरी<br /><em>भन्नाट</em><br />बनवूया.</h2>
        <div className="ctas">
          <Magnetic className="btn btn-main" href={waLink()} target="_blank" rel="noopener">WhatsApp वर बोला</Magnetic>
          <Magnetic className="btn btn-ghost" href={`tel:+${SITE.whatsapp}`}>कॉल करा</Magnetic>
        </div>
      </div>
      <div className="info">
        <div><small>पत्ता</small>{SITE.address}</div>
        <div><small>फोन / WhatsApp</small>{SITE.phoneDisplay}</div>
        <div><small>वेळ</small>{SITE.hours}</div>
        <div><Magnetic className="btn btn-ghost" target="_blank" rel="noopener" href={SITE.mapsUrl}>Google Maps वर दिशा पहा</Magnetic></div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer>
      <span>© {new Date().getFullYear()} ईश्वरी ग्राफिक्स अँड ॲडव्हर्टायझिंग</span>
      <a href={SITE.instagram} target="_blank" rel="noopener">Instagram @ishwari_graphics</a>
    </footer>
  )
}

export function WhatsAppFab() {
  return (
    <Magnetic className="wa" href={waLink()} target="_blank" rel="noopener" aria-label="WhatsApp वर बोला"><WhatsAppIcon /></Magnetic>
  )
}
