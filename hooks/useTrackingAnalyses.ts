import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Analysis, LLMType } from '@/lib/supabase/types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export interface TrackingData {
  date: string
  citationRate: number
  brandExposure: number
  perplexity: number
  chatgpt: number
  gemini: number
  claude: number
}

interface UseTrackingAnalysesOptions {
  sectionId: string | null
  dateRange: '7days' | '30days' | 'all'
}

interface UseTrackingAnalysesResult {
  analyses: Analysis[]
  trackingData: TrackingData[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * 섹션별 분석 데이터 조회 훅
 */
export function useTrackingAnalyses({
  sectionId,
  dateRange,
}: UseTrackingAnalysesOptions): UseTrackingAnalysesResult {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [trackingData, setTrackingData] = useState<TrackingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!sectionId) {
      setAnalyses([])
      setTrackingData([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // 날짜 범위 계산
      let dateFilter = ''
      const now = new Date()
      if (dateRange === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFilter = sevenDaysAgo.toISOString()
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = thirtyDaysAgo.toISOString()
      }

      // 분석 데이터 가져오기 (섹션 필터 적용)
      let query = supabase
        .from('analyses')
        .select('*')
        .eq('status', 'completed')
        .eq('section_id', sectionId)
        .order('created_at', { ascending: true })

      if (dateFilter) {
        query = query.gte('created_at', dateFilter)
      }

      const { data: fetchedAnalyses, error: fetchError } = await query.limit(100)

      if (fetchError) throw fetchError

      if (!fetchedAnalyses || fetchedAnalyses.length === 0) {
        setAnalyses([])
        setTrackingData([])
        return
      }

      setAnalyses(fetchedAnalyses)

      // 날짜별로 그룹화하여 트래킹 데이터 생성
      const dateMap = new Map<string, {
        citationRates: number[]
        brandRates: number[]
        llmRates: Record<LLMType, number[]>
      }>()

      fetchedAnalyses.forEach((analysis: Analysis) => {
        const date = format(new Date(analysis.created_at), 'MM/dd', { locale: ko })

        if (!dateMap.has(date)) {
          dateMap.set(date, {
            citationRates: [],
            brandRates: [],
            llmRates: {
              perplexity: [],
              chatgpt: [],
              gemini: [],
              claude: [],
            },
          })
        }

        const entry = dateMap.get(date)!
        const results = analysis.results as unknown as Record<string, unknown>

        // 인용율 계산
        let totalCitations = 0
        let totalChecked = 0
        const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']

        llmTypes.forEach((llm) => {
          const llmResult = results?.[llm] as { citations?: Array<{ cited: boolean }> } | null
          if (llmResult?.citations) {
            const cited = llmResult.citations.filter((c: { cited: boolean }) => c.cited).length
            const total = llmResult.citations.length
            totalCitations += cited
            totalChecked += total

            // LLM별 인용율
            if (total > 0) {
              entry.llmRates[llm].push((cited / total) * 100)
            }
          }
        })

        if (totalChecked > 0) {
          entry.citationRates.push((totalCitations / totalChecked) * 100)
        }

        // 브랜드 노출률 계산
        let exposedLlms = 0
        llmTypes.forEach((llm) => {
          const llmResult = results?.[llm] as { citations?: Array<{ cited: boolean }> } | null
          if (llmResult?.citations?.some((c: { cited: boolean }) => c.cited)) {
            exposedLlms++
          }
        })
        entry.brandRates.push((exposedLlms / 4) * 100)
      })

      // Map을 배열로 변환
      const chartData: TrackingData[] = Array.from(dateMap.entries()).map(([date, data]) => {
        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

        return {
          date,
          citationRate: Math.round(avg(data.citationRates) * 10) / 10,
          brandExposure: Math.round(avg(data.brandRates) * 10) / 10,
          perplexity: Math.round(avg(data.llmRates.perplexity) * 10) / 10,
          chatgpt: Math.round(avg(data.llmRates.chatgpt) * 10) / 10,
          gemini: Math.round(avg(data.llmRates.gemini) * 10) / 10,
          claude: Math.round(avg(data.llmRates.claude) * 10) / 10,
        }
      })

      setTrackingData(chartData)
    } catch (err) {
      console.error('트래킹 데이터 로드 오류:', err)
      setError('데이터를 불러오는데 실패했습니다.')
      setAnalyses([])
      setTrackingData([])
    } finally {
      setLoading(false)
    }
  }, [sectionId, dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    analyses,
    trackingData,
    loading,
    error,
    refresh: fetchData,
  }
}
