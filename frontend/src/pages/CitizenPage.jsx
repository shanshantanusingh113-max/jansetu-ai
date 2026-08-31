import ComplaintForm from '../components/ComplaintForm'

const steps = [
  {
    icon: '✎',
    title: 'File Instantly',
    desc: 'Use our streamlined interface to submit grievances with localized context, in Hindi or English, typed or spoken.',
    delay: 'reveal-delay-1',
  },
  {
    icon: '⇄',
    title: 'Intelligent Routing',
    desc: 'Our AI automatically identifies the correct municipal department and forwards your request — bypassing red tape.',
    delay: 'reveal-delay-2',
  },
  {
    icon: '◉',
    title: 'Track & Resolve',
    desc: 'Receive real-time updates on your dashboard as authorities process and resolve your issue.',
    delay: 'reveal-delay-3',
  },
]

function MetricBadge() {
  return (
    <div className="flex items-center bg-orange-50 border border-orange-200 rounded-lg overflow-hidden h-12 shadow-sm reveal reveal-delay-3">
      <div className="flex items-center gap-2 px-4 border-r border-orange-200 bg-white">
        <span className="w-4 h-4 rounded-full bg-accent animate-pulse-dot" />
        <span className="text-sm font-medium text-ink">Citizens Active</span>
      </div>
      <div className="px-4 text-sm font-bold text-accent animate-pulse-dot" style={{ animationDuration: '2.2s' }}>
        11.1k
      </div>
    </div>
  )
}

function TrustBadge() {
  return (
    <div className="reveal reveal-delay-4 inline-flex items-center bg-white border border-outline-variant px-5 py-3 rounded-lg shadow-sm">
      <div className="flex flex-col items-start text-left mr-3 border-r border-outline-variant pr-3">
        <span className="text-[10px] uppercase font-bold text-outline tracking-wider leading-none mb-1">Backed by</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-ink text-white flex items-center justify-center font-bold text-sm rounded-sm">J</div>
        <span className="text-sm font-semibold text-ink">India Innovation</span>
      </div>
    </div>
  )
}

export default function CitizenPage() {
  return (
    <div className="space-y-16 md:space-y-20">
      {/* Hero */}
      <div className="text-center space-y-6 max-w-3xl mx-auto relative">
        <span className="reveal inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-corsair">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
          AI-Powered Grievance Routing
          <span className="w-2 h-2 rounded-full bg-corsair animate-pulse-dot" style={{ animationDelay: '-1.5s' }} />
        </span>
        <h1 className="reveal reveal-delay-1 leading-[1.05] tracking-tightest">
          <span className="block font-display italic text-4xl sm:text-5xl md:text-6xl text-ink">Your Direct Bridge</span>
          <span className="block font-sans font-medium text-3xl sm:text-4xl md:text-5xl text-ink mt-2">to Governance</span>
        </h1>
        <p className="reveal reveal-delay-2 text-lg text-ink-soft max-w-xl mx-auto leading-relaxed">
          Connect to local authorities without the bureaucratic friction. File, track, and resolve complaints in minutes — in
          Hindi or English, typed or spoken.
        </p>
        <div className="reveal reveal-delay-3 flex flex-wrap items-center justify-center gap-4 pt-2">
          <MetricBadge />
          <a href="#file-complaint" className="btn-primary h-12 flex items-center gap-2">
            File a Complaint
            <span className="text-lg animate-bounce-subtle">→</span>
          </a>
        </div>
        <div className="flex justify-center pt-2"><TrustBadge /></div>
      </div>

      {/* Complaint form */}
      <div id="file-complaint" className="max-w-xl mx-auto scroll-mt-24">
        <ComplaintForm />
      </div>

      {/* Centralized Reporting mockup */}
      <section className="max-w-5xl mx-auto">
        <div className="card-gradient rounded-lg shadow-card overflow-hidden reveal reveal-delay-2">
          <div className="flex items-center gap-2 p-4 border-b border-outline-variant bg-parchment-low/60">
            <span className="w-3 h-3 rounded-full bg-error/80" />
            <span className="w-3 h-3 rounded-full bg-accent/70" />
            <span className="w-3 h-3 rounded-full bg-status-green" />
            <span className="mx-auto text-xs font-medium text-ink-soft">JanSetu Dashboard</span>
          </div>
          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-64 border-r border-outline-variant bg-white/60 p-6 flex flex-col gap-6 hidden sm:flex">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-ink text-white rounded-md flex items-center justify-center font-bold text-sm">JS</div>
                <div>
                  <div className="text-sm font-semibold text-ink">JanSetu Portal</div>
                  <div className="text-xs text-ink-soft">Citizen Access</div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">Home</div>
                <div className="flex items-center gap-2 px-3 py-2 bg-parchment border border-outline-variant rounded-md text-sm font-medium text-ink animate-pulse-dot">
                  <span className="w-3.5 h-3.5 rounded bg-corsair" /> Dashboard
                </div>
                <div className="flex items-center gap-2 px-3 py-2 text-ink-soft text-sm hover:bg-parchment-low rounded-md cursor-pointer transition-colors">
                  <span className="w-3.5 h-3.5 rounded bg-accent/80" /> My Grievances
                </div>
              </div>
            </div>
            <div className="flex-1 bg-white p-6 sm:p-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-xs text-ink-soft mb-1">Dashboard › Grievance Tracker</div>
                  <h4 className="font-display italic text-2xl text-ink">Active Reports</h4>
                  <p className="text-sm text-ink-soft mt-1">Status of your recent filings with local authorities.</p>
                </div>
                <button className="flex items-center gap-1 text-sm font-medium text-ink hover:text-corsair transition-colors border border-outline-variant px-3 py-1.5 rounded-md">
                  <span className="text-lg leading-none">+</span> New Filing
                </button>
              </div>
              <div className="flex-1 border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                <div className="grid grid-cols-4 gap-4 p-4 border-b border-outline-variant bg-parchment-low text-sm font-semibold text-ink-soft">
                  <div>ID</div><div className="col-span-2">Description</div><div>Status</div>
                </div>
                {[
                  { id: '#JS-9021', desc: 'Pothole repair request on MG Road', tag: 'In Progress', tone: 'bg-accent/15 text-accent', animate: 'animate-pulse-dot', delay: 'reveal-delay-3' },
                  { id: '#JS-8834', desc: 'Streetlight outage in Sector 4', tag: 'Resolved', tone: 'bg-corsair/10 text-corsair', delay: 'reveal-delay-4' },
                  { id: '#JS-8155', desc: 'Drainage blockage near market lane', tag: 'New', tone: 'bg-error/10 text-error', delay: 'reveal-delay-5' },
                ].map(r => (
                  <div key={r.id} className={`grid grid-cols-4 gap-4 p-4 border-b border-outline-variant items-center hover:bg-parchment-low transition-colors cursor-pointer last:border-b-0 reveal ${r.delay}`}>
                    <div className="text-sm font-medium text-ink">{r.id}</div>
                    <div className="col-span-2 text-sm text-ink-soft truncate">{r.desc}</div>
                    <div><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${r.tone} ${r.animate || ''}`}>{r.tag}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works (bento) */}
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12 reveal">
          <span className="text-xs font-semibold uppercase tracking-widest text-corsair">Process</span>
          <h2 className="text-3xl md:text-4xl font-display italic text-ink mt-2">Seamless Integration with Governance</h2>
          <p className="text-ink-soft max-w-2xl mx-auto mt-3">
            Our platform removes the friction from civic participation, giving you a clear path to resolution.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={`reveal ${s.delay} card-hover group flex flex-col h-full`}
            >
              <div className="w-12 h-12 rounded-lg bg-parchment border border-outline-variant flex items-center justify-center mb-6 text-xl text-ink transition-colors duration-300 group-hover:bg-ink group-hover:text-white">
                <span className="group-hover:animate-bounce-subtle">{s.icon}</span>
              </div>
              <h4 className="text-sm font-bold text-ink mb-2">
                <span className="text-corsair font-display italic mr-1.5">{i + 1}.</span>
                {s.title}
              </h4>
              <p className="text-ink-soft text-sm leading-relaxed flex-1">{s.desc}</p>
              <div className="mt-6 h-px w-full bg-gradient-to-r from-corsair via-accent to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        {[
          { v: '60+', l: 'Resolved daily', d: 'reveal-delay-1' },
          { v: '12', l: 'Departments', d: 'reveal-delay-2' },
          { v: '24/7', l: 'Support', d: 'reveal-delay-3' },
          { v: '100%', l: 'Transparent', d: 'reveal-delay-4' },
        ].map(s => (
          <div key={s.l} className={`reveal ${s.d} text-center p-4`}>
            <div className="text-2xl font-bold font-display text-ink">{s.v}</div>
            <div className="text-xs text-outline uppercase tracking-wider mt-1">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
