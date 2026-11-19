import { useEffect, useState } from 'react'
import { useManager } from './store.js'
import { useConfirm } from './ui.jsx'
import Dashboard from './Dashboard.jsx'
import Orders from './Orders.jsx'
import Transactions from './Transactions.jsx'
import PortfolioImages from './PortfolioImages.jsx'
import { Customers, Vendors } from './Parties.jsx'
import './manager.css'

const TABS = [['dashboard', 'Dashboard', Dashboard], ['orders', 'Orders', Orders], ['customers', 'Customers', Customers], ['vendors', 'Vendors', Vendors], ['transactions', 'Transactions', Transactions], ['portfolio', 'Portfolio images', PortfolioImages]]
const tabFromHash = () => TABS.find(([id]) => location.hash === `#/manager/${id}`)?.[0] || 'dashboard'

export default function Manager() {
  const [state, dispatch] = useManager()
  const [tab, setTab] = useState(tabFromHash)
  const [ask, confirm] = useConfirm()
  const View = TABS.find(([id]) => id === tab)[2]

  useEffect(() => {
    document.body.classList.add('mg-body')
    document.title = 'Business Manager | Ishwari Graphics'
    const sync = () => setTab(tabFromHash())
    addEventListener('hashchange', sync)
    return () => { document.body.classList.remove('mg-body'); removeEventListener('hashchange', sync) }
  }, [])

  return (
    <div className="mg">
      <aside className="mg-side">
        <a href="/" className="mg-logo"><b>ईश्वरी</b>Graphics<small>Business Manager</small></a>
        <nav aria-label="Business Manager">
          {TABS.map(([id, label]) => <a key={id} href={`#/manager/${id}`} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined}>{label}</a>)}
        </nav>
        <div className="mg-side-foot">
          <p>Demo data, saved in this browser only.</p>
          <button className="mg-btn" onClick={() => ask({ title: 'Reset demo data?', text: 'All changes you made here will be replaced with the sample data.', ok: 'Reset', danger: true, run: () => dispatch({ type: 'reset' }) })}>Reset demo data</button>
          <a href="/admin/" className="mg-link">← Admin</a>
        </div>
      </aside>
      <main className="mg-main"><View state={state} dispatch={dispatch} ask={ask} /></main>
      {confirm}
    </div>
  )
}
