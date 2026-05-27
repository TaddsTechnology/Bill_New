import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
}

const paddings = { sm: 'p-3', md: 'p-4', lg: 'p-6' }

export function Card({ children, className = '', padding = 'md', hover = false }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm ${
        hover ? 'hover:shadow-md hover:border-gray-200 transition-all duration-300' : ''
      } ${paddings[padding]} ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center gap-2 pb-3 border-b border-gray-100 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h2>
}
