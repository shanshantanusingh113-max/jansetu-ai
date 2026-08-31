export default function StatsCards({ stats }) {
  if (!stats) return null
  const cards = [
    { label: 'Total Tickets', value: stats.total_tickets },
    { label: 'New', value: stats.by_status?.new || 0 },
    { label: 'In Progress', value: stats.by_status?.in_progress || 0 },
    { label: 'Resolved', value: stats.by_status?.resolved || 0 },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className="stat-card flex items-center justify-between gap-4 border-t-2 border-t-ink">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-outline">{c.label}</p>
            <p className="text-3xl font-bold text-ink font-display mt-1">{c.value}</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-accent animate-pulse-dot" />
        </div>
      ))}
    </div>
  )
}
