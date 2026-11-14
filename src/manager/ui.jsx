import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Reuses the site's .modal / .modal-card styles.
export function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [onClose])
  return createPortal(
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-card mg-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <button className="modal-x" type="button" aria-label="Close" onClick={onClose}>×</button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// Hook: `ask({ title, text, ok, run })` opens a confirmation; render `confirm` once in the view.
export function useConfirm() {
  const [c, setC] = useState(null)
  const confirm = c && (
    <Modal title={c.title} onClose={() => setC(null)}>
      <p className="modal-sub">{c.text}</p>
      <div className="mg-actions">
        <button className="mg-btn" onClick={() => setC(null)}>Cancel</button>
        <button className={`mg-btn ${c.danger ? 'danger' : 'main'}`} onClick={() => { c.run(); setC(null) }}>{c.ok || 'Confirm'}</button>
      </div>
    </Modal>
  )
  return [setC, confirm]
}

export const Field = ({ label, children }) => <label className="mg-field">{label}{children}</label>

export function Status({ value }) {
  return <span className={`pill s-${value.toLowerCase().replace(/\s+/g, '-')}`}>{value}</span>
}

export const Empty = ({ children }) => <p className="mg-empty">{children}</p>

// Search + filters + date range bar shared by the list views.
export function Filters({ q, setQ, range, setRange, children }) {
  return (
    <div className="mg-filters">
      <input type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      {children}
      <label className="mg-range">From <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
      <label className="mg-range">To <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
      {(range.from || range.to) && <button className="mg-btn" onClick={() => setRange({ from: '', to: '' })}>Clear dates</button>}
    </div>
  )
}
