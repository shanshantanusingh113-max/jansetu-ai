import { useState } from 'react'
import { Link } from 'react-router-dom'
import ConfidenceBar from './ConfidenceBar'
import StatusBadge from './StatusBadge'
import { whatsappUrl, copyToClipboard } from '../utils'

export const urgencyStyles = {
  critical: 'bg-accent/15 text-accent-strong border-accent/40',
  high: 'bg-error-container text-error-oncontainer border-error/30',
  medium: 'bg-status-amber/10 text-status-amber border-status-amber/40',
  low: 'bg-status-green/10 text-status-green border-status-green/30',
}

export default function TicketResult({ ticket, complaint, onReset }) {
  const [copied, setCopied] = useState(false)
  if (!ticket) return null
  return (
    <div className="card space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-status-green/10 rounded-full flex items-center justify-center border border-status-green/30">
          <svg className="w-6 h-6 text-status-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div>
          <h3 className="font-display italic text-xl text-ink">{complaint?.language === 'hi' ? 'Shikayat Darj Ho Gayi' : 'Complaint Submitted'}</h3>
          <p className="text-sm text-ink-soft">AI has processed your complaint</p>
        </div>
      </div>

      {ticket.is_duplicate && ticket.duplicate_of && (
        <div className="bg-error-container/60 text-error-oncontainer p-4 rounded-lg border border-error/25 space-y-1">
          <p className="text-sm font-semibold">
            {complaint?.language === 'hi' ? '⚠ Mere milti-julti shikayat pehle se maujood hai' : '⚠ A similar complaint already exists'}
          </p>
          <p className="text-xs">
            {complaint?.language === 'hi'
              ? `Isse ${Math.round((ticket.similarity_score || 0) * 100)}% milta-julta hai — ticket `
              : `This is ${Math.round((ticket.similarity_score || 0) * 100)}% similar to ticket `}
            <Link to={`/track?id=${ticket.duplicate_of}`} className="font-mono underline hover:text-ink">{ticket.duplicate_of}</Link>
          </p>
        </div>
      )}

      {ticket.status === 'in_progress' && !ticket.is_duplicate && (
        <div className="bg-accent/10 text-accent-strong p-4 rounded-lg border border-accent/25 text-sm font-medium">
          {complaint?.language === 'hi' ? '🚨 Critical: आपकी शिकायत को तुरंत कार्यवाही के लिए भेजा गया है' : '🚨 Critical: your complaint was auto-escalated to the working queue'}
        </div>
      )}

      <div className="bg-ink text-white rounded-lg p-4 border border-ink">
        <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-1">Ticket ID</p>
        <p className="text-2xl font-bold font-mono">{ticket.id}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Category</p><p className="text-sm font-semibold text-ink">{ticket.category}</p></div>
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Department</p><p className="text-sm font-semibold text-ink">{ticket.department}</p></div>
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Urgency</p><span className={`badge border ${urgencyStyles[ticket.urgency_level] || 'bg-surfaceVariant text-ink-soft'}`}>{ticket.urgency_level?.toUpperCase()}</span></div>
        <div><p className="text-xs text-outline uppercase tracking-wider mb-1">Status</p><StatusBadge status={ticket.status} /></div>
      </div>
      <div><p className="text-xs text-outline uppercase tracking-wider mb-1">AI Confidence</p><ConfidenceBar score={ticket.confidence_score} /></div>
      {ticket.summary && <div><p className="text-xs text-outline uppercase tracking-wider mb-1">AI Summary</p><p className="text-sm text-ink-soft bg-parchment-low p-3 rounded-lg border border-outline-variant">{ticket.summary}</p></div>}
      {complaint?.language === 'hi' && complaint?.translated_text && <div><p className="text-xs text-outline uppercase tracking-wider mb-1">English Translation</p><p className="text-sm text-ink-soft italic">{complaint.translated_text}</p></div>}
      <div className="flex gap-3">
        <Link to={`/track?id=${ticket.id}`} className="btn-primary flex-1 text-center">Track This Ticket</Link>
        <button onClick={onReset} className="btn-secondary flex-1">File Another</button>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={async () => { setCopied(await copyToClipboard(`${window.location.origin}/track?id=${ticket.id}`)) }} className="btn-secondary flex-1 text-xs">🔗 {copied ? 'Copied!' : 'Copy Link'}</button>
        <a href={whatsappUrl(ticket.id)} target="_blank" rel="noreferrer" className="btn-secondary flex-1 text-xs text-center">🟢 Share on WhatsApp</a>
      </div>
    </div>
  )
}