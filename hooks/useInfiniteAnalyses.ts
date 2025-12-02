import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Analysis } from '@/lib/supabase/types'

/**
 * 무한 스크롤 훅 (T056)
 */
export function useInfiniteAnalyses(pageSize: number = 20) {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const loadAnalyses = async (offset: number = 0) => {
    try {
      if (offset === 0) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (error) throw error

      if (offset === 0) {
        setAnalyses(data || [])
      } else {
        setAnalyses((prev) => [...prev, ...(data || [])])
      }

      setHasMore(data?.length === pageSize)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load analyses'))
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadAnalyses(analyses.length)
    }
  }

  useEffect(() => {
    loadAnalyses()
  }, [])

  return {
    analyses,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    reload: () => loadAnalyses(0),
  }
}
