import { useRef, useState } from 'react'
import LanguageToggle from './LanguageToggle'
import VoiceInput from './VoiceInput'
import TicketResult from './TicketResult'
import { submitComplaint } from '../api'

const EXAMPLES = {
  'Water Supply': { en: 'Water supply has been stopped for 2 days in our colony', hi: 'हमारे इलाके में 2 दिन से पानी नहीं आ रहा है' },
  'Drainage': { en: 'Drain is blocked and water is overflowing on the road', hi: 'नाला बंद है और सड़क पर पानी भर रहा है' },
  'Road Damage': { en: 'There is a huge pothole near the school, very dangerous', hi: 'स्कूल के पास सड़क में बहुत बड़ा गड्ढा है, बहुत खतरनाक' },
  'Electricity': { en: 'No electricity for 3 days in our area', hi: 'हमारे इलाके में 3 दिन से बिजली नहीं है' },
  'Waste Management': { en: 'Garbage has not been collected for a week', hi: 'एक हफ्ते से कचरा नहीं उठाया गया है' },
  'Street Lighting': { en: 'Street light not working for 5 days, very dark at night', hi: 'गली की लाइट 5 दिन से खराब है, रात में अंधेरा रहता है' },
}

export default function ComplaintForm() {
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('hi')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const placeholders = {
    hi: 'Apni shikayat yahan likhen... (जैसे: मेरे इलाके में 3 दिन से पानी नहीं आ रहा)',
    en: 'Describe your complaint here... (e.g., There is a pothole near my house)',
  }

  const pickExample = (cat) => {
    setCategory(cat)
    setText(EXAMPLES[cat][language])
  }

  const onFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) { setError(language === 'hi' ? 'Kripya shikayat darj karen' : 'Please describe your complaint'); return }
    setLoading(true); setError('')
    try {
      const data = await submitComplaint({ raw_text: text, language, location: location || null, photo: photo || undefined })
      setResult(data)
    } catch (err) { setError('Failed to submit. Please try again.') }
    finally { setLoading(false) }
  }

  if (result) return <TicketResult ticket={result.ticket} complaint={result} onReset={() => { setResult(null); setText(''); setLocation(''); setPhoto(null); setPhotoPreview(''); setCategory('') }} />

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
        <label className="label-text">{language === 'hi' ? 'Samasya ka prakar (Optional)' : 'Category (Optional)'}</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(EXAMPLES).map(cat => (
            <button
              key={cat} type="button"
              onClick={() => pickExample(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${category === cat ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-outline-variant hover:border-corsair hover:text-corsair'}`}
            >
              {cat}
            </button>
          ))}
        </div>
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

      <div>
        <label className="label-text">{language === 'hi' ? 'Photo sanlagan (Optional)' : 'Attach a Photo (Optional)'}</label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <button type="button" onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-outline-variant rounded-lg py-4 text-sm text-ink-soft hover:border-corsair hover:text-corsair transition-colors duration-200">
          {photoPreview ? 'Change photo' : (language === 'hi' ? '📷 Tasveer jodein' : '📷 Upload a photo')}
        </button>
        {photoPreview && <img src={photoPreview} alt="preview" className="mt-3 h-36 w-full object-cover rounded-lg border border-outline-variant" />}
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