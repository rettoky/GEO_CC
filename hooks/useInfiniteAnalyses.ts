import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Analysis } from '@/lib/supabase/types'

/**
 * 무한 스크롤 훅 (T056)
 */
export function useInfiniteAnalyses(pageSize: number = 20) {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
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

  /**
   * 분석 결과 삭제
   */
  const deleteAnalysis = useCallback(async (id: string): Promise<boolean> => {
    console.log('[deleteAnalysis] Starting delete for ID:', id)
    try {
      setIsDeleting(id)
      setError(null)

      const { error: deleteError, data } = await supabase
        .from('analyses')
        .delete()
        .eq('id', id)
        .select()

      console.log('[deleteAnalysis] Supabase response:', { data, deleteError })

      if (deleteError) {
        console.error('[deleteAnalysis] Delete error:', deleteError)
        throw deleteError
      }

      // 로컬 상태에서 제거
      setAnalyses((prev) => prev.filter((a) => a.id !== id))
      console.log('[deleteAnalysis] Successfully deleted')
      return true
    } catch (err) {
      console.error('[deleteAnalysis] Catch error:', err)
      setError(err instanceof Error ? err : new Error('삭제에 실패했습니다'))
      return false
    } finally {
      setIsDeleting(null)
    }
  }, [supabase])

  useEffect(() => {
    loadAnalyses()
  }, [])

  return {
    analyses,
    isLoading,
    isLoadingMore,
    isDeleting,
    hasMore,
    error,
    loadMore,
    deleteAnalysis,
    reload: () => loadAnalyses(0),
  }
}
