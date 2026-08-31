import ConfidenceBar from './ConfidenceBar'
import StatusBadge from './StatusBadge'
import { urgencyStyles } from './TicketResult'

export default function TicketCard({ ticket }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div><p className="text-xs text-outline uppercase tracking-wider">Ticket ID</p><p className="text-lg font-bold text-ink font-mono">{ticket.id}</p></div>
        <StatusBadge status={ticket.status} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Category</p><p className="text-sm font-semibold text-ink">{ticket.category}</p></div>
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Department</p><p className="text-sm font-semibold text-ink">{ticket.department}</p></div>
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Urgency</p><span className={`badge border ${urgencyStyles[ticket.urgency_level]}`}>{ticket.urgency_level?.toUpperCase()}</span></div>
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Created</p><p className="text-sm text-ink-soft">{new Date(ticket.created_at).toLocaleDateString()}</p></div>
      </div>
      <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Complaint</p><p className="text-sm text-ink-soft">{ticket.complaint?.raw_text}</p>
        {ticket.complaint?.language === 'hi' && ticket.complaint?.translated_text && <p className="text-xs text-ink-soft mt-1 italic">Translation: {ticket.complaint.translated_text}</p>}
      </div>
      <div><p className="text-xs text-outline uppercase tracking-wider mb-1">AI Confidence</p><ConfidenceBar score={ticket.confidence_score} /></div>
      {ticket.summary && <div><p className="text-xs text-outline uppercase tracking-wider mb-1">AI Summary</p><p className="text-sm text-ink-soft bg-parchment-low p-3 rounded-lg border border-outline-variant">{ticket.summary}</p></div>}
    </div>
  )
}
