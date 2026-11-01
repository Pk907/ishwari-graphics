import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { startLenis } from './lib/motion'
import Intro from './components/Intro'
import Hero from './components/Hero'
import Services from './components/Services'
import Portfolio from './components/Portfolio'
import Order from './components/Order'
import Cursor from './components/Cursor'
import { Nav, Marquee, Stats, Reviews, Contact, Footer, WhatsAppFab } from './components/Sections'

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(startLenis, [])

  return (
    <MotionConfig reducedMotion="user">
      <Intro onReveal={() => setReady(true)} />
      <Cursor />
      <Nav />
      <main id="top">
        <Hero ready={ready} />
        <Marquee />
        <Stats />
        <Services />
        <Portfolio />
        <Order />
        <Reviews />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFab />
    </MotionConfig>
  )
}
