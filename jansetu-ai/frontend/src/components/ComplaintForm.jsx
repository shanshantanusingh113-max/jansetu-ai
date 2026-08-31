import { useState } from 'react'
import LanguageToggle from './LanguageToggle'
import VoiceInput from './VoiceInput'
import TicketResult from './TicketResult'
import { submitComplaint } from '../api'

export default function ComplaintForm() {
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('hi')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const placeholders = {
    hi: 'Apni shikayat yahan likhen... (जैसे: मेरे इलाके में 3 दिन से पानी नहीं आ रहा)',
    en: 'Describe your complaint here... (e.g., There is a pothole near my house)',
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) { setError(language === 'hi' ? 'Kripya shikayat darj karen' : 'Please describe your complaint'); return }
    setLoading(true); setError('')
    try {
      const data = await submitComplaint({ raw_text: text, language, location: location || null })
      setResult(data)
    } catch (err) { setError('Failed to submit. Please try again.') }
    finally { setLoading(false) }
  }
  if (result) return <TicketResult ticket={result.ticket} complaint={result} onReset={() => { setResult(null); setText(''); setLocation('') }} />
  return (
    <form onSubmit={handleSubmit} className="card relative overflow-hidden space-y-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-corsair via-accent to-ink bg-[length:200%_100%] animate-grad-border" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-corsair">New Filing</span>
          <h3 className="font-display italic text-2xl text-ink mt-1">{language === 'hi' ? 'Shikayat Darj Karein' : 'File a Complaint'}</h3>
        </div>
        <LanguageToggle language={language} onChange={setLanguage} />
      </div>
      <div>
        <label className="label-text">{language === 'hi' ? 'Shikayat ka vishay' : 'Complaint Description'} *</label>
        <textarea className="textarea-field h-36" placeholder={placeholders[language]} value={text} onChange={e => setText(e.target.value)} />
      </div>
      <VoiceInput language={language} onTranscript={t => setText(prev => prev ? prev + ' ' + t : t)} />
      <div>
        <label className="label-text">{language === 'hi' ? 'Stham (Optional)' : 'Location (Optional)'}</label>
        <input type="text" className="input-field" placeholder={language === 'hi' ? 'जैसे: Ward 5, Sector 12' : 'e.g., Ward 5, Sector 12'} value={location} onChange={e => setLocation(e.target.value)} />
      </div>
      {error && <div className="bg-error-container text-error-oncontainer text-sm px-4 py-2.5 rounded-lg border border-error/20">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full group">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {language === 'hi' ? 'Jaari hai...' : 'Processing...'}
          </span>
        ) : (
          <>
            {language === 'hi' ? 'Shikayat Darj Karein' : 'Submit Complaint'}
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
          </>
        )}
      </button>
    </form>
  )
}
