import { type ReactNode } from 'react'

type StatsCardProps = {
  label: string
  value: string
  icon: ReactNode
  color?: 'gray' | 'green' | 'red' | 'blue' | 'amber'
  sub?: string
}

const colorMap = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-700' },
  green: { bg: 'bg-green-100', text: 'text-green-700' },
  red: { bg: 'bg-red-100', text: 'text-red-700' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
}

export function StatsCard({ label, value, icon, color = 'gray', sub }: StatsCardProps) {
  const c = colorMap[color]
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${c.bg} ${c.text} shrink-0`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className={`text-xl font-bold ${c.text} truncate`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}
