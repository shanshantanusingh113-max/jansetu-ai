import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import CitizenPage from './pages/CitizenPage'
import TrackPage from './pages/TrackPage'
import OfficerPage from './pages/OfficerPage'
import Background from './components/Background'

function Navbar() {
  const location = useLocation()
  const links = [
    { path: '/', label: 'File Complaint' },
    { path: '/track', label: 'Track Ticket' },
    { path: '/officer', label: 'Officer Dashboard' },
  ]
  return (
    <nav className="bg-white/90 backdrop-blur border-b border-outline-variant sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-ink rounded-md flex items-center justify-center transition-transform duration-300 group-hover:rotate-6">
              <span className="text-white font-display italic font-bold text-sm">JS</span>
            </div>
            <span className="text-lg font-display text-ink tracking-tightest">JanSetu <span className="italic text-corsair">Corsair</span></span>
          </Link>
          <div className="flex items-center gap-1">
            {links.map(l => (
              <Link
                key={l.path}
                to={l.path}
                className={`group relative px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  location.pathname === l.path
                    ? 'text-ink'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {l.label}
                <span className={`absolute left-4 right-4 bottom-0 h-0.5 rounded-full bg-corsair transition-transform duration-300 origin-left ${
                  location.pathname === l.path ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
              </Link>
            ))}
            <Link to="/" className="btn-primary ml-3 hidden sm:inline-flex group">File a Complaint</Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-parchment relative">
        <Background />
        <div className="relative z-10">
          <Navbar />
          <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 md:py-16">
            <Routes>
              <Route path="/" element={<CitizenPage />} />
              <Route path="/track" element={<TrackPage />} />
              <Route path="/officer" element={<OfficerPage />} />
            </Routes>
          </main>
          <footer className="border-t border-outline-variant bg-white/80 backdrop-blur mt-16">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 text-center text-sm text-outline">
              Powered by <span className="text-ink font-medium">JanSetu AI</span> — AI-Powered Citizen Grievance Routing System
            </div>
          </footer>
        </div>
      </div>
    </Router>
  )
}
