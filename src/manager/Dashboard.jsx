import { useMemo, useState } from 'react'
import { monthly, money, summary } from './accounting.js'
import { today } from './data.js'

const ymd = (d) => d.toLocaleDateString('en-CA')
const PRESETS = {
  'This month': () => ({ from: today().slice(0, 8) + '01', to: '' }),
  'Last 3 months': () => { const d = new Date(); d.setMonth(d.getMonth() - 3); return { from: ymd(d), to: '' } },
  'All time': () => ({ from: '', to: '' }),
}

function Card({ label, value, sub, tone }) {
  return <div className={`mg-card ${tone || ''}`}><small>{label}</small><b>{value}</b>{sub && <span>{sub}</span>}</div>
}

function Chart({ data }) {
  const max = Math.max(1, ...data.flatMap((m) => [m.income, m.spend]))
  const H = 180, bw = 22
  return (
    <svg className="mg-chart" viewBox={`0 0 ${data.length * 90} ${H + 28}`} role="img" aria-label="Monthly income and expense">
      {data.map((m, i) => {
        const x = i * 90 + 14, hi = (m.income / max) * H, hs = (m.spend / max) * H
        return (
          <g key={m.key}>
            <rect x={x} y={H - hi} width={bw} height={hi} rx="4" className="bar-in"><title>{`${m.label} income ${money(m.income)}`}</title></rect>
            <rect x={x + bw + 6} y={H - hs} width={bw} height={hs} rx="4" className="bar-out"><title>{`${m.label} expenses ${money(m.spend)}`}</title></rect>
            <text x={x + bw + 3} y={H + 20} textAnchor="middle">{m.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function Dashboard({ state }) {
  const [range, setRange] = useState(PRESETS['This month']())
  const [preset, setPreset] = useState('This month')
  const s = useMemo(() => summary(state, range), [state, range])
  const months = useMemo(() => monthly(state.transactions), [state.transactions])
  const pick = (name) => { setPreset(name); if (PRESETS[name]) setRange(PRESETS[name]()) }
  const edit = (k) => (e) => { setPreset('Custom'); setRange({ ...range, [k]: e.target.value }) }

  return (
    <>
      <header className="mg-head">
        <h1>Dashboard</h1>
        <div className="mg-filters tight">
          <select value={preset} onChange={(e) => pick(e.target.value)} aria-label="Period">{[...Object.keys(PRESETS), 'Custom'].map((p) => <option key={p}>{p}</option>)}</select>
          <label className="mg-range">From <input type="date" value={range.from} onChange={edit('from')} /></label>
          <label className="mg-range">To <input type="date" value={range.to} onChange={edit('to')} /></label>
        </div>
      </header>
      <div className="mg-cards">
        <Card label="Customer collections" value={money(s.collections)} sub="Received in period" tone="good" />
        <Card label="Printing expenses" value={money(s.printing)} sub={`${money(s.printingPaid)} paid to vendors`} />
        <Card label="Other business expenses" value={money(s.other)} sub="Rent, salary, bills…" />
        <Card label="Outstanding from customers" value={money(s.outstanding)} sub="As of today, all orders" tone="warn" />
        <Card label="Pending vendor payments" value={money(s.vendorPending)} sub="As of today, all vendors" tone="warn" />
        <Card label="Gross margin" value={money(s.margin)} sub={`Revenue ${money(s.revenue)} − printing ${money(s.printing)}`} tone="good" />
      </div>
      <p className="mg-note">Net after other expenses: <b>{money(s.net)}</b>. Revenue and printing cost follow order dates; collections and expenses follow payment dates.</p>
      <section className="mg-panel">
        <h2>Monthly income vs expenses <small>(cash received vs vendor payments + expenses, last 6 months)</small></h2>
        <Chart data={months} />
        <div className="mg-legend"><span className="in">Income</span><span className="out">Expenses</span></div>
      </section>
    </>
  )
}
