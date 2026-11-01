import { useRef } from 'react'
import { gsap, useGSAP, reduced, finePointer } from '../lib/motion'
import { WORK, C } from '../data'
import { Poster, Magnetic, Arrow } from './ui'

const STACK = [0, 4, 1, 7, 2]
const SWAPS = [['रंग.', C.saf], ['आकार.', C.mag], ['ओळख.', C.blue], ['उठाव.', C.green]]
// Split by word, not letter: per-letter spans break Devanagari conjuncts and matras.
const Words = ({ text }) => text.split(' ').map((w) => <span className="word" key={w}>{w}</span>)

export default function Hero({ ready }) {
  const ref = useRef(null)
  const swap = useRef(null)

  useGSAP(() => {
    if (!ready || reduced) return
    gsap.timeline()
      .from('.h-title .word, .swap', { yPercent: 120, duration: 1.1, ease: 'expo.out', stagger: 0.07 })
      .from('.stack .layer', { y: 160, opacity: 0, rotate: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08 }, '<.1')
      .from('.eyebrow, .h-sub, .ctas, .badge', { y: 24, opacity: 0, duration: 0.8, stagger: 0.08 }, '<.3')

    // headline's last word cycles; text is set on the node directly so React doesn't re-render mid-tween
    let i = 0
    const id = setInterval(() => {
      i = (i + 1) % SWAPS.length
      gsap.timeline().to(swap.current, { yPercent: -120, duration: 0.45, ease: 'expo.in' })
        .add(() => { swap.current.textContent = SWAPS[i][0]; swap.current.style.color = SWAPS[i][1] })
        .fromTo(swap.current, { yPercent: 120 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' })
    }, 2600)

    // scroll: poster layers drift apart at different depths, headline sinks and fades
    const st = { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true }
    gsap.utils.toArray('.stack .layer').forEach((l, n) =>
      gsap.to(l, { yPercent: -(n + 1) * 18, rotate: `+=${(n % 2 ? 1 : -1) * (n + 2) * 2}`, ease: 'none', scrollTrigger: st }))
    gsap.to('.h-title', { yPercent: 30, opacity: 0.2, ease: 'none', scrollTrigger: st })

    // pointer parallax on the poster stack
    let move
    if (finePointer) {
      const layers = gsap.utils.toArray('.stack .layer').map((l, n) => ({
        x: gsap.quickTo(l, 'x', { duration: 1 }), y: gsap.quickTo(l, 'y', { duration: 1 }), d: (n + 1) * 16,
      }))
      move = (e) => {
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5
        layers.forEach((l) => { l.x(nx * l.d); l.y(ny * l.d) })
      }
      addEventListener('pointermove', move)
    }
    return () => { clearInterval(id); move && removeEventListener('pointermove', move) }
  }, { scope: ref, dependencies: [ready] })

  return (
    <section className="hero" ref={ref} style={{ visibility: ready ? 'visible' : 'hidden' }}>
      <div>
        <div className="eyebrow"><i />डिझाइन आणि प्रिंटिंग स्टुडिओ · महाराष्ट्र</div>
        <h1 className="h-title" aria-label="कल्पनांना आम्ही देतो रंग">
          <span className="line" aria-hidden="true"><Words text="कल्पनांना" /></span>
          <span className="line alt" aria-hidden="true"><Words text="आम्ही देतो" /></span>
          <span className="line" aria-hidden="true"><span className="swap" ref={swap}>रंग.</span></span>
        </h1>
        <div className="h-sub">
          <p>बॅनर, लग्नपत्रिका, लोगो, प्रचार साहित्य आणि सुलेखन. डिझाइनपासून प्रिंटिंगपर्यंत सगळं एकाच छताखाली.</p>
          <span className="deva">कल्पना ते प्रिंटिंग</span>
        </div>
        <div className="ctas">
          <Magnetic className="btn btn-main" href="#order">ऑर्डर बुक करा <Arrow /></Magnetic>
          <Magnetic className="btn btn-ghost" href="#work">आमचे काम पहा</Magnetic>
        </div>
      </div>
      <div className="stack" aria-hidden="true">
        {STACK.map((i) => <div className="layer" key={i}><Poster p={WORK[i]} /></div>)}
      </div>
      <a href="#services" className="badge" aria-label="सेवांकडे जा">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs><path id="badge-c" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" /></defs>
          <text fontSize="11" fill="#111012" fontFamily="Mukta" fontWeight="700" letterSpacing="1.5">
            <textPath href="#badge-c">स्टुडिओत या ✦ स्टुडिओत या ✦ स्टुडिओत या ✦</textPath>
          </text>
        </svg>
        <span>↓</span>
      </a>
    </section>
  )
}
