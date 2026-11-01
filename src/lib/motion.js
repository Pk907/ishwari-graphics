import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
export const finePointer = typeof window !== 'undefined' && matchMedia('(pointer: fine)').matches

let lenis = null
export const getLenis = () => lenis

// Smooth scroll driven by GSAP's ticker so ScrollTrigger and Lenis share one frame loop.
export function startLenis() {
  if (reduced) return () => {}
  lenis = new Lenis({ lerp: 0.09, anchors: true })
  lenis.on('scroll', ScrollTrigger.update)
  const raf = (t) => lenis.raf(t * 1000)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)
  return () => { gsap.ticker.remove(raf); lenis.destroy(); lenis = null }
}

export function lockScroll(lock) {
  document.documentElement.style.overflow = lock ? 'hidden' : ''
  lock ? lenis?.stop() : lenis?.start()
}

export { gsap, ScrollTrigger, useGSAP }
