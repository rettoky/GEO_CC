'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Award, Target, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrackingData } from '@/hooks/useTrackingAnalyses'
import type { LLMType } from '@/lib/supabase/types'

interface MetricsSummaryProps {
  data: TrackingData[]
  title?: string
  description?: string
  className?: string
}

const LLM_INFO: Array<{ key: LLMType; label: string; color: string }> = [
  { key: 'perplexity', label: 'Perplexity', color: '#8b5cf6' },
  { key: 'chatgpt', label: 'ChatGPT', color: '#22c55e' },
  { key: 'gemini', label: 'Gemini', color: '#3b82f6' },
]

/**
 * 핵심 지표 요약 컴포넌트
 * 트래킹에 유용한 주요 메트릭을 카드 형태로 표시
 */
export function MetricsSummary({
  data,
  title = '핵심 지표',
  description = '트래킹 주요 성과 지표',
  className,
}: MetricsSummaryProps) {
  const metrics = useMemo(() => {
    if (data.length === 0) return null

    // 전체 평균 인용률
    const allCitationRates = data.map(d => d.citationRate).filter(v => v > 0)
    const avgCitationRate = allCitationRates.length > 0
      ? Math.round(allCitationRates.reduce((a, b) => a + b, 0) / allCitationRates.length * 10) / 10
      : 0

    // 최근 7일 vs 이전 7일 비교
    const recentDays = data.slice(-7)
    const previousDays = data.slice(-14, -7)

    const recentAvg = recentDays.length > 0
      ? recentDays.reduce((a, b) => a + b.citationRate, 0) / recentDays.length
      : 0
    const previousAvg = previousDays.length > 0
      ? previousDays.reduce((a, b) => a + b.citationRate, 0) / previousDays.length
      : recentAvg

    const weeklyChange = previousAvg > 0
      ? Math.round((recentAvg - previousAvg) / previousAvg * 100)
      : 0

    // 최고 성과 LLM
    const llmAvgs = LLM_INFO.map(llm => {
      const values = data.map(d => d[llm.key]).filter(v => v > 0)
      return {
        ...llm,
        avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      }
    })
    const bestLLM = llmAvgs.reduce((best, current) =>
      current.avg > best.avg ? current : best
    , llmAvgs[0])

    // 최근 최고 기록
    const maxCitationRate = Math.max(...allCitationRates, 0)
    const maxDate = data.find(d => d.citationRate === maxCitationRate)?.date || '-'

    // 브랜드 노출률 평균
    const brandExposures = data.map(d => d.brandExposure).filter(v => v > 0)
    const avgBrandExposure = brandExposures.length > 0
      ? Math.round(brandExposures.reduce((a, b) => a + b, 0) / brandExposures.length * 10) / 10
      : 0

    // 데이터 포인트 수
    const totalDataPoints = data.length

    return {
      avgCitationRate,
      weeklyChange,
      bestLLM,
      maxCitationRate: Math.round(maxCitationRate * 10) / 10,
      maxDate,
      avgBrandExposure,
      totalDataPoints,
      recentAvg: Math.round(recentAvg * 10) / 10,
    }
  }, [data])

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">데이터가 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 주요 지표 그리드 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 평균 인용률 */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">평균 인용률</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">{metrics.avgCitationRate}%</span>
              <div className="flex items-center gap-1">
                {getTrendIcon(metrics.weeklyChange)}
                <span className={cn(
                  'text-xs font-medium',
                  metrics.weeklyChange > 0 ? 'text-green-500' :
                  metrics.weeklyChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                )}>
                  {metrics.weeklyChange > 0 ? '+' : ''}{metrics.weeklyChange}%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">최근 7일 대비</p>
          </div>

          {/* 브랜드 노출률 */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">브랜드 노출</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{metrics.avgBrandExposure}%</div>
            <p className="text-xs text-muted-foreground mt-1">평균 노출률</p>
          </div>

          {/* 최고 성과 LLM */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">최고 성과 LLM</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: metrics.bestLLM.color }}
              />
              <span className="text-lg font-bold" style={{ color: metrics.bestLLM.color }}>
                {metrics.bestLLM.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              평균 {Math.round(metrics.bestLLM.avg * 10) / 10}%
            </p>
          </div>

          {/* 최고 기록 */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">최고 기록</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{metrics.maxCitationRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.maxDate}</p>
          </div>
        </div>

        {/* LLM별 빠른 비교 */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">LLM별 평균 인용률</p>
          <div className="space-y-2">
            {LLM_INFO.map(llm => {
              const values = data.map(d => d[llm.key]).filter(v => v > 0)
              const avg = values.length > 0
                ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10
                : 0
              const maxAvg = Math.max(...LLM_INFO.map(l => {
                const vals = data.map(d => d[l.key]).filter(v => v > 0)
                return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
              }))
              const percentage = maxAvg > 0 ? (avg / maxAvg) * 100 : 0

              return (
                <div key={llm.key} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: llm.color }}
                  />
                  <span className="text-xs w-16 shrink-0">{llm.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: llm.color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{avg}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
