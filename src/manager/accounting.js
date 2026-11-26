// All money maths lives here. Every rupee is a row in `transactions`; nothing is stored twice, so nothing can be counted twice.
export const sum = (rows, f) => rows.reduce((s, r) => s + f(r), 0)
export const inRange = (d, r) => (!r.from || d >= r.from) && (!r.to || d <= r.to)
export const orderTotal = (o) => o.design + o.print - (o.discount || 0)

// order id -> { total, paid, balance, cost, vendorPaid, vendorDue }
export function figures({ orders, transactions }) {
  const m = new Map(orders.map((o) => [o.id, { total: orderTotal(o), paid: 0, cost: o.cost, vendorPaid: 0 }]))
  for (const t of transactions) {
    const f = m.get(t.orderId)
    if (!f) continue
    if (t.type === 'customer_payment') f.paid += t.amount
    if (t.type === 'vendor_payment') f.vendorPaid += t.amount
  }
  m.forEach((f) => { f.balance = f.total - f.paid; f.vendorDue = f.cost - f.vendorPaid })
  return m
}

// Period figures (collections, expenses, margin) follow the date range; outstanding/pending are "as of now".
export function summary(state, range) {
  const fig = [...figures(state).values()]
  const tx = state.transactions.filter((t) => inRange(t.date, range))
  const orders = state.orders.filter((o) => inRange(o.date, range))
  const revenue = sum(orders, orderTotal)
  const printing = sum(orders, (o) => o.cost)
  const other = sum(tx.filter((t) => t.type === 'expense'), (t) => t.amount)
  return {
    collections: sum(tx.filter((t) => t.type === 'customer_payment'), (t) => t.amount),
    printing, printingPaid: sum(tx.filter((t) => t.type === 'vendor_payment'), (t) => t.amount),
    other, revenue, margin: revenue - printing, net: revenue - printing - other,
    outstanding: sum(fig, (f) => Math.max(0, f.balance)),
    vendorPending: sum(fig, (f) => Math.max(0, f.vendorDue)),
  }
}

// Cash basis: income = customer payments received, spend = vendor payments + expenses, per calendar month.
export function monthly(transactions, n = 6) {
  const now = new Date()
  const rows = Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
    return { key: d.toLocaleDateString('en-CA').slice(0, 7), label: d.toLocaleString('en-IN', { month: 'short' }), income: 0, spend: 0 }
  })
  for (const t of transactions) {
    const r = rows.find((x) => x.key === t.date.slice(0, 7))
    if (!r) continue
    if (t.type === 'customer_payment') r.income += t.amount
    else r.spend += t.amount
  }
  return rows
}

export const money = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
