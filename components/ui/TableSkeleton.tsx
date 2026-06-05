type TableSkeletonProps = {
  rows?: number
  columns?: number
}

/**
 * Shimmering placeholder rows used while data is loading.
 * Mirrors the visual rhythm of a real table row.
 */
export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-3 flex-1 rounded-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer"
              style={{ animationDelay: `${(i * columns + j) * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
