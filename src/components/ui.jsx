import { useRef } from 'react'
import { gsap, useGSAP, reduced, finePointer } from '../lib/motion'

// Placeholder artwork drawn in CSS. Swap for <img> once the studio's real work is in.
export function Poster({ p, ratio, className = '' }) {
  return (
    <div className={`poster v-${p.v} ${className}`} style={{ '--bg': p.bg, '--fg': p.fg, '--ac': p.ac, aspectRatio: ratio ?? p.r }}>
      <span className="p-top">{p.tag}</span>
      <div className="p-main">{p.main}</div>
      <span className="p-deva">{p.deva}</span>
      <span className="p-bot">Ishwari Graphics</span>
      <i className="p-shape" />
    </div>
  )
}

// Element that leans toward the pointer; plain element on touch or reduced motion.
export function Magnetic({ as = 'a', ...props }) {
  const Tag = as
  const ref = useRef(null)
  useGSAP(() => {
    if (!finePointer || reduced) return
    const el = ref.current
    const opts = { duration: 0.6, ease: 'elastic.out(1,.4)' }
    const mx = gsap.quickTo(el, 'x', opts), my = gsap.quickTo(el, 'y', opts)
    const move = (e) => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.35); my((e.clientY - r.top - r.height / 2) * 0.35) }
    const leave = () => { mx(0); my(0) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
  })
  return <Tag ref={ref} {...props} />
}

const icon = (d) => function Icon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={d} /></svg>
}
export const Arrow = icon('M5 12h14M13 6l6 6-6 6')
export const Prev = icon('M15 6l-6 6 6 6')
export const Next = icon('M9 6l6 6-6 6')
export const Close = icon('M6 6l12 12M18 6L6 18')

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2s-1 .3-3.4-.7a11.6 11.6 0 0 1-4.5-4c-.3-.5-1-1.5-1-2.8s.7-2 1-2.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6a8.8 8.8 0 0 0 1.6 2 7.9 7.9 0 0 0 2.3 1.4c.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3a2.6 2.6 0 0 1-.2 1.4z" />
    </svg>
  )
}

export function SecHead({ title, sup, children }) {
  return (
    <div className="sec-head">
      <h2>{title[0]}<br />{title[1]}{sup && <sup>{sup}</sup>}</h2>
      {children}
    </div>
  )
}
