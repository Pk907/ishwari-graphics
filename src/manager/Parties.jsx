import { useMemo, useState } from 'react'
import { figures, money, sum } from './accounting.js'
import { Empty, Field, Modal, Status, useConfirm } from './ui.jsx'
import { TxnForm } from './Transactions.jsx'

function PartyForm({ row, onSave, onDone }) {
  const [f, setF] = useState(row || { name: '', phone: '', address: '' })
  const set = (e) => setF({ ...f, [e.target.name]: e.target.value })
  return (
    <form className="mg-form" onSubmit={(e) => { e.preventDefault(); onSave(f); onDone() }}>
      <Field label="Name"><input name="name" value={f.name} onChange={set} required /></Field>
      <Field label="Phone"><input name="phone" value={f.phone} onChange={set} type="tel" pattern="[0-9+ ]{10,14}" required /></Field>
      <Field label="Address"><input name="address" value={f.address} onChange={set} /></Field>
      <div className="mg-actions"><button type="button" className="mg-btn" onClick={onDone}>Cancel</button><button className="mg-btn main">Save</button></div>
    </form>
  )
}

// Customers and vendors are the same screen: a list with money columns, add/edit/delete, and a detail view of linked orders.
// vendor = false -> customer view (billed / received / balance); true -> vendor view (printing cost / paid / pending).
function Parties({ state, dispatch, vendor }) {
  const kind = vendor ? 'vendors' : 'customers'
  const label = vendor ? 'vendor' : 'customer'
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null)
  const [view, setView] = useState(null)
  const [pay, setPay] = useState(null)
  const [ask, confirm] = useConfirm()
  const fig = useMemo(() => figures(state), [state])
  const link = (p) => state.orders.filter((o) => (vendor ? o.vendorId : o.customerId) === p.id)
  const money3 = (p) => {
    const os = link(p).map((o) => fig.get(o.id))
    return vendor
      ? [sum(os, (f) => f.cost), sum(os, (f) => f.vendorPaid), sum(os, (f) => f.vendorDue)]
      : [sum(os, (f) => f.total), sum(os, (f) => f.paid), sum(os, (f) => f.balance)]
  }
  const rows = state[kind].filter((p) => `${p.name} ${p.phone} ${p.address}`.toLowerCase().includes(q.toLowerCase()))
  const heads = vendor ? ['Printing cost', 'Paid', 'Pending'] : ['Billed', 'Received', 'Outstanding']

  const remove = (p) => link(p).length
    ? ask({ title: `Can't delete ${p.name}`, text: `${link(p).length} order(s) are linked to this ${label}. Delete or reassign those orders first.`, ok: 'OK', run: () => {} })
    : ask({ title: `Delete ${p.name}?`, text: `This ${label} will be removed.`, ok: 'Delete', danger: true, run: () => dispatch({ type: 'remove', kind, id: p.id }) })

  const selected = view && state[kind].find((p) => p.id === view)
  return (
    <>
      <header className="mg-head"><h1>{vendor ? 'Vendors' : 'Customers'}</h1><button className="mg-btn main" onClick={() => setForm({})}>+ Add {label}</button></header>
      <div className="mg-filters"><input type="search" placeholder={`Search ${kind}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>
      <div className="mg-table">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Address</th><th className="num">Orders</th>{heads.map((h) => <th className="num" key={h}>{h}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((p) => {
              const [a, b, c] = money3(p)
              return (
                <tr key={p.id}>
                  <td><button className="mg-link" onClick={() => setView(p.id)}><b>{p.name}</b></button></td>
                  <td>{p.phone}</td><td>{p.address}</td><td className="num">{link(p).length}</td>
                  <td className="num">{money(a)}</td><td className="num in">{money(b)}</td><td className={`num ${c > 0 ? 'out' : ''}`}>{c > 0 ? money(c) : '-'}</td>
                  <td className="act">
                    <button className="mg-link" onClick={() => setView(p.id)}>View</button>
                    <button className="mg-link" onClick={() => setForm({ row: p })}>Edit</button>
                    <button className="mg-link danger" onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!rows.length && <Empty>No {kind} found.</Empty>}
      </div>

      {form && <Modal title={form.row ? `Edit ${label}` : `Add ${label}`} onClose={() => setForm(null)}><PartyForm row={form.row} onDone={() => setForm(null)} onSave={(row) => dispatch({ type: 'save', kind, row })} /></Modal>}
      {selected && (
        <Modal title={selected.name} onClose={() => setView(null)} wide>
          <p className="modal-sub">{selected.phone}{selected.address && ` · ${selected.address}`}</p>
          <div className="mg-kv">{money3(selected).map((m, i) => <div key={i}><small>{heads[i]}</small><b>{money(m)}</b></div>)}</div>
          <h3 className="mg-sub">Order history</h3>
          <div className="mg-table">
            <table>
              <thead><tr><th>Order</th><th>Date</th><th>Description</th><th>Status</th>{vendor ? <><th className="num">Cost</th><th className="num">Pending</th></> : <><th className="num">Total</th><th className="num">Balance</th></>}<th /></tr></thead>
              <tbody>
                {link(selected).sort((a, b) => b.date.localeCompare(a.date)).map((o) => {
                  const f = fig.get(o.id), left = vendor ? f.vendorDue : f.balance
                  return (
                    <tr key={o.id}>
                      <td><b>{o.id}</b></td><td>{o.date}</td><td>{o.desc}</td><td><Status value={o.status} /></td>
                      <td className="num">{money(vendor ? f.cost : f.total)}</td><td className={`num ${left > 0 ? 'out' : ''}`}>{left > 0 ? money(left) : 'Paid'}</td>
                      <td className="act">{left > 0 && <button className="mg-link" onClick={() => setPay({ type: vendor ? 'vendor_payment' : 'customer_payment', orderId: o.id })}>{vendor ? 'Pay' : 'Add payment'}</button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!link(selected).length && <Empty>No orders yet.</Empty>}
          </div>
        </Modal>
      )}
      {pay && <Modal title={vendor ? 'Pay vendor' : 'Customer payment'} onClose={() => setPay(null)}><TxnForm state={state} dispatch={dispatch} initial={pay} onDone={() => setPay(null)} /></Modal>}
      {confirm}
    </>
  )
}

export const Customers = (p) => <Parties {...p} />
export const Vendors = (p) => <Parties {...p} vendor />
