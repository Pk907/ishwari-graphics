import { useRef } from 'react'
import { gsap, useGSAP, reduced, finePointer } from '../lib/motion'

// Dot + trailing ring; the ring grows into a "पहा" bubble over [data-cursor] elements.
export default function Cursor() {
  const dot = useRef(null)
  const ring = useRef(null)

  useGSAP(() => {
    if (!finePointer || reduced) return
    document.body.classList.add('has-cursor')
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.1 }), dy = gsap.quickTo(dot.current, 'y', { duration: 0.1 })
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring.current, 'y', { duration: 0.45, ease: 'power3' })
    const move = (e) => {
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY)
      ring.current.classList.toggle('view', !!e.target.closest?.('[data-cursor]'))
    }
    addEventListener('pointermove', move)
    return () => { removeEventListener('pointermove', move); document.body.classList.remove('has-cursor') }
  })

  if (!finePointer || reduced) return null
  return <><div className="cur" ref={dot} /><div className="cur-ring" ref={ring}><span>पहा</span></div></>
}
