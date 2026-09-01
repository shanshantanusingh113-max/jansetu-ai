import { useState, useEffect, useRef } from 'react'
import { getTickets, updateTicket, bulkUpdateTickets, exportTickets } from '../api'
import StatusBadge from './StatusBadge'
import ConfidenceBar from './ConfidenceBar'
import TicketDetail from './TicketDetail'
import { urgencyStyles } from './TicketResult'

const cats = ['Water Supply', 'Drainage', 'Road Damage', 'Electricity', 'Waste Management', 'Street Lighting']
const statuses = ['new', 'in_progress', 'resolved', 'closed']

const COLUMNS = [
  { key: 'created_at', label: 'Date', sortable: true },
  { key: 'urgency_level', label: 'Urgency', sortable: true },
  { key: 'confidence_score', label: 'Confidence', sortable: true },
]

const STATUS_LABEL = { new: 'Start', in_progress: 'Resolve', resolved: 'Reopen' }

function quickActionFor(status) {
  if (status === 'new') return { to: 'in_progress', label: 'Start' }
  if (status === 'in_progress') return { to: 'resolved', label: 'Resolve' }
  if (status === 'resolved') return { to: 'in_progress', label: 'Reopen' }
  return null
}

export default function OfficerDashboard({ refreshSignal }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', urgency: '', status: '', search: '', sort: '', order: 'desc' })
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState(new Set())
  const [page, setPage] = useState(1)
  const [bulkMsg, setBulkMsg] = useState('')
  const perPage = 10
  const searchRef = useRef(null)

  const fetchTickets = async (f) => {
    setLoading(true)
    try { setTickets(await getTickets(f)) } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchTickets(filters); setChecked(new Set()); setPage(1) }, [filters])
  useEffect(() => { if (refreshSignal) fetchTickets(filters) }, [refreshSignal])

  const setFilter = (k, v) => setFilters(prev => ({ ...prev, [k]: v }))

  const toggleSort = (key) => {
    const same = filters.sort === key
    setFilter('sort', key)
    setFilter('order', same && filters.order === 'asc' ? 'desc' : 'asc')
  }

  const toggleChecked = (id) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    setChecked(prev => prev.size === paged.length ? new Set() : new Set(paged.map(t => t.id)))
  }

  const runBulk = async (status) => {
    if (checked.size === 0) return
    try {
      const target = status === 'reopen' ? 'in_progress' : status
      const r = await bulkUpdateTickets([...checked], target)
      setBulkMsg(`✓ Updated ${r.updated} ticket(s) to ${target}`)
      setChecked(new Set())
      setTimeout(() => setBulkMsg(''), 3000)
      fetchTickets(filters)
    } catch (e) { setBulkMsg('✗ Bulk update failed') }
  }

  const quickAction = async (t) => {
    const qa = quickActionFor(t.status)
    if (!qa) return
    try { await updateTicket(t.id, { status: qa.to }); fetchTickets(filters) } catch (e) { /* ignore */ }
  }

  const doExport = () => window.open(exportTickets(filters), '_blank')

  const tp = Math.ceil(tickets.length / perPage)
  const paged = tickets.slice((page - 1) * perPage, page * perPage)
  const allChecked = paged.length > 0 && checked.size === paged.length

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </span>
          <input
            ref={searchRef} type="text" className="input-field pl-9" placeholder="Search by ID, citizen, location, keyword…"
            value={filters.search} onChange={e => setFilter('search', e.target.value)}
          />
        </div>
        <select className="input-field w-auto" value={filters.category} onChange={e => setFilter('category', e.target.value)}><option value="">All Categories</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select className="input-field w-auto" value={filters.urgency} onChange={e => setFilter('urgency', e.target.value)}><option value="">All Urgency</option>{['critical', 'high', 'medium', 'low'].map(u => <option key={u} value={u}>{u[0].toUpperCase() + u.slice(1)}</option>)}</select>
        <select className="input-field w-auto" value={filters.status} onChange={e => setFilter('status', e.target.value)}><option value="">All Status</option>{statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
        <button onClick={() => fetchTickets(filters)} className="btn-secondary text-xs px-4 py-3">🔄 Refresh</button>
        <button onClick={doExport} className="btn-secondary text-xs px-4 py-3">⬇ Export CSV</button>
        <button onClick={() => window.print()} className="btn-secondary text-xs px-4 py-3">🖨 Print</button>
      </div>

      {/* Bulk action bar */}
      <div className={`no-print flex flex-wrap items-center gap-3 transition-all duration-200 ${checked.size ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <span className="text-sm font-medium text-ink">{checked.size} selected</span>
        <div className="flex gap-2">
          <button onClick={() => runBulk('in_progress')} className="btn-secondary text-xs px-3 py-2">Start / In Progress</button>
          <button onClick={() => runBulk('resolved')} className="btn-secondary text-xs px-3 py-2">Resolve</button>
          <button onClick={() => runBulk('closed')} className="btn-secondary text-xs px-3 py-2">Close</button>
          <button onClick={() => runBulk('reopen')} className="btn-secondary text-xs px-3 py-2">Reopen</button>
          <button onClick={() => setChecked(new Set())} className="btn-secondary text-xs px-3 py-2">Clear</button>
        </div>
        {bulkMsg && <span className="text-xs font-medium text-status-green">{bulkMsg}</span>}
      </div>

      <div className="card overflow-hidden p-0 relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-corsair via-accent to-ink bg-[length:200%_100%] animate-grad-border" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-parchment-low border-b border-outline-variant"><tr>
              <th className="table-header w-10"><input type="checkbox" className="accent-ink" checked={allChecked} onChange={toggleAll} /></th>
              <th className="table-header">Ticket ID</th>
              <th className="table-header">Complaint</th>
              <th className="table-header">Category</th>
              {COLUMNS.map(col => (
                <th key={col.key} className={`table-header cursor-pointer select-none ${col.sortable ? 'hover:text-ink' : ''}`} onClick={() => col.sortable && toggleSort(col.key)}>
                  {col.label} {filters.sort === col.key ? (filters.order === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th className="table-header">Status</th>
              <th className="table-header no-print">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? <tr><td colSpan="9" className="table-cell text-center py-8 text-outline">Loading...</td></tr>
                : paged.length === 0 ? <tr><td colSpan="9" className="table-cell text-center py-8 text-outline">No tickets found</td></tr>
                  : paged.map(t => {
                    const qa = quickActionFor(t.status)
                    return (
                      <tr key={t.id} className="hover:bg-parchment-low cursor-pointer transition-colors" onClick={() => setSelected(t)}>
                        <td className="table-cell" onClick={e => e.stopPropagation()}><input type="checkbox" className="accent-ink" checked={checked.has(t.id)} onChange={() => toggleChecked(t.id)} /></td>
                        <td className="table-cell font-mono text-xs">{t.id}</td>
                        <td className="table-cell max-w-xs truncate">{t.complaint_text}</td>
                        <td className="table-cell text-xs font-medium">{t.category}</td>
                        <td className="table-cell text-xs text-outline">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td className="table-cell"><span className={`badge border ${urgencyStyles[t.urgency_level]}`}>{t.urgency_level?.toUpperCase()}</span></td>
                        <td className="table-cell"><ConfidenceBar score={t.confidence_score} /></td>
                        <td className="table-cell"><StatusBadge status={t.status} /></td>
                        <td className="table-cell no-print" onClick={e => e.stopPropagation()}>
                          {qa ? (
                            <button onClick={() => quickAction(t)} className="btn-secondary text-xs px-3 py-1.5">{qa.label}</button>
                          ) : (
                            <span className="text-outline text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {tp > 1 && <div className="no-print flex items-center justify-center gap-2"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1.5">Prev</button><span className="text-sm text-ink-soft">Page {page} of {tp}</span><button disabled={page === tp} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1.5">Next</button></div>}
      {selected && <TicketDetail ticket={selected} onClose={() => setSelected(null)} onUpdate={() => { fetchTickets(filters); setSelected(null) }} />}
    </div>
  )
}