import { useMemo, useState } from 'react'
import { CATEGORIES, METHODS, today } from './data.js'
import { figures, inRange, money, sum } from './accounting.js'
import { Empty, Field, Filters, Modal, useConfirm } from './ui.jsx'

export const TYPES = { customer_payment: 'Customer payment', vendor_payment: 'Vendor payment', expense: 'Expense' }

// One form for all three money movements. Payments must point at an order, and can't exceed what is still owed,
// so a payment is only ever recorded once and balances never go negative.
export function TxnForm({ state, dispatch, initial = {}, onDone }) {
  const fig = useMemo(() => figures(state), [state])
  const first = fig.get(initial.orderId) // opened from an order/vendor row: prefill what is still owed
  const [f, setF] = useState({ type: 'customer_payment', date: today(), method: METHODS[0], amount: first ? (initial.type === 'vendor_payment' ? first.vendorDue : first.balance) : '', orderId: '', category: CATEGORIES[0], note: '', ...initial })
  const set = (e) => setF({ ...f, [e.target.name]: e.target.value })
  const isCust = f.type === 'customer_payment', isVendor = f.type === 'vendor_payment'
  const open = state.orders.filter((o) => (isCust ? fig.get(o.id).balance > 0 : o.vendorId && fig.get(o.id).vendorDue > 0) || o.id === initial.orderId)
  const order = state.orders.find((o) => o.id === f.orderId)
  const due = order ? (isCust ? fig.get(order.id).balance : fig.get(order.id).vendorDue) : 0
  const custName = (id) => state.customers.find((c) => c.id === id)?.name
  const vendor = order && state.vendors.find((v) => v.id === order.vendorId)

  const pickOrder = (e) => {
    const o = state.orders.find((x) => x.id === e.target.value)
    const d = o ? (isCust ? fig.get(o.id).balance : fig.get(o.id).vendorDue) : ''
    setF({ ...f, orderId: e.target.value, amount: d })
  }
  const submit = (e) => {
    e.preventDefault()
    const row = { type: f.type, date: f.date, method: f.method, amount: Number(f.amount), note: f.note }
    if (f.type === 'expense') row.category = f.category
    else row.orderId = f.orderId
    if (isVendor) row.vendorId = order.vendorId
    dispatch({ type: 'save', kind: 'transactions', row })
    onDone()
  }

  return (
    <form className="mg-form" onSubmit={submit}>
      <Field label="Type">
        <select name="type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, orderId: '', amount: '' })}>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      {f.type === 'expense' ? (
        <Field label="Category"><select name="category" value={f.category} onChange={set}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      ) : (
        <Field label={isCust ? 'Order (with balance due)' : 'Order (with vendor payment pending)'}>
          <select name="orderId" value={f.orderId} onChange={pickOrder} required>
            <option value="">Select order…</option>
            {open.map((o) => <option key={o.id} value={o.id}>{o.id} · {custName(o.customerId)} · due {money(isCust ? fig.get(o.id).balance : fig.get(o.id).vendorDue)}</option>)}
          </select>
        </Field>
      )}
      {isVendor && vendor && <p className="mg-hint">Paying <b>{vendor.name}</b>. Still pending: {money(due)}</p>}
      {isCust && order && <p className="mg-hint">Balance due on this order: {money(due)}</p>}
      <div className="mg-row">
        <Field label="Amount (₹)"><input name="amount" type="number" min="1" max={f.type === 'expense' ? undefined : due || undefined} step="1" value={f.amount} onChange={set} required /></Field>
        <Field label="Method"><select name="method" value={f.method} onChange={set}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
      </div>
      <div className="mg-row">
        <Field label="Date"><input name="date" type="date" value={f.date} onChange={set} required max={today()} /></Field>
        <Field label="Note"><input name="note" value={f.note} onChange={set} placeholder="Optional" /></Field>
      </div>
      <div className="mg-actions"><button type="button" className="mg-btn" onClick={onDone}>Cancel</button><button className="mg-btn main">Save</button></div>
    </form>
  )
}

export default function Transactions({ state, dispatch }) {
  const [q, setQ] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [type, setType] = useState('')
  const [method, setMethod] = useState('')
  const [adding, setAdding] = useState(false)
  const [ask, confirm] = useConfirm()
  const party = (t) => t.type === 'expense' ? t.category
    : t.type === 'vendor_payment' ? state.vendors.find((v) => v.id === t.vendorId)?.name
    : state.customers.find((c) => c.id === state.orders.find((o) => o.id === t.orderId)?.customerId)?.name

  const rows = state.transactions
    .filter((t) => inRange(t.date, range) && (!type || t.type === type) && (!method || t.method === method)
      && `${t.id} ${t.orderId || ''} ${t.note} ${party(t) || ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  return (
    <>
      <header className="mg-head"><h1>Transactions</h1><button className="mg-btn main" onClick={() => setAdding(true)}>+ Record transaction</button></header>
      <Filters q={q} setQ={setQ} range={range} setRange={setRange}>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type"><option value="">All types</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Method"><option value="">All methods</option>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
      </Filters>
      <p className="mg-total">{rows.length} entries · Money in {money(sum(rows.filter((t) => t.type === 'customer_payment'), (t) => t.amount))} · Money out {money(sum(rows.filter((t) => t.type !== 'customer_payment'), (t) => t.amount))}</p>
      <div className="mg-table">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Party / category</th><th>Order</th><th>Method</th><th>Note</th><th className="num">Amount</th><th /></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td><span className={`pill t-${t.type}`}>{TYPES[t.type]}</span></td>
                <td>{party(t) || '-'}</td><td>{t.orderId || '-'}</td><td>{t.method}</td><td>{t.note}</td>
                <td className={`num ${t.type === 'customer_payment' ? 'in' : 'out'}`}>{t.type === 'customer_payment' ? '+' : '−'}{money(t.amount)}</td>
                <td className="act"><button className="mg-link danger" onClick={() => ask({ title: 'Delete transaction?', text: `${TYPES[t.type]} of ${money(t.amount)} on ${t.date} will be removed and balances will change.`, ok: 'Delete', danger: true, run: () => dispatch({ type: 'remove', kind: 'transactions', id: t.id }) })}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>No transactions match these filters.</Empty>}
      </div>
      {adding && <Modal title="Record transaction" onClose={() => setAdding(false)}><TxnForm state={state} dispatch={dispatch} onDone={() => setAdding(false)} /></Modal>}
      {confirm}
    </>
  )
}
