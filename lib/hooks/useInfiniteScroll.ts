'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type UseInfiniteScrollOptions = {
  totalItems: number
  initialBatch?: number
  batchSize?: number
  rootMargin?: string
}

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
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore, rootMargin])

  const hasMore = visibleCount < totalItems

  return { visibleCount, sentinelRef, isLoading, hasMore }
}

type FetchResult<T> = {
  data: T[]
  total?: number | null
}

type UseServerInfiniteScrollOptions = {
  initialBatch?: number
  batchSize?: number
  rootMargin?: string
}

/**
 * Server-side infinite scroll hook.
 * Fetches data in batches from a server query using range-based pagination.
 */
export function useServerInfiniteScroll<T>(
  fetcher: (offset: number, limit: number) => Promise<FetchResult<T>>,
  deps: React.DependencyList = [],
  options: UseServerInfiniteScrollOptions = {}
) {
  const { initialBatch = 20, batchSize = 20, rootMargin = '200px' } = options
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)
  const offsetRef = useRef(0)

  const load = useCallback(async (startOffset: number, limit: number, append: boolean) => {
    if (loadingRef.current) return
    loadingRef.current = true
    if (!append) setIsLoading(true)
    try {
      const result = await fetcher(startOffset, limit)
      if (append) {
        setItems(prev => [...prev, ...result.data])
      } else {
        setItems(result.data)
      }
      offsetRef.current = startOffset + result.data.length
      if (result.total !== undefined && result.total !== null) {
        setTotalCount(result.total)
        setHasMore(startOffset + limit < result.total)
      } else {
        setHasMore(result.data.length >= limit)
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [fetcher])

  useEffect(() => {
    setItems([])
    setHasMore(true)
    offsetRef.current = 0
    load(0, initialBatch, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || loadingRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current && hasMore) {
          load(offsetRef.current, batchSize, true)
        }
      },
      { rootMargin }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, load, batchSize, rootMargin])

  const reload = useCallback(() => {
    setItems([])
    setHasMore(true)
    offsetRef.current = 0
    load(0, initialBatch, false)
  }, [load, initialBatch])

  return { items, isLoading, hasMore, totalCount, sentinelRef, reload }
}
