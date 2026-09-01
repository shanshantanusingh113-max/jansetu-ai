import { Link } from 'react-router-dom'

const COLORS = {
  corsair: '#0051d5',
  accent: '#d95f00',
  green: '#166534',
  amber: '#b45309',
  red: '#ba1a1a',
  gray: '#4b5563',
}

const STATUS_COLORS = { new: '#0051d5', in_progress: '#d95f00', resolved: '#166534', closed: '#4b5563' }
const URGENCY_COLORS = { critical: '#ba1a1a', high: '#d95f00', medium: '#b45309', low: '#166534' }

function HBarChart({ data, color, max }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (!entries.length) return <p className="text-xs text-outline">No data yet</p>
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-3">
          <span className="w-28 text-xs text-ink-soft truncate shrink-0">{k}</span>
          <div className="flex-1 bg-parchment-low rounded-full h-4 overflow-hidden">
            <div className="h-4 rounded-full transition-all duration-700" style={{ width: `${Math.max((v / (max || 1)) * 100, 4)}%`, background: color }} />
          </div>
          <span className="w-6 text-xs font-bold text-ink text-right">{v}</span>
        </div>
      ))}
    </div>
  )
}

function Donut({ data }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (!total) return <p className="text-xs text-outline">No data yet</p>
  const R = 42, C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        {entries.map(([k, v]) => {
          const len = (v / total) * C
          const seg = (
            <circle key={k} cx="50" cy="50" r={R} fill="none" stroke={STATUS_COLORS[k] || COLORS.gray} strokeWidth="12"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" />
          )
          offset += len
          return seg
        })}
        <text x="50" y="54" textAnchor="middle" className="text-[11px] font-bold" fill="#121212">{total}</text>
      </svg>
      <div className="space-y-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[k] || COLORS.gray }} />
            <span className="text-ink-soft capitalize w-20">{k.replace('_', ' ')}</span>
            <span className="font-semibold text-ink">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TrendChart({ days }) {
  if (!days?.length) return <p className="text-xs text-outline">No data yet</p>
  const max = Math.max(...days.map(d => d.count), 1)
  return (
    <div>
      <div className="flex items-end gap-1 h-28">
        {days.map((d, i) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${d.count}`}>
            <span className="text-[10px] font-semibold text-ink opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
            <div className="w-full rounded-t bg-gradient-to-t from-corsair/40 to-corsair transition-all duration-500 group-hover:from-accent/40 group-hover:to-accent" style={{ height: `${Math.max((d.count / max) * 88, 3)}px` }} />
            <span className="text-[9px] text-outline">{String(new Date(d.date).getDate())}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-outline mt-1 text-center">Last 14 days · daily complaints</p>
    </div>
  )
}

function Chip({ label, value, tone }) {
  return (
    <div className="stat-card border-l-4" style={{ borderLeftColor: tone }}>
      <p className="text-xs font-medium uppercase tracking-wider text-outline">{label}</p>
      <p className="text-2xl font-bold text-ink font-display mt-1">{value ?? '—'}</p>
    </div>
  )
}

export default function AnalyticsPanel({ stats }) {
  if (!stats) return null
  const maxCat = Math.max(...Object.values(stats.by_category || {}), 1)
  const byDept = Object.entries(stats.by_department || {})
  const backlog = stats.open_backlog || {}

  return (
    <div className="space-y-4">
      {/* Critical alerts */}
      <div className="bg-gradient-to-r from-error/8 to-transparent border border-error/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
          <h3 className="text-sm font-bold text-ink">Critical Alerts Panel</h3>
          <span className="text-xs text-outline">· high-priority complaints queue</span>
        </div>
        {stats.critical_open?.length ? (
          <div className="flex flex-col gap-1.5">
            {stats.critical_open.map(t => (
              <Link key={t.id} to={`/track?id=${t.id}`} className="flex items-center justify-between gap-3 bg-white/70 border border-error/15 rounded-md px-3 py-2 hover:border-error transition-colors">
                <span className="text-xs font-mono text-ink">{t.id}</span>
                <span className="flex-1 text-xs text-ink-soft truncate">{t.complaint_text}</span>
                <span className="badge bg-error/10 text-error border border-error/25">{t.department.split(' ')[0]}</span>
                <span className="badge bg-error/10 text-error">{t.status.replace('_', ' ')}</span>
              </Link>
            ))}
          </div>
        ) : <p className="text-xs text-outline">No critical complaints open right now</p>}
      </div>

      {/* SLA chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Chip label="Avg resolve time" value={stats.avg_resolution_hours != null ? `${stats.avg_resolution_hours}h` : 'n/a'} tone={COLORS.green} />
        <Chip label="Overdue (SLA 48h)" value={stats.overdue ?? 0} tone={COLORS.red} />
        <Chip label="Open backlog" value={stats.total_open ?? 0} tone={COLORS.accent} />
        <Chip label="Avg AI confidence" value={stats.avg_confidence != null ? `${Math.round(stats.avg_confidence * 100)}%` : '—'} tone={COLORS.corsair} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card"><h3 className="text-sm font-bold text-ink mb-3">Complaints by Category</h3><HBarChart data={stats.by_category || {}} color={COLORS.corsair} max={maxCat} /></div>
        <div className="card"><h3 className="text-sm font-bold text-ink mb-3">By Status</h3><Donut data={stats.by_status || {}} /></div>
        <div className="card"><h3 className="text-sm font-bold text-ink mb-3">Daily Trend</h3><TrendChart days={stats.daily_trend || []} /></div>
        <div className="card">
          <h3 className="text-sm font-bold text-ink mb-3">Department Workload</h3>
          {byDept.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-outline-variant"><tr>
                  <th className="table-header">Department</th><th className="table-header">Total</th><th className="table-header">Open</th>
                </tr></thead>
                <tbody className="divide-y divide-outline-variant">
                  {byDept.map(([d, v]) => (
                    <tr key={d}>
                      <td className="table-cell text-xs">{d}</td>
                      <td className="table-cell font-semibold text-ink">{v}</td>
                      <td className="table-cell"><span className={`badge ${(backlog[d] || 0) > 2 ? 'bg-error/10 text-error' : 'bg-status-green/10 text-status-green'}`}>{backlog[d] || 0}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-outline">No data</p>}
        </div>
      </div>
    </div>
  )
}