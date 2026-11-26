import { useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase.js'
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

// undefined while the saved Supabase session is being restored, then the session or null
function useSession(supabase) {
  const [session, setSession] = useState(supabase ? undefined : null)
  useEffect(() => {
    if (!supabase) return undefined
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    supabase.auth.getSession().then(({ data }) => setSession(data.session), () => setSession(null))
    return () => subscription.unsubscribe()
  }, [supabase])
  return session
}

function SignIn({ supabase }) {
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password })
      if (error) throw error
    } catch (error) {
      setErr(`Sign-in failed: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <header className="mg-head"><h1>Sign in</h1></header>
      <form className="mg-portfolio-form" onSubmit={submit}>
        <p className="mg-hint full">Sign in with your Supabase admin account. Orders, payments and receipts are stored securely on the server.</p>
        <label className="mg-field">Supabase admin email
          <input type="email" autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        </label>
        <label className="mg-field">Password
          <input type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        </label>
        {err && <p className="mg-err full" role="alert">{err}</p>}
        <div className="mg-actions full"><button className="mg-btn main" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></div>
      </form>
    </>
  )
}

// Mounted once while signed in, so data survives tab switches. Portfolio images talks to Supabase directly and doesn't wait for it.
function Workspace({ View, ask }) {
  const [state, dispatch, error] = useManager()
  return (
    <>
      {error && <p className="mg-err mg-banner" role="alert">{error}</p>}
      {state || View === PortfolioImages ? <View state={state} dispatch={dispatch} ask={ask} /> : !error && <p role="status">Loading…</p>}
    </>
  )
}

export default function Manager() {
  const { client: supabase, error: clientError } = useMemo(() => {
    try { return { client: getSupabaseClient(), error: '' } } catch (e) { return { client: null, error: e.message } }
  }, [])
  const session = useSession(supabase)
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
          {session && <><p>{session.user.email}</p><button className="mg-btn" onClick={() => supabase.auth.signOut()}>Sign out</button></>}
          <a href="/admin/" className="mg-link">← Admin</a>
        </div>
      </aside>
      <main className="mg-main">
        {clientError ? <p className="mg-err" role="alert">{clientError}</p>
          : !supabase ? <p className="mg-hint">Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to the project’s local <code>.env.local</code>, then restart Vite.</p>
            : session === undefined ? <p role="status">Checking sign-in…</p>
              : session ? <Workspace View={View} ask={ask} /> : <SignIn supabase={supabase} />}
      </main>
      {confirm}
    </div>
  )
}
