'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type UseInfiniteScrollOptions = {
  /** Total number of items in the source list */
  totalItems: number
  /** Initial number of items to render */
  initialBatch?: number
  /** How many items to load on each scroll trigger */
  batchSize?: number
  /** Distance from bottom (in px) to trigger next load */
  rootMargin?: string
}

/**
 * Returns the number of items to render, the ref to attach
 * to a sentinel element at the bottom, and a loading state.
 * Items are revealed in batches as the user scrolls.
 */
export function useInfiniteScroll({
  totalItems,
  initialBatch = 20,
  batchSize = 20,
  rootMargin = '200px',
}: UseInfiniteScrollOptions) {
  const [visibleCount, setVisibleCount] = useState(Math.min(initialBatch, totalItems))
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setVisibleCount(Math.min(initialBatch, totalItems))
  }, [totalItems, initialBatch])

  const loadMore = useCallback(() => {
    if (isLoading || visibleCount >= totalItems) return
    setIsLoading(true)
    const next = Math.min(visibleCount + batchSize, totalItems)
    setVisibleCount(next)
    requestAnimationFrame(() => setIsLoading(false))
  }, [isLoading, visibleCount, totalItems, batchSize])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      entries => {
        const e = entries[0]
        if (e.isIntersecting) loadMore()
      },
      { rootMargin }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore, rootMargin])

  const hasMore = visibleCount < totalItems

  return { visibleCount, sentinelRef, isLoading, hasMore }
}
