export default function ConfidenceBar({ score }) {
  const p = Math.round((score || 0) * 100)
  const c = p >= 80 ? 'bg-status-green' : p >= 60 ? 'bg-status-amber' : 'bg-error'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-surfaceVariant rounded-full h-2 max-w-[100px] overflow-hidden">
        <div className={`${c} h-2 rounded-full relative animate-grad-border`} style={{ width: `${p}%`, backgroundSize: '200% 100%' }}>
          <span className="absolute inset-0 bg-white/30 animate-pulse-dot" style={{ animationDuration: '1.6s' }} />
        </div>
      </div>
      <span className="text-xs font-medium text-ink-soft">{p}%</span>
    </div>
  )
}
