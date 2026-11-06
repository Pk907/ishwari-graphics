import { motion } from 'framer-motion'
import { INSTAGRAM, WORK } from '../data'
import { SITE } from '../config'
import { Magnetic, Poster, SecHead, InstagramIcon } from './ui'

const MA = motion.a
const ease = [0.2, 0.7, 0.2, 1]

// Latest posts from the backend; until the studio has any, show portfolio work that links to the profile.
export default function Instagram() {
  const handle = SITE.instagram.replace(/\/+$/, '').split('/').pop()
  const posts = INSTAGRAM.length ? INSTAGRAM : WORK.slice(0, 5).map((w) => ({ ...w, link: SITE.instagram }))

  return (
    <section className="insta" id="instagram">
      <SecHead title={['इन्स्टाग्रामवर', 'फॉलो करा']}>
        <p>रोजचं नवं काम, ऑफर आणि पडद्यामागच्या गोष्टी. आमच्यासोबत जोडलेले रहा.</p>
      </SecHead>
      <div className="insta-grid">
        {posts.map((p, i) => (
          <MA key={p.link + i} className="ig-tile" href={p.link} target="_blank" rel="noopener" data-cursor
            aria-label={`Instagram पोस्ट पहा: ${p.t}`}
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: i * 0.07, ease }}>
            <Poster p={p} ratio="1/1" />
            <span className="ig-badge"><InstagramIcon /></span>
            <span className="ig-cap">{p.t}</span>
          </MA>
        ))}
      </div>
      <div className="insta-cta">
        <Magnetic className="btn btn-ig" target="_blank" rel="noopener" href={SITE.instagram}>
          <InstagramIcon /> @{handle} ला फॉलो करा
        </Magnetic>
      </div>
    </section>
  )
}
