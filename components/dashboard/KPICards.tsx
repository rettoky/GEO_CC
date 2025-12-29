'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus, Quote, Eye, Trophy, BarChart3 } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useEffect, useState, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Analysis } from '@/lib/supabase/types'

interface KPIData {
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

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  trendLabel?: string
  icon: React.ReactNode
  sparklineData?: { value: number }[]
  sparklineColor?: string
  loading?: boolean
  invertTrend?: boolean
}

const KPICard = memo(function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  sparklineData,
  sparklineColor = '#3b82f6',
  loading,
  invertTrend,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) {
      return <Minus className="h-3 w-3 text-muted-foreground" />
    }
    const isPositive = invertTrend ? trend < 0 : trend > 0
    if (isPositive) {
      return <TrendingUp className="h-3 w-3 text-green-500" />
    }
    return <TrendingDown className="h-3 w-3 text-red-500" />
  }

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return 'text-muted-foreground'
    const isPositive = invertTrend ? trend < 0 : trend > 0
    return isPositive ? 'text-green-500' : 'text-red-500'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-20" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {(subtitle || trend !== undefined) && (
              <div className="flex items-center gap-1 text-xs">
                {trend !== undefined && (
                  <>
                    {getTrendIcon()}
                    <span className={cn(getTrendColor())}>
                      {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                    </span>
                  </>
                )}
                {trendLabel && (
                  <span className="text-muted-foreground ml-1">{trendLabel}</span>
                )}
                {subtitle && !trend && (
                  <span className="text-muted-foreground">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          {sparklineData && sparklineData.length > 1 && (
            <div className="h-10 w-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={sparklineColor}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Return true if props are equal (skip re-render), false if different (re-render)

  // Compare primitive props
  if (
    prevProps.title !== nextProps.title ||
    prevProps.value !== nextProps.value ||
    prevProps.subtitle !== nextProps.subtitle ||
    prevProps.trend !== nextProps.trend ||
    prevProps.trendLabel !== nextProps.trendLabel ||
    prevProps.sparklineColor !== nextProps.sparklineColor ||
    prevProps.loading !== nextProps.loading ||
    prevProps.invertTrend !== nextProps.invertTrend
  ) {
    return false
  }

  // Compare sparklineData array by length and values
  if (prevProps.sparklineData?.length !== nextProps.sparklineData?.length) {
    return false
  }

  if (prevProps.sparklineData && nextProps.sparklineData) {
    for (let i = 0; i < prevProps.sparklineData.length; i++) {
      if (prevProps.sparklineData[i].value !== nextProps.sparklineData[i].value) {
        return false
      }
    }
  }

  // Icon comparison (React elements are always different references, so we skip this)
  // Icons are typically stable for each card type

  return true
})

export function KPICards() {
  const [loading, setLoading] = useState(true)
  const [kpiData, setKpiData] = useState<KPIData | null>(null)

  useEffect(() => {
    async function fetchKPIData() {
      setLoading(true)
      try {
        const supabase = createClient()

        // 최근 분석 데이터 가져오기 (최근 30개)
        const { data: analyses, error } = await supabase
          .from('analyses')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(30)

        if (error) throw error

        if (!analyses || analyses.length === 0) {
          setKpiData({
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
          return
        }

        // 인용율 계산 (최근 분석 vs 이전 분석)
        const recentAnalyses = analyses.slice(0, Math.min(7, analyses.length))
        const olderAnalyses = analyses.slice(7, 14)

        // 각 분석에서 인용율 계산 (summary 또는 citation_metrics 사용)
        const calculateCitationRate = (analysis: Analysis) => {
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

        // 브랜드 노출 계산 (LLM 커버리지)
        const calculateBrandExposure = (analysis: Analysis) => {
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

        // 경쟁사 순위 계산 (내 브랜드 언급 횟수 기준)
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

        // 총 분석 수
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

        setKpiData({
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
      } catch (error) {
        console.error('KPI 데이터 로드 오류:', error)
        setKpiData({
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
      } finally {
        setLoading(false)
      }
    }

    fetchKPIData()
  }, [])

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="인용율"
        value={loading ? '-' : `${kpiData?.citationRate.toFixed(1)}%`}
        trend={kpiData?.citationTrend}
        trendLabel="vs 이전 7건"
        icon={<Quote className="h-4 w-4" />}
        sparklineData={kpiData?.sparklineData.citation}
        sparklineColor="#22c55e"
        loading={loading}
      />
      <KPICard
        title="브랜드 노출률"
        value={loading ? '-' : `${kpiData?.brandExposure.toFixed(1)}%`}
        trend={kpiData?.brandTrend}
        trendLabel="LLM 커버리지"
        icon={<Eye className="h-4 w-4" />}
        sparklineData={kpiData?.sparklineData.brand}
        sparklineColor="#3b82f6"
        loading={loading}
      />
      <KPICard
        title="경쟁사 순위"
        value={loading ? '-' : (kpiData?.competitorRank || '-')}
        subtitle={kpiData?.competitorRank ? '위' : '데이터 없음'}
        icon={<Trophy className="h-4 w-4" />}
        sparklineData={kpiData?.sparklineData.rank}
        sparklineColor="#f59e0b"
        loading={loading}
        invertTrend
      />
      <KPICard
        title="총 분석"
        value={loading ? '-' : kpiData?.totalAnalyses || 0}
        subtitle={`성공률 ${kpiData?.successRate.toFixed(0)}%`}
        icon={<BarChart3 className="h-4 w-4" />}
        sparklineData={kpiData?.sparklineData.analyses}
        sparklineColor="#8b5cf6"
        loading={loading}
      />
    </div>
  )
}
