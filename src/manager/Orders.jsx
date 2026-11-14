import { useMemo, useState } from 'react'
import { METHODS, STATUSES, today } from './data.js'
import { figures, inRange, money } from './accounting.js'
import { Empty, Field, Filters, Modal, Status, useConfirm } from './ui.jsx'
import { TxnForm, TYPES } from './Transactions.jsx'

const NEW = '__new'

function OrderForm({ state, dispatch, order, fig, onDone }) {
  const [f, setF] = useState(order || { customerId: state.customers[0]?.id || NEW, desc: '', design: '', print: '', vendorId: '', cost: '', status: STATUSES[0], date: today() })
  const [nc, setNc] = useState({ name: '', phone: '', address: '' })
  const [adv, setAdv] = useState({ amount: '', method: METHODS[0] })
  const [err, setErr] = useState('')
  const set = (e) => setF({ ...f, [e.target.name]: e.target.value })
  const locked = order && fig.vendorPaid > 0 // vendor already paid for this order: don't reassign

  const submit = (e) => {
    e.preventDefault()
    const row = { ...f, design: Number(f.design), print: Number(f.print || 0), cost: Number(f.cost || 0) }
    const total = row.design + row.print
    if (row.cost > 0 && !row.vendorId) return setErr('Choose the printing vendor for this printing cost.')
    if (order && total < fig.paid) return setErr(`Total can't be below ${money(fig.paid)} already received.`)
    if (order && row.cost < fig.vendorPaid) return setErr(`Printing cost can't be below ${money(fig.vendorPaid)} already paid to the vendor.`)
    if (!order && Number(adv.amount) > total) return setErr('Advance is more than the quotation total.')
    if (order) dispatch({ type: 'save', kind: 'orders', row })
    else dispatch({ type: 'addOrder', order: row, customer: f.customerId === NEW ? { ...nc } : null, advance: { amount: Number(adv.amount || 0), method: adv.method } })
    onDone()
  }
  const total = Number(f.design || 0) + Number(f.print || 0)

  return (
    <form className="mg-form" onSubmit={submit}>
      {order ? <p className="mg-hint">Customer: <b>{state.customers.find((c) => c.id === order.customerId)?.name}</b></p> : (
        <>
          <Field label="Customer">
            <select name="customerId" value={f.customerId} onChange={set}>
              {state.customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
              <option value={NEW}>+ New customer…</option>
            </select>
          </Field>
          {f.customerId === NEW && (
            <div className="mg-row">
              <Field label="Name"><input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} required /></Field>
              <Field label="Phone"><input value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} type="tel" pattern="[0-9+ ]{10,14}" required /></Field>
            </div>
          )}
        </>
      )}
      <Field label="Order description"><input name="desc" value={f.desc} onChange={set} required placeholder="e.g. Flex banner 10×3 ft" /></Field>
      <div className="mg-row">
        <Field label="Design charges (₹)"><input name="design" type="number" min="0" value={f.design} onChange={set} required /></Field>
        <Field label="Printing charges (₹)"><input name="print" type="number" min="0" value={f.print} onChange={set} placeholder="0" /></Field>
      </div>
      <p className="mg-hint">Quotation total: <b>{money(total)}</b></p>
      <div className="mg-row">
        <Field label="Printing vendor"><select name="vendorId" value={f.vendorId} onChange={set} disabled={locked}><option value="">None / not assigned</option>{state.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
        <Field label="Vendor printing cost (₹)"><input name="cost" type="number" min="0" value={f.cost} onChange={set} placeholder="0" /></Field>
      </div>
      <div className="mg-row">
        <Field label="Status"><select name="status" value={f.status} onChange={set}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Order date"><input name="date" type="date" value={f.date} onChange={set} required /></Field>
      </div>
      {!order && (
        <div className="mg-row">
          <Field label="Advance received (₹)"><input type="number" min="0" value={adv.amount} onChange={(e) => setAdv({ ...adv, amount: e.target.value })} placeholder="0" /></Field>
          <Field label="Advance method"><select value={adv.method} onChange={(e) => setAdv({ ...adv, method: e.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        </div>
      )}
      {err && <p className="mg-err" role="alert">{err}</p>}
      <div className="mg-actions"><button type="button" className="mg-btn" onClick={onDone}>Cancel</button><button className="mg-btn main">{order ? 'Save changes' : 'Create order'}</button></div>
    </form>
  )
}

function Detail({ state, id, onClose, pay }) {
  const o = state.orders.find((x) => x.id === id)
  const fig = figures(state).get(id)
  if (!o) return null
  const c = state.customers.find((x) => x.id === o.customerId)
  const v = state.vendors.find((x) => x.id === o.vendorId)
  const txs = state.transactions.filter((t) => t.orderId === id).sort((a, b) => a.date.localeCompare(b.date))
  return (
    <Modal title={`${o.id} · ${o.desc}`} onClose={onClose} wide>
      <div className="mg-kv">
        <div><small>Customer</small><b>{c?.name}</b><span>{c?.phone}</span></div>
        <div><small>Status</small><Status value={o.status} /></div>
        <div><small>Quotation</small><b>{money(fig.total)}</b><span>Design {money(o.design)} + Printing {money(o.print)}</span></div>
        <div><small>Received / Balance</small><b>{money(fig.paid)} / {money(fig.balance)}</b></div>
        <div><small>Vendor</small><b>{v?.name || '-'}</b><span>Cost {money(o.cost)} · Paid {money(fig.vendorPaid)} · Pending {money(fig.vendorDue)}</span></div>
      </div>
      <div className="mg-actions left">
        {fig.balance > 0 && <button className="mg-btn main" onClick={() => pay({ type: 'customer_payment', orderId: id })}>+ Customer payment</button>}
        {v && fig.vendorDue > 0 && <button className="mg-btn" onClick={() => pay({ type: 'vendor_payment', orderId: id })}>+ Pay vendor</button>}
      </div>
      <h3 className="mg-sub">Payment history</h3>
      <div className="mg-table">
        <table><thead><tr><th>Date</th><th>Type</th><th>Method</th><th>Note</th><th className="num">Amount</th></tr></thead>
          <tbody>{txs.map((t) => <tr key={t.id}><td>{t.date}</td><td>{TYPES[t.type]}</td><td>{t.method}</td><td>{t.note}</td><td className={`num ${t.type === 'customer_payment' ? 'in' : 'out'}`}>{money(t.amount)}</td></tr>)}</tbody></table>
        {!txs.length && <Empty>No payments recorded yet.</Empty>}
      </div>
    </Modal>
  )
}

export default function Orders({ state, dispatch }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [form, setForm] = useState(null) // { order? }
  const [view, setView] = useState(null)
  const [pay, setPay] = useState(null)
  const [ask, confirm] = useConfirm()
  const fig = useMemo(() => figures(state), [state])
  const cust = (id) => state.customers.find((c) => c.id === id)

  const rows = state.orders
    .filter((o) => inRange(o.date, range) && (!status || o.status === status)
      && `${o.id} ${o.desc} ${cust(o.customerId)?.name} ${cust(o.customerId)?.phone}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  const setOrderStatus = (o, s) => {
    const go = () => dispatch({ type: 'save', kind: 'orders', row: { ...o, status: s } })
    const f = fig.get(o.id)
    if (s === 'Delivered' && f.balance > 0) ask({ title: 'Mark as delivered?', text: `${o.id} still has ${money(f.balance)} unpaid by the customer.`, ok: 'Mark delivered', run: go })
    else go()
  }
  const remove = (o) => ask({
    title: `Delete ${o.id}?`, danger: true, ok: 'Delete order',
    text: `This also removes ${state.transactions.filter((t) => t.orderId === o.id).length} payment(s) recorded against it. This cannot be undone.`,
    run: () => dispatch({ type: 'remove', kind: 'orders', id: o.id }),
  })

  return (
    <>
      <header className="mg-head"><h1>Orders</h1><button className="mg-btn main" onClick={() => setForm({})}>+ New order</button></header>
      <Filters q={q} setQ={setQ} range={range} setRange={setRange}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </Filters>
      <div className="mg-table">
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Description</th><th className="num">Design</th><th className="num">Printing</th><th className="num">Total</th><th className="num">Received</th><th className="num">Balance</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((o) => {
              const f = fig.get(o.id)
              return (
                <tr key={o.id}>
                  <td><button className="mg-link" onClick={() => setView(o.id)}><b>{o.id}</b></button><small className="sub">{o.date}</small></td>
                  <td>{cust(o.customerId)?.name}<small className="sub">{cust(o.customerId)?.phone}</small></td>
                  <td>{o.desc}</td>
                  <td className="num">{money(o.design)}</td><td className="num">{money(o.print)}</td><td className="num"><b>{money(f.total)}</b></td>
                  <td className="num in">{money(f.paid)}</td><td className={`num ${f.balance > 0 ? 'out' : ''}`}>{f.balance > 0 ? money(f.balance) : 'Paid'}</td>
                  <td><select className={`pill-select s-${o.status.toLowerCase().replace(/\s+/g, '-')}`} value={o.status} onChange={(e) => setOrderStatus(o, e.target.value)} aria-label={`Status of ${o.id}`}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
                  <td className="act">
                    <button className="mg-link" onClick={() => setView(o.id)}>View</button>
                    <button className="mg-link" onClick={() => setForm({ order: o })}>Edit</button>
                    <button className="mg-link danger" onClick={() => remove(o)}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!rows.length && <Empty>No orders match these filters.</Empty>}
      </div>
      {form && <Modal title={form.order ? `Edit ${form.order.id}` : 'New order'} onClose={() => setForm(null)}><OrderForm state={state} dispatch={dispatch} order={form.order} fig={form.order && fig.get(form.order.id)} onDone={() => setForm(null)} /></Modal>}
      {view && <Detail state={state} id={view} onClose={() => setView(null)} pay={setPay} />}
      {pay && <Modal title={TYPES[pay.type]} onClose={() => setPay(null)}><TxnForm state={state} dispatch={dispatch} initial={pay} onDone={() => setPay(null)} /></Modal>}
      {confirm}
    </>
  )
}
