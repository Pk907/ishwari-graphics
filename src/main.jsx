import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { loadSite } from './lib/loadSite'

const root = () => createRoot(document.getElementById('root'))

// Typing/clicking #/manager while the public site is open only changes the hash, so reload when crossing between the two screens.
const inManager = () => location.hash.startsWith('#/manager')
const startedInManager = inManager()
addEventListener('hashchange', () => inManager() !== startedInManager && location.reload())

// The Business Manager is a separate screen at /#/manager; the public site's scripts never load for it.
if (location.hash.startsWith('#/manager')) {
  import('./manager/Manager.jsx').then(({ default: Page }) => root().render(<StrictMode><Page /></StrictMode>))
} else {
  // App is imported after the API data lands because several components read data.js at module load.
  loadSite()
    .then(() => import('./App.jsx'))
    .then(({ default: Page }) => root().render(<StrictMode><Page /></StrictMode>))
}
