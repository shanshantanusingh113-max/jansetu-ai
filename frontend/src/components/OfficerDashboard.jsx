import { useState, useEffect } from 'react'
import { getTickets } from '../api'
import StatusBadge from './StatusBadge'
import ConfidenceBar from './ConfidenceBar'
import TicketDetail from './TicketDetail'
import { urgencyStyles } from './TicketResult'

export default function OfficerDashboard() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', urgency: '', status: '' })
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)
  const perPage = 10
  const fetchTickets = async () => {
    setLoading(true)
    try { setTickets(await getTickets(filters)) } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchTickets() }, [filters])
  const tp = Math.ceil(tickets.length / perPage)
  const paged = tickets.slice((page - 1) * perPage, page * perPage)
  const cats = ['Water Supply', 'Drainage', 'Road Damage', 'Electricity', 'Waste Management', 'Street Lighting']
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <select className="input-field w-auto" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}><option value="">All Categories</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select className="input-field w-auto" value={filters.urgency} onChange={e => setFilters({ ...filters, urgency: e.target.value })}><option value="">All Urgency</option>{['critical', 'high', 'medium', 'low'].map(u => <option key={u} value={u}>{u[0].toUpperCase() + u.slice(1)}</option>)}</select>
        <select className="input-field w-auto" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">All Status</option>{['new', 'in_progress', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
      </div>
      <div className="card overflow-hidden p-0 relative">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-corsair via-accent to-ink bg-[length:200%_100%] animate-grad-border" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-parchment-low border-b border-outline-variant"><tr>
              <th className="table-header">Ticket ID</th><th className="table-header">Complaint</th><th className="table-header">Category</th><th className="table-header">Urgency</th><th className="table-header">Confidence</th><th className="table-header">Status</th><th className="table-header">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? <tr><td colSpan="7" className="table-cell text-center py-8 text-outline">Loading...</td></tr>
                : paged.length === 0 ? <tr><td colSpan="7" className="table-cell text-center py-8 text-outline">No tickets found</td></tr>
                  : paged.map(t => (
                    <tr key={t.id} className="hover:bg-parchment-low cursor-pointer transition-colors" onClick={() => setSelected(t)}>
                      <td className="table-cell font-mono text-xs">{t.id}</td>
                      <td className="table-cell max-w-xs truncate">{t.complaint_text}</td>
                      <td className="table-cell text-xs font-medium">{t.category}</td>
                      <td className="table-cell"><span className={`badge border ${urgencyStyles[t.urgency_level]}`}>{t.urgency_level?.toUpperCase()}</span></td>
                      <td className="table-cell"><ConfidenceBar score={t.confidence_score} /></td>
                      <td className="table-cell"><StatusBadge status={t.status} /></td>
                      <td className="table-cell text-xs text-outline">{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
      {tp > 1 && <div className="flex items-center justify-center gap-2"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1.5">Prev</button><span className="text-sm text-ink-soft">Page {page} of {tp}</span><button disabled={page === tp} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1.5">Next</button></div>}
      {selected && <TicketDetail ticket={selected} onClose={() => setSelected(null)} onUpdate={fetchTickets} />}
    </div>
  )
}
