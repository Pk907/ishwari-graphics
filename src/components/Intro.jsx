import { useRef, useState } from 'react'
import { gsap, useGSAP, reduced, lockScroll } from '../lib/motion'

const seen = () => { try { return sessionStorage.getItem('seenIntro') } catch { return null } }
const markSeen = () => { try { sessionStorage.setItem('seenIntro', '1') } catch { /* private mode */ } }

// CMYK plates slide into register over "ईश्वरी", then the paper wipes up.
// Calls onReveal when the hero should start animating; plays once per session.
export default function Intro({ onReveal }) {
  const [show] = useState(() => !reduced && !seen())
  const [gone, setGone] = useState(false)
  const ref = useRef(null)
  const tl = useRef(null)

  useGSAP(() => {
    if (!show) { onReveal(); return }
    lockScroll(true)
    const t = gsap.timeline({ paused: true, onComplete: () => { markSeen(); setGone(true) } })
    t.from('.reg', { scale: 0, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'back.out' })
      .fromTo('.intro-word .c', { x: -60, y: -30 }, { x: 0, y: 0, duration: 1.2, ease: 'expo.inOut' }, 0.2)
      .fromTo('.intro-word .m', { x: 50, y: 40 }, { x: 0, y: 0, duration: 1.2, ease: 'expo.inOut' }, 0.25)
      .fromTo('.intro-word .y', { x: 20, y: -60 }, { x: 0, y: 0, duration: 1.2, ease: 'expo.inOut' }, 0.3)
      .to('.intro-word .k', { opacity: 1, duration: 0.3 }, 1.35)
      .to(ref.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 1.9)
      .add(() => { lockScroll(false); onReveal() }, 2.2)
    tl.current = t
    // wait for webfonts so the word doesn't reflow mid-animation
    document.fonts.ready.then(() => t.play())
  }, { scope: ref })

  if (!show || gone) return null
  const skip = () => tl.current?.progress(1)
  return (
    <div className="intro" ref={ref} role="button" tabIndex={0} aria-label="इंट्रो वगळा"
      onClick={skip} onKeyDown={(e) => e.key === 'Enter' && skip()}>
      <i className="reg tl" /><i className="reg tr" /><i className="reg bl" /><i className="reg br" />
      <div className="intro-word" aria-hidden="true">
        <span className="c">ईश्वरी</span><span className="m">ईश्वरी</span><span className="y">ईश्वरी</span><span className="k">ईश्वरी</span>
      </div>
      <small>वगळण्यासाठी क्लिक करा</small>
    </div>
  )
}
