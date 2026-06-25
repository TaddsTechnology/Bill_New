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
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setVisibleCount(Math.min(initialBatch, totalItems))
  }, [totalItems, initialBatch])

  const loadMore = useCallback(() => {
    if (visibleCount >= totalItems) return
    const next = Math.min(visibleCount + batchSize, totalItems)
    setVisibleCount(next)
  }, [visibleCount, totalItems, batchSize])

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

  return { visibleCount, sentinelRef, isLoading: false, hasMore }
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
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [loadCount, setLoadCount] = useState(0)
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
      setLoadCount(c => c + 1)
    }
  }, [fetcher])

  useEffect(() => {
    setItems([])
    setHasMore(false)
    setLoadCount(0)
    offsetRef.current = 0
    load(0, initialBatch, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || loadingRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          load(offsetRef.current, batchSize, true)
        }
      },
      { rootMargin }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, load, batchSize, rootMargin, loadCount])

  const reload = useCallback(() => {
    setItems([])
    setHasMore(false)
    setLoadCount(0)
    offsetRef.current = 0
    load(0, initialBatch, false)
  }, [load, initialBatch])

  return { items, isLoading, hasMore, totalCount, sentinelRef, reload }
}
