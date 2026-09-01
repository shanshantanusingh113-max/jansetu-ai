import { useState } from 'react'
import ConfidenceBar from './ConfidenceBar'
import VoiceInput from './VoiceInput'
import { urgencyStyles } from './TicketResult'
import { updateTicket } from '../api'
import { STATUS_META, fmt } from '../utils'

const DEPARTMENTS = [
  'Municipal Water Department',
  'Municipal Drainage Department',
  'Public Works Department (PWD)',
  'Electricity Board / DISCOM',
  'Municipal Sanitation Department',
  'Municipal Electrical Department',
  'General Administration',
]

function DetailTimeline({ history }) {
  const evts = Array.isArray(history) ? history : []
  if (!evts.length) return null
  return (
    <div className="relative pl-5">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-outline-variant" />
      {evts.map((ev, i) => (
        <div key={i} className="relative pb-3 last:pb-0">
          <span className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 ${i === evts.length - 1 ? 'bg-accent border-accent' : 'bg-white border-outline-variant'}`} />
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-medium ${i === evts.length - 1 ? 'text-ink' : 'text-ink-soft'}`}>{STATUS_META[ev.status]?.label || ev.status}</span>
            {ev.at && <span className="text-[11px] text-outline">{fmt(ev.at)}</span>}
          </div>
          {ev.note && <p className="text-xs text-ink-soft mt-0.5">{ev.note}</p>}
        </div>
      ))}
    </div>
  )
}

export default function TicketDetail({ ticket, onClose, onUpdate: refreshList }) {
  const [status, setStatus] = useState(ticket.status)
  const [department, setDepartment] = useState(ticket.department)
  const [notes, setNotes] = useState(ticket.officer_notes || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try {
      await updateTicket(ticket.id, { status, officer_notes: notes, department })
      setSaved(true)
      refreshList?.()
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert('Failed to update') }
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
          {ticket.is_duplicate && ticket.duplicate_of && (
            <div className="bg-error-container/60 text-error-oncontainer p-3 rounded-lg border border-error/25 text-xs">
              ⚠ Linked as {Math.round((ticket.similarity_score || 0) * 100)}% duplicate of <a href={`/track?id=${ticket.duplicate_of}`} className="font-mono underline">{ticket.duplicate_of}</a>
            </div>
          )}
          {ticket.complaint?.photo_url && (
            <img src={ticket.complaint.photo_url} alt="complaint" className="h-40 w-full object-cover rounded-lg border border-outline-variant" />
          )}
          <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Complaint</p><p className="text-sm text-ink-soft bg-parchment-low p-3 rounded-lg border border-outline-variant">{ticket.complaint?.raw_text}</p>
            {ticket.complaint?.language === 'hi' && ticket.complaint?.translated_text && <p className="text-xs text-ink-soft mt-2 italic">Translation: {ticket.complaint.translated_text}</p>}
          </div>
          {ticket.summary && <div><p className="text-xs text-outline uppercase tracking-wider mb-1">AI Summary</p><p className="text-sm text-ink-soft bg-parchment-low p-3 rounded-lg border border-outline-variant">{ticket.summary}</p></div>}
          {ticket.feedback_rating && (
            <div className="bg-status-amber/10 text-status-amber border border-status-amber/30 rounded-lg p-3 text-sm">⭐ Citizen rating: {ticket.feedback_rating}/5{ticket.feedback_comment ? ` — ${ticket.feedback_comment}` : ''}</div>
          )}

          <div><p className="text-xs text-outline uppercase tracking-wider mb-2">Status History</p><DetailTimeline history={ticket.status_history} /></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label-text">Update Status</label>
              <select className="input-field" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="new">New</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
              </select>
            </div>
            <div><label className="label-text">Reassign Department</label>
              <select className="input-field" value={department} onChange={e => setDepartment(e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label-text">Officer Notes</label><textarea className="textarea-field h-20" placeholder="Add notes... (or use voice)" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="mt-2"><VoiceInput language="en" onTranscript={t => setNotes(prev => prev ? prev + ' ' + t : t)} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : (saved ? '✓ Saved' : 'Save Changes')}</button>
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}