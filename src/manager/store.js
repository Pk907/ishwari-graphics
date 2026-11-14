import { useEffect, useReducer } from 'react'
import { seed } from './data.js'

// Local state only. Each action maps to one future API call (save = upsert, remove = delete, addOrder = create order + customer + advance).
// shortcut: persisted in localStorage so a refresh keeps edits; swap `load`/the effect for fetch calls when the backend lands.
const KEY = 'manager-v1'
const PREFIX = { orders: ['ORD-', 1001], customers: ['C-', 1], vendors: ['V-', 1], transactions: ['T-', 1] }

export function nextId(state, kind) {
  const [p, start] = PREFIX[kind]
  const max = state[kind].reduce((m, r) => Math.max(m, Number(r.id.slice(p.length)) || 0), start - 1)
  const n = max + 1
  return p + (kind === 'orders' ? n : String(n).padStart(kind === 'transactions' ? 4 : 2, '0'))
}

const upsert = (s, kind, row) => {
  const id = row.id || nextId(s, kind)
  const exists = s[kind].some((r) => r.id === id)
  const saved = { ...row, id }
  return { ...s, [kind]: exists ? s[kind].map((r) => (r.id === id ? saved : r)) : [...s[kind], saved] }
}

function reducer(s, a) {
  switch (a.type) {
    case 'save': return upsert(s, a.kind, a.row)
    case 'remove': {
      const next = { ...s, [a.kind]: s[a.kind].filter((r) => r.id !== a.id) }
      // an order's payments go with it so no orphan money is left in the totals
      if (a.kind === 'orders') next.transactions = s.transactions.filter((t) => t.orderId !== a.id)
      return next
    }
    case 'addOrder': {
      let n = a.customer ? upsert(s, 'customers', a.customer) : s
      const customerId = a.customer ? n.customers[n.customers.length - 1].id : a.order.customerId
      n = upsert(n, 'orders', { ...a.order, customerId })
      const orderId = n.orders[n.orders.length - 1].id
      return a.advance?.amount > 0
        ? upsert(n, 'transactions', { type: 'customer_payment', orderId, note: 'Advance', date: a.order.date, ...a.advance })
        : n
    }
    case 'reset': return seed()
    default: return s
  }
}

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed() } catch { return seed() } }

export function useManager() {
  const [state, dispatch] = useReducer(reducer, null, load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode: state stays in memory */ } }, [state])
  return [state, dispatch]
}
