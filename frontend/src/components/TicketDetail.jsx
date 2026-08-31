import { useState } from 'react'
import ConfidenceBar from './ConfidenceBar'
import { urgencyStyles } from './TicketResult'
import { updateTicket } from '../api'

export default function TicketDetail({ ticket, onClose, onUpdate }) {
  const [status, setStatus] = useState(ticket.status)
  const [notes, setNotes] = useState(ticket.officer_notes || '')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    setSaving(true)
    try { await updateTicket(ticket.id, { status, officer_notes: notes }); onUpdate?.() }
    catch (e) { alert('Failed to update') }
    finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 bg-ink bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-paper max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-outline-variant">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <div><h2 className="font-display italic text-2xl text-ink">Ticket Details</h2><p className="text-sm text-corsair font-mono">{ticket.id}</p></div>
          <button onClick={onClose} className="text-outline hover:text-ink p-2"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Category</p><p className="text-sm font-semibold text-ink">{ticket.category}</p></div>
            <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Department</p><p className="text-sm font-semibold text-ink">{ticket.department}</p></div>
            <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Urgency</p><span className={`badge border ${urgencyStyles[ticket.urgency_level]}`}>{ticket.urgency_level?.toUpperCase()}</span></div>
            <div><p className="text-xs text-outline uppercase tracking-wider mb-1">AI Confidence</p><ConfidenceBar score={ticket.confidence_score} /></div>
          </div>
          <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Complaint</p><p className="text-sm text-ink-soft bg-parchment-low p-3 rounded-lg border border-outline-variant">{ticket.complaint?.raw_text}</p>
            {ticket.complaint?.language === 'hi' && ticket.complaint?.translated_text && <p className="text-xs text-ink-soft mt-2 italic">Translation: {ticket.complaint.translated_text}</p>}
          </div>
          {ticket.summary && <div><p className="text-xs text-outline uppercase tracking-wider mb-1">AI Summary</p><p className="text-sm text-ink-soft bg-parchment-low p-3 rounded-lg border border-outline-variant">{ticket.summary}</p></div>}
          <div><label className="label-text">Update Status</label>
            <select className="input-field" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="new">New</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
            </select>
          </div>
          <div><label className="label-text">Officer Notes</label><textarea className="textarea-field h-24" placeholder="Add notes..." value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Changes'}</button>
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
