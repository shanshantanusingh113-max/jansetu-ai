export default function StatsCards({ stats }) {
  if (!stats) return null
  const cards = [
    { label: 'Total Tickets', value: stats.total_tickets, tone: 'border-t-ink' },
    { label: 'New', value: stats.by_status?.new || 0, tone: 'border-t-corsair' },
    { label: 'In Progress', value: stats.by_status?.in_progress || 0, tone: 'border-t-accent' },
    { label: 'Resolved', value: stats.by_status?.resolved || 0, tone: 'border-t-status-green' },
    { label: 'Open Backlog', value: stats.total_open ?? 0, tone: 'border-t-status-blue' },
    { label: 'Overdue (48h)', value: stats.overdue ?? 0, tone: 'border-t-error' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map(c => (
        <div key={c.label} className={`stat-card flex items-center justify-between gap-4 border-t-2 ${c.tone} ${c.label.includes('Overdue') && (c.value > 0 ? 'bg-error/5' : '')}`}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-outline">{c.label}</p>
            <p className="text-3xl font-bold text-ink font-display mt-1">{c.value}</p>
          </div>
          <div className={`w-3 h-3 rounded-full ${c.label.includes('Overdue') && c.value > 0 ? 'bg-error animate-pulse' : 'bg-accent animate-pulse-dot'}`} />
        </div>
      ))}
    </div>
  )
}