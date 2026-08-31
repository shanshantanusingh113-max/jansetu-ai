export default function LanguageToggle({ language, onChange }) {
  return (
    <div className="flex items-center bg-surfaceVariant rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => onChange('en')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
          language === 'en' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => onChange('hi')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 font-hindi ${
          language === 'hi' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
        }`}
      >
        हिन्दी
      </button>
    </div>
  )
}
