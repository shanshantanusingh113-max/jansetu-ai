export default function StatusBadge({ status }) {
  const s = {
    new: 'bg-corsair/10 text-corsair-deep',
    in_progress: 'bg-status-amber/10 text-status-amber',
    resolved: 'bg-status-green/10 text-status-green',
    closed: 'bg-status-gray/10 text-status-gray',
  }
  const l = { new: 'New', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' }
  return <span className={`badge ${s[status] || 'bg-surfaceVariant text-ink-soft'}`}>{l[status] || status}</span>
}
