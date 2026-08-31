import { useState, useRef, useCallback } from 'react'
export default function VoiceInput({ language, onTranscript }) {
  const [isListening, setIsListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recRef = useRef(null)
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    const r = new SR()
    r.lang = language === 'hi' ? 'hi-IN' : 'en-US'; r.continuous = false; r.interimResults = false
    r.onresult = (e) => { onTranscript(e.results[0][0].transcript); setIsListening(false) }
    r.onerror = () => setIsListening(false); r.onend = () => setIsListening(false)
    recRef.current = r; r.start(); setIsListening(true)
  }, [language, onTranscript])
  const stop = () => { recRef.current?.stop(); setIsListening(false) }
  if (!supported) return <div className="text-xs text-status-amber bg-status-amber/10 px-3 py-2 rounded-lg border border-status-amber/30">Voice not supported. Please use Chrome.</div>
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={isListening ? stop : start} className={isListening ? 'btn-voice btn-voice-active' : 'btn-voice'}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
        {isListening ? (language === 'hi' ? 'Sun raha hai...' : 'Listening...') : (language === 'hi' ? 'Bol ke likhen' : 'Speak complaint')}
      </button>
      {isListening && <span className="flex items-center gap-1 text-xs text-error"><span className="w-2 h-2 bg-error rounded-full animate-pulse"></span>Recording</span>}
    </div>
  )
}
