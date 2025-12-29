import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Analysis } from '@/lib/supabase/types'

/**
 * KPI 데이터 타입 정의
 */
export interface KPIData {
  citationRate: number
  citationTrend: number
  brandExposure: number
  brandTrend: number
  competitorRank: number
  rankTrend: number
  totalAnalyses: number
  successRate: number
  sparklineData: {
    citation: { value: number }[]
    brand: { value: number }[]
    rank: { value: number }[]
    analyses: { value: number }[]
  }
}

/**
 * 인용율 계산 헬퍼 함수
 * citation_metrics 또는 summary에서 인용율 추출
 */
const calculateCitationRate = (analysis: Analysis): number => {
  // 1. citation_metrics에서 가져오기
  const citationMetrics = analysis.citation_metrics as {
    myDomainStats?: { citationRate?: number }
  } | null
  if (citationMetrics?.myDomainStats?.citationRate !== undefined) {
    return citationMetrics.myDomainStats.citationRate
  }

  // 2. summary.citationRateByLLM에서 평균 계산
  const summary = analysis.summary as {
    citationRateByLLM?: Record<string, number | null>
  } | null
  if (summary?.citationRateByLLM) {
    const rates = Object.values(summary.citationRateByLLM)
      .filter((r): r is number => r !== null && r !== undefined)
    if (rates.length > 0) {
      return rates.reduce((a, b) => a + b, 0) / rates.length
    }
  }

  return 0
}

/**
 * 브랜드 노출 계산 헬퍼 함수 (LLM 커버리지)
 * citation_metrics 또는 summary에서 브랜드 노출률 추출
 */
const calculateBrandExposure = (analysis: Analysis): number => {
  // 1. citation_metrics에서 가져오기
  const citationMetrics = analysis.citation_metrics as {
    brandMentionStats?: { mentionRate?: number }
  } | null
  if (citationMetrics?.brandMentionStats?.mentionRate !== undefined) {
    return citationMetrics.brandMentionStats.mentionRate
  }

  // 2. summary.brandMentionAnalysis에서 계산
  const summary = analysis.summary as {
    brandMentionAnalysis?: {
      myBrand?: { mentionedInLLMs?: string[] }
    }
    successfulLLMs?: string[]
  } | null
  if (summary?.brandMentionAnalysis?.myBrand?.mentionedInLLMs) {
    const mentionedCount = summary.brandMentionAnalysis.myBrand.mentionedInLLMs.length
    const totalLLMs = summary.successfulLLMs?.length || 3
    return (mentionedCount / totalLLMs) * 100
  }

  return 0
}

/**
 * 경쟁사 순위 계산 헬퍼 함수
 * 내 브랜드의 언급 횟수 기준 순위 반환
 */
const calculateCompetitorRank = (analysis: Analysis): number | null => {
  const summary = analysis.summary as {
    brandMentionAnalysis?: {
      myBrand?: { mentionCount?: number }
      competitors?: Array<{ brand: string; mentionCount?: number }>
    }
  } | null

  const myBrand = summary?.brandMentionAnalysis?.myBrand
  const competitors = summary?.brandMentionAnalysis?.competitors

  if (!myBrand?.mentionCount || !competitors || competitors.length === 0) {
    return null
  }

  // 언급 횟수로 정렬하여 순위 계산
  const allBrands = [
    { brand: 'myBrand', count: myBrand.mentionCount },
    ...competitors.map(c => ({ brand: c.brand, count: c.mentionCount || 0 }))
  ].sort((a, b) => b.count - a.count)

  const myRank = allBrands.findIndex(b => b.brand === 'myBrand') + 1
  return myRank
}

/**
 * 빈 KPI 데이터 생성 헬퍼
 */
const createEmptyKPIData = (): KPIData => ({
  citationRate: 0,
  citationTrend: 0,
  brandExposure: 0,
  brandTrend: 0,
  competitorRank: 0,
  rankTrend: 0,
  totalAnalyses: 0,
  successRate: 0,
  sparklineData: {
    citation: [],
    brand: [],
    rank: [],
    analyses: [],
  },
})

/**
 * KPI 데이터 페칭 훅
 * 대시보드 KPI 카드에 표시할 주요 지표 데이터를 가져옵니다.
 */
export function useKPIData() {
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // 최근 분석 데이터 가져오기 (최근 30개)
      const { data: analyses, error: fetchError } = await supabase
        .from('analyses')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(30)

      if (fetchError) throw fetchError

      if (!analyses || analyses.length === 0) {
        setData(createEmptyKPIData())
        return
      }

      // 최근/이전 분석 구분 (7건씩)
      const recentAnalyses = analyses.slice(0, Math.min(7, analyses.length))
      const olderAnalyses = analyses.slice(7, 14)

      // 최근 인용율 평균
      const recentCitationRates = recentAnalyses.map(calculateCitationRate)
      const avgRecentCitation = recentCitationRates.length > 0
        ? recentCitationRates.reduce((a, b) => a + b, 0) / recentCitationRates.length
        : 0

      // 이전 인용율 평균
      const olderCitationRates = olderAnalyses.map(calculateCitationRate)
      const avgOlderCitation = olderCitationRates.length > 0
        ? olderCitationRates.reduce((a, b) => a + b, 0) / olderCitationRates.length
        : avgRecentCitation

      // 인용율 변화
      const citationTrend = avgOlderCitation > 0
        ? ((avgRecentCitation - avgOlderCitation) / avgOlderCitation) * 100
        : 0

      // 브랜드 노출률
      const recentBrandRates = recentAnalyses.map(calculateBrandExposure)
      const avgBrandExposure = recentBrandRates.length > 0
        ? recentBrandRates.reduce((a, b) => a + b, 0) / recentBrandRates.length
        : 0

      const olderBrandRates = olderAnalyses.map(calculateBrandExposure)
      const avgOlderBrand = olderBrandRates.length > 0
        ? olderBrandRates.reduce((a, b) => a + b, 0) / olderBrandRates.length
        : avgBrandExposure

      const brandTrend = avgOlderBrand > 0
        ? ((avgBrandExposure - avgOlderBrand) / avgOlderBrand) * 100
        : 0

      // 경쟁사 순위 계산
      const recentRanks = recentAnalyses.map(calculateCompetitorRank).filter((r): r is number => r !== null)
      const avgRecentRank = recentRanks.length > 0
        ? Math.round(recentRanks.reduce((a, b) => a + b, 0) / recentRanks.length)
        : 0

      const olderRanks = olderAnalyses.map(calculateCompetitorRank).filter((r): r is number => r !== null)
      const avgOlderRank = olderRanks.length > 0
        ? olderRanks.reduce((a, b) => a + b, 0) / olderRanks.length
        : avgRecentRank

      // 순위는 낮을수록 좋으므로 트렌드 방향 반대
      const rankTrend = avgOlderRank > 0 && avgRecentRank > 0
        ? ((avgOlderRank - avgRecentRank) / avgOlderRank) * 100
        : 0

      // 총 분석 수 및 성공률
      const { count: totalCount } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })

      const { count: completedCount } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      const successRate = totalCount ? ((completedCount || 0) / totalCount) * 100 : 0

      // 스파크라인 데이터 (최근 7개 분석)
      const sparklineAnalyses = analyses.slice(0, 7).reverse()
      const citationSparkline = sparklineAnalyses.map(a => ({ value: calculateCitationRate(a) }))
      const brandSparkline = sparklineAnalyses.map(a => ({ value: calculateBrandExposure(a) }))

      // 순위 스파크라인 데이터
      const rankSparkline = sparklineAnalyses
        .map(a => calculateCompetitorRank(a))
        .filter((r): r is number => r !== null)
        .map(r => ({ value: r }))

      setData({
        citationRate: avgRecentCitation,
        citationTrend,
        brandExposure: avgBrandExposure,
        brandTrend,
        competitorRank: avgRecentRank,
        rankTrend,
        totalAnalyses: totalCount || 0,
        successRate,
        sparklineData: {
          citation: citationSparkline,
          brand: brandSparkline,
          rank: rankSparkline,
          analyses: sparklineAnalyses.map((_, i) => ({ value: i + 1 })),
        },
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('KPI 데이터 로드 오류')
      console.error('KPI 데이터 로드 오류:', err)
      setError(error)
      setData(createEmptyKPIData())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}
