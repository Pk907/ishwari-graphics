import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase.js'

// Manager data lives in Django (/api/manager/), which checks the Supabase admin sign-in on every call.
// Every write returns the full state, so the store just swaps it in; the views keep the same rows and actions as before.
async function api(path, { method = 'GET', body } = {}) {
  const { data } = await getSupabaseClient().auth.getSession()
  const r = await fetch(`/api/manager/${path}`, {
    method,
    headers: { Authorization: `Bearer ${data.session?.access_token || ''}`, ...(body && { 'Content-Type': 'application/json' }) },
    body: body && JSON.stringify(body),
  })
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || `Server error (${r.status}). Please try again.`)
  return r
}

function download(blob, name) {
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function useManager() {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const run = useCallback(async (path, opts) => {
    try { setState(await (await api(path, opts)).json()); setError('') } catch (e) { setError(e.message) }
  }, [])
  useEffect(() => { run('') }, [run])

  // save = upsert, remove = delete, addOrder = create order + new customer + advance in one server transaction.
  const dispatch = useCallback(async (a) => {
    switch (a.type) {
      case 'save': return run(`${a.kind}/`, { method: 'POST', body: { row: a.row } })
      case 'remove': return run(`${a.kind}/${a.id}/`, { method: 'DELETE' })
      case 'addOrder': return run('orders/', { method: 'POST', body: { row: a.order, customer: a.customer, advance: a.advance } })
      case 'markPaid': return run(`orders/${a.id}/paid/`, { method: 'POST' })
      case 'receipt': // create: true makes the receipt (once, server-side); otherwise re-downloads the stored PDF
        try {
          const r = await api(`orders/${a.id}/receipt/`, { method: a.create ? 'POST' : 'GET' })
          download(await r.blob(), r.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1] || `receipt-${a.id}.pdf`)
          setError('')
          if (a.create) await run('')
        } catch (e) { setError(e.message) }
    }
  }, [run])

  return [state, dispatch, error]
}
