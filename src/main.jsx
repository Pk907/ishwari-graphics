import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { loadSite } from './lib/loadSite'

// App is imported after the API data lands because several components read data.js at module load.
loadSite()
  .then(() => import('./App.jsx'))
  .then((m) => {
    const App = m.default
    createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
  })
