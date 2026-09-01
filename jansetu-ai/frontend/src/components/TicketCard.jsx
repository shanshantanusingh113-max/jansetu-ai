import { useState } from 'react'
import ConfidenceBar from './ConfidenceBar'
import StatusBadge from './StatusBadge'
import { urgencyStyles } from './TicketResult'
import { addFeedback } from '../api'
import { STATUS_META, fmt, whatsappUrl, copyToClipboard } from '../utils'

function StatusTimeline({ history, lang }) {
  const evts = Array.isArray(history) ? history : []
  if (evts.length === 0) return null
  return (
    <div className="space-y-0">
      <p className="text-xs text-outline uppercase tracking-wider mb-2">{lang === 'hi' ? 'स्थिति इतिहास' : 'Status Timeline'}</p>
      <div className="relative pl-5">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-outline-variant" />
        {evts.map((ev, i) => (
          <div key={i} className="relative pb-3 last:pb-0">
            <span className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 ${i === evts.length - 1 ? 'bg-accent border-accent' : 'bg-white border-outline-variant'}`} />
            <div className="flex items-baseline gap-2">
              <span className={`text-sm font-medium ${i === evts.length - 1 ? 'text-ink' : 'text-ink-soft'}`}>
                {lang === 'hi' ? (STATUS_META[ev.status]?.hi || ev.status) : (STATUS_META[ev.status]?.label || ev.status)}
              </span>
              <span className="text-[11px] text-outline">{fmt(ev.at)}</span>
            </div>
            {ev.note && <p className="text-xs text-ink-soft mt-0.5">{ev.note}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

function FeedbackForm({ ticket, lang, onDone }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!rating) return
    setSaving(true)
    try { await addFeedback(ticket.id, rating, comment || null); onDone() }
    catch (e) { /* ignore */ }
    finally { setSaving(false) }
  }
  return (
    <div className="bg-parchment-low border border-outline-variant rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-ink">{lang === 'hi' ? 'समाधान का मूल्यांकन करें' : 'Rate the resolution'}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl transition-transform ${n <= rating ? 'scale-110' : 'opacity-40'}`}>{n <= rating ? '⭐' : '☆'}</button>
        ))}
      </div>
      <input className="input-field" placeholder={lang === 'hi' ? 'कमेंट (वैकल्पिक)' : 'Comment (optional)'} value={comment} onChange={e => setComment(e.target.value)} />
      <button onClick={submit} disabled={!rating || saving} className="btn-primary w-full">{saving ? 'Saving...' : (lang === 'hi' ? 'भेजें' : 'Submit Feedback')}</button>
    </div>
  )
}

export default function TicketCard({ ticket }) {
  const [copied, setCopied] = useState(false)
  const [feedbackDone, setFeedbackDone] = useState(!!ticket.feedback_rating)
  const lang = ticket.complaint?.language
  const isHi = lang === 'hi'
  const resolved = ticket.status === 'resolved'
  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <div><p className="text-xs text-outline uppercase tracking-wider">Ticket ID</p><p className="text-lg font-bold text-ink font-mono">{ticket.id}</p></div>
        <StatusBadge status={ticket.status} />
      </div>

      {ticket.is_duplicate && ticket.duplicate_of && (
        <div className="bg-error-container/60 text-error-oncontainer p-3 rounded-lg border border-error/25 text-xs">
          {isHi ? `⚠ यह शिकायत टिकट ` : '⚠ This is a duplicate of ticket '}
          <a href={`/track?id=${ticket.duplicate_of}`} className="font-mono underline">{ticket.duplicate_of}</a>
          {isHi ? ` से ${Math.round((ticket.similarity_score || 0) * 100)}% मिलती-जुलती है` : ` (${Math.round((ticket.similarity_score || 0) * 100)}% similar)`}
        </div>
      )}

      {ticket.complaint?.photo_url && (
        <img src={ticket.complaint.photo_url} alt="attached complaint photo" className="h-44 w-full object-cover rounded-lg border border-outline-variant" />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Category</p><p className="text-sm font-semibold text-ink">{ticket.category}</p></div>
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Department</p><p className="text-sm font-semibold text-ink">{ticket.department}</p></div>
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Urgency</p><span className={`badge border ${urgencyStyles[ticket.urgency_level]}`}>{ticket.urgency_level?.toUpperCase()}</span></div>
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Created</p><p className="text-sm text-ink-soft">{fmt(ticket.created_at)}</p></div>
      </div>
      <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Complaint</p><p className="text-sm text-ink-soft">{ticket.complaint?.raw_text}</p>
        {isHi && ticket.complaint?.translated_text && <p className="text-xs text-ink-soft mt-1 italic">{isHi ? 'अनुवाद: ' : 'Translation: '}{ticket.complaint.translated_text}</p>}
      </div>
      <div><p className="text-xs text-outline uppercase tracking-wider mb-1">AI Confidence</p><ConfidenceBar score={ticket.confidence_score} /></div>
      {ticket.summary && <div><p className="text-xs text-outline uppercase tracking-wider mb-1">AI Summary</p><p className="text-sm text-ink-soft bg-parchment-low p-3 rounded-lg border border-outline-variant">{ticket.summary}</p></div>}
      {ticket.officer_notes && <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Officer Note</p><p className="text-sm text-ink-soft bg-parchment-low p-3 rounded-lg border border-outline-variant">{ticket.officer_notes}</p></div>}
      {ticket.feedback_rating && (
        <div className="badge border bg-status-amber/10 text-status-amber">⭐ {ticket.feedback_rating}/5 {ticket.feedback_comment ? `— ${ticket.feedback_comment}` : ''}</div>
      )}
      <StatusTimeline history={ticket.status_history} lang={lang} />

      {resolved && !feedbackDone && <FeedbackForm ticket={ticket} lang={lang} onDone={() => setFeedbackDone(true)} />}

      <div className="flex gap-3">
        <button onClick={async () => { setCopied(await copyToClipboard(`${window.location.origin}/track?id=${ticket.id}`)) }} className="btn-secondary flex-1 text-xs">🔗 {copied ? 'Copied!' : 'Copy Link'}</button>
        <a href={whatsappUrl(ticket.id)} target="_blank" rel="noreferrer" className="btn-secondary flex-1 text-xs text-center">🟢 Share on WhatsApp</a>
      </div>
    </div>
  )
}