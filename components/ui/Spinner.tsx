export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="relative">
        <div className="w-8 h-8 border-2 border-gray-100 rounded-full" />
        <div className="absolute inset-0 w-8 h-8 border-2 border-transparent border-t-gray-900 rounded-full animate-spin" />
      </div>
    </div>
  )
}

export function InlineSpinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
