import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WORK, LABEL } from '../data'
import { waLink } from '../config'
import { lockScroll, ScrollTrigger } from '../lib/motion'
import { Poster, SecHead, Close, Prev, Next } from './ui'

const CATS = ['All', ...new Set(WORK.map((w) => w.cat))]
// capitalised aliases so the lint config (no React JSX plugin) sees them as used
const MDiv = motion.div, MButton = motion.button
const ease = [0.2, 0.7, 0.2, 1]

function Lightbox({ index, list, onClose, onGo }) {
  const w = WORK[index]
  const closeBtn = useRef(null)

  useEffect(() => {
    const opener = document.activeElement
    lockScroll(true)
    closeBtn.current?.focus()
    return () => { lockScroll(false); opener?.focus?.() }
  }, [])

  useEffect(() => {
    const step = (d) => onGo(list[(list.indexOf(index) + d + list.length) % list.length])
    const key = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [index, list, onClose, onGo])

  const step = (d) => onGo(list[(list.indexOf(index) + d + list.length) % list.length])
  return (
    <MDiv className="lb" role="dialog" aria-modal="true" aria-labelledby="lb-title"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <button className="lb-close" ref={closeBtn} onClick={onClose} aria-label="बंद करा"><Close /></button>
      <div className="lb-art">
        {/* shared layoutId: the grid card grows into this view */}
        <MDiv layoutId={`art-${index}`} key={index} transition={{ duration: 0.6, ease }}>
          <Poster p={w} />
        </MDiv>
      </div>
      <div className="lb-info">
        <span className="cat">{LABEL[w.cat]} · {w.tag}</span>
        <h3 id="lb-title">{w.t}</h3>
        <p>येथे प्रकल्पाची माहिती येईल: क्लायंट, ब्रीफ, कागद, फिनिश आणि लागलेला वेळ.</p>
        <a className="btn btn-main" style={{ alignSelf: 'start' }} target="_blank" rel="noopener"
          href={waLink(`नमस्कार ईश्वरी ग्राफिक्स, मला "${w.t}" सारखे डिझाइन हवे आहे.`)}>असं डिझाइन हवंय</a>
        <div className="lb-nav">
          <button onClick={() => step(-1)} aria-label="मागील"><Prev /></button>
          <button onClick={() => step(1)} aria-label="पुढील"><Next /></button>
        </div>
      </div>
    </MDiv>
  )
}

export default function Portfolio() {
  const [cat, setCat] = useState('All')
  const [open, setOpen] = useState(null)
  const list = WORK.map((_, i) => i).filter((i) => cat === 'All' || WORK[i].cat === cat)

  // section height changes after filtering, so pinned sections above/below need fresh measurements
  useEffect(() => { const t = setTimeout(() => ScrollTrigger.refresh(), 700); return () => clearTimeout(t) }, [cat])

  return (
    <section className="work" id="work">
      <SecHead title={['निवडक', 'काम']} sup={String(WORK.length).padStart(2, '0')}>
        <p>हे नमुना डिझाइन आहेत. अंतिम वेबसाइटवर स्टुडिओचे खरे काम दिसेल.</p>
      </SecHead>
      <div className="filters" role="group" aria-label="कामाचा प्रकार निवडा">
        {CATS.map((c) => (
          <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>
            {LABEL[c]}<sup>{c === 'All' ? WORK.length : WORK.filter((w) => w.cat === c).length}</sup>
          </button>
        ))}
      </div>
      <div className="masonry">
        <AnimatePresence mode="popLayout">
          {list.map((i) => (
            <MButton key={i} layout className="item" data-cursor aria-label={`${WORK[i].t} पहा`} onClick={() => setOpen(i)}
              initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
              exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.6, ease }}>
              <MDiv layoutId={`art-${i}`}><Poster p={WORK[i]} /></MDiv>
              <span className="meta"><b>{WORK[i].t}</b><span>{LABEL[WORK[i].cat]}</span></span>
            </MButton>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {open !== null && <Lightbox index={open} list={list} onClose={() => setOpen(null)} onGo={setOpen} />}
      </AnimatePresence>
    </section>
  )
}
