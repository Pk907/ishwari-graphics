import { useRef, useState } from 'react'
import { gsap, useGSAP } from '../lib/motion'
import { SERVICES, WORK } from '../data'
import { Poster, SecHead } from './ui'

const SIZES = [['10×3 फूट', '3/1', '85%'], ['8×4 फूट', '2/1', '75%'], ['स्टँडी', '1/1.4', '45%']]

function BannerDemo() {
  const [s, setS] = useState(0)
  return (
    <div className="demo d-banner">
      <div className="flex" style={{ '--ar': SIZES[s][1], '--w': SIZES[s][2] }}>भव्य उद्घाटन</div>
      <div className="sizes" role="group" aria-label="बॅनर आकार">
        {SIZES.map(([label], i) => <button key={label} aria-pressed={s === i} onClick={() => setS(i)}>{label}</button>)}
      </div>
    </div>
  )
}

function LogoDemo() {
  const [x, setX] = useState(50)
  return (
    <div className="demo d-logo">
      <div className="wrap"><div className="sketch">श्री</div><div className="final" style={{ '--x': `${x}%` }}>श्री</div></div>
      <input type="range" min="0" max="100" value={x} onChange={(e) => setX(e.target.value)} aria-label="स्केच ते अंतिम लोगो" />
    </div>
  )
}

const DEMOS = {
  banner: BannerDemo,
  logo: LogoDemo,
  card: () => (
    <div className="demo d-card" tabIndex={0} aria-label="कार्ड उलटण्यासाठी hover करा">
      <div className="card">
        <div className="face">॥ शुभ विवाह ॥<br />राहुल ♥ प्रिया</div>
        <div className="face back">शनिवार, १४ फेब्रुवारी<br />मंगरूळनाथ<br /><br /><small>hover करा</small></div>
      </div>
    </div>
  ),
  cmyk: () => (
    <div className="demo d-cmyk"><span className="ink">CMYK</span><span className="ink">CMYK</span><span className="ink">CMYK</span><small>hover करा</small></div>
  ),
  phone: () => (
    <div className="demo d-phone" aria-hidden="true">
      <div className="phone"><div className="feed">
        {[2, 7, 3, 13, 2, 7, 3, 13].map((i, n) => <Poster key={n} p={WORK[i % WORK.length]} ratio="1/1" />)}
      </div></div>
    </div>
  ),
}

export default function Services() {
  const ref = useRef(null)
  const track = useRef(null)

  // desktop: pin the section and scroll the panels sideways; mobile stacks them vertically in CSS
  useGSAP(() => {
    gsap.matchMedia().add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      const dist = () => track.current.scrollWidth - innerWidth
      gsap.to(track.current, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true },
      })
    })
  }, { scope: ref })

  return (
    <section className="services" id="services" ref={ref}>
      <SecHead title={['आम्ही काय', 'बनवतो']} sup={String(SERVICES.length).padStart(2, '0')}><p>प्रत्येक सेवा एक छोटा प्रयोग आहे. hover करा, ओढा, क्लिक करा.</p></SecHead>
      <div className="s-track" ref={track}>
        {SERVICES.map((s, i) => {
          const Demo = DEMOS[s.id]
          return (
            <article className="s-panel" key={i} style={{ '--c': s.c }}>
              <div>
                <span className="num">0{i + 1} / 0{SERVICES.length}</span>
                <h3>{s.title[0]}<br />{s.title[1]}</h3>
                <span className="en">{s.en}</span>
                <ul>{s.items.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
              {Demo && <Demo />}
            </article>
          )
        })}
      </div>
    </section>
  )
}
