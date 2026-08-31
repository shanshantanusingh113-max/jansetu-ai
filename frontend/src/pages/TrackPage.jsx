import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getTicket } from '../api'
import TicketCard from '../components/TicketCard'

export default function TrackPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [ticketId, setTicketId] = useState(searchParams.get('id') || '')
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const handleSearch = async () => {
    if (!ticketId.trim()) return
    setLoading(true); setError(''); setTicket(null)
    try { setTicket(await getTicket(ticketId.trim())) }
    catch (e) { setError('Ticket not found. Please check the ID.') }
    finally { setLoading(false) }
  }
  useEffect(() => { if (searchParams.get('id')) { setTicketId(searchParams.get('id')); handleSearch() } }, [])
  return (
    <div className="max-w-xl mx-auto space-y-10">
      <div className="text-center space-y-3">
        <span className="reveal inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-corsair">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
          Reservation & Status
        </span>
        <h1 className="reveal reveal-delay-1 font-display italic text-4xl md:text-5xl text-ink leading-tight tracking-tightest">Track Your Ticket</h1>
        <p className="reveal reveal-delay-2 text-lg text-ink-soft">Enter your ticket ID to check status</p>
      </div>
      <div className="reveal reveal-delay-3 card relative overflow-hidden space-y-4">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-corsair via-accent to-ink bg-[length:200%_100%] animate-grad-border" />
        <div className="flex gap-3">
          <input type="text" className="input-field flex-1" placeholder="e.g., TKT-20260831-A1B2C3" value={ticketId} onChange={e => setTicketId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button onClick={handleSearch} disabled={loading} className="btn-primary">{loading ? 'Searching...' : 'Search'}</button>
        </div>
        {error && <div className="bg-error-container text-error-oncontainer text-sm px-4 py-2.5 rounded-lg border border-error/20">{error}</div>}
      </div>
      {ticket && <TicketCard ticket={ticket} />}
    </div>
  )
}
