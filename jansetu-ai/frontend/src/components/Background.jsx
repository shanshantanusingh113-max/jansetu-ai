export default function Background() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 blueprint-bg" />
      <div className="blueprint-orb blueprint-orb--blue w-80 h-80 -top-20 -left-20" />
      <div className="blueprint-orb blueprint-orb--orange w-96 h-96 top-1/3 -right-24" />
      <div className="blueprint-orb blueprint-orb--blue w-64 h-64 bottom-0 left-1/4" />
      <div className="blueprint-orb blueprint-orb--blue w-72 h-72 top-10 right-1/4 opacity-20" style={{ animationDelay: '-6s' }} />
      <svg
        className="absolute left-1/2 -translate-x-1/2 top-24 opacity-25 text-corsair"
        fill="none"
        height="420"
        viewBox="0 0 1200 420"
        width="1200"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          className="text-corsair animate-dash-flow"
          d="M-100 350 Q 500 -50 1300 350"
          stroke="currentColor"
          strokeDasharray="10 14"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
