'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { LLMType } from '@/lib/supabase/types'
import { LLM_COLORS, RADAR_METRICS, type RadarMetricKey } from '@/lib/types/visualization'

// Claude는 인용 데이터가 없어 제외
const ACTIVE_LLMS: LLMType[] = ['perplexity', 'chatgpt', 'gemini']

const LLM_LABELS: Record<LLMType, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
}

interface RadarChartProps {
  /** 트래킹 데이터 */
  data: Array<{
    date: string
    citationRate: number
    brandExposure: number
    perplexity: number | null
    chatgpt: number | null
    gemini: number | null
    claude: number | null
  }>
  /** 비교 모드: 'llm' = LLM별 비교, 'date' = 날짜별 비교 */
  compareMode?: 'llm' | 'date'
  /** 표시할 날짜들 (date 모드에서 사용) */
  selectedDates?: string[]
  /** 제목 */
  title?: string
  /** 설명 */
  description?: string
  /** 카드 클래스 */
  className?: string
}

/**
 * 레이더 차트 컴포넌트
 * LLM별 또는 날짜별 다차원 비교
 */
export function RadarComparisonChart({
  data,
  compareMode = 'llm',
  selectedDates,
  title = 'LLM 성능 비교',
  description = 'LLM별 주요 지표를 한눈에 비교합니다',
  className,
}: RadarChartProps) {
  // LLM 비교 모드: 각 LLM의 평균 성능을 레이더 차트로 표시
  const { llmRadarData, radarDomain } = useMemo(() => {
    if (compareMode !== 'llm' || data.length === 0) return { llmRadarData: null, radarDomain: [0, 100] as [number, number] }

    // 각 LLM별 평균 계산
    const llmStats = ACTIVE_LLMS.map(llm => {
      const values = data.map(d => d[llm]).filter((v): v is number => v !== null)
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
      const consistency = values.length > 1
        ? 100 - (Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length))
        : 50
      return {
        llm,
        avgCitationRate: Math.round(avg * 10) / 10,
        consistency: Math.max(0, Math.min(100, Math.round(consistency))),
        dataPoints: values.length,
      }
    })

    // 최대값 계산 (모든 메트릭 포함)
    const maxCitationRate = Math.max(...llmStats.map(s => s.avgCitationRate), 1)
    const maxDataPoints = Math.max(...llmStats.map(s => s.dataPoints), 1)
    const maxConsistency = Math.max(...llmStats.map(s => s.consistency), 1)

    // 동적 범위 계산 - 최대값의 120%를 상한으로, 10 단위 올림
    const overallMax = Math.max(maxCitationRate, maxConsistency)
    const dynamicMax = Math.ceil((overallMax * 1.2) / 10) * 10

    // 레이더 차트용 데이터 포맷 (모든 값을 정규화)
    const metrics = [
      { metric: 'citationRate', label: '인용률' },
      { metric: 'consistency', label: '일관성' },
      { metric: 'dataPoints', label: '데이터 양' },
    ]

    const radarData = metrics.map(m => {
      const point: Record<string, string | number> = {
        metric: m.label,
        fullMark: dynamicMax,
      }
      llmStats.forEach(stat => {
        if (m.metric === 'dataPoints') {
          // 데이터 양은 동적 범위에 맞게 정규화
          point[stat.llm] = Math.round((stat.dataPoints / maxDataPoints) * dynamicMax)
        } else if (m.metric === 'citationRate') {
          point[stat.llm] = stat.avgCitationRate
        } else {
          point[stat.llm] = stat.consistency
        }
      })
      return point
    })

    return { llmRadarData: radarData, radarDomain: [0, dynamicMax] as [number, number] }
  }, [data, compareMode])

  // 날짜 비교 모드: 선택된 날짜들의 성능을 비교
  const dateRadarData = useMemo(() => {
    if (compareMode !== 'date' || data.length === 0) return null

    const datesToShow = selectedDates?.slice(0, 4) || data.slice(-3).map(d => d.date)

    const metrics = [
      { metric: 'citationRate', label: '인용률' },
      { metric: 'brandExposure', label: '브랜드 노출' },
    ]

    return metrics.map(m => {
      const point: Record<string, string | number> = {
        metric: m.label,
        fullMark: 100,
      }
      datesToShow.forEach(date => {
        const dayData = data.find(d => d.date === date)
        if (dayData) {
          const key = m.metric as 'citationRate' | 'brandExposure'
          point[date] = Math.round(dayData[key])
        }
      })
      return point
    })
  }, [data, compareMode, selectedDates])

  const radarData = compareMode === 'llm' ? llmRadarData : dateRadarData
  const series = compareMode === 'llm'
    ? ACTIVE_LLMS
    : (selectedDates?.slice(0, 4) || data.slice(-3).map(d => d.date))

  if (!radarData || radarData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">데이터가 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="outline" className="text-xs font-normal">
            {compareMode === 'llm' ? 'LLM 비교' : '날짜 비교'}
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsRadar data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={compareMode === 'llm' ? radarDomain : [0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickCount={5}
              />
              {series.map((key, idx) => {
                const color = compareMode === 'llm'
                  ? LLM_COLORS[key as LLMType]
                  : `hsl(${(idx * 90) % 360}, 70%, 50%)`
                const name = compareMode === 'llm'
                  ? LLM_LABELS[key as LLMType]
                  : new Date(key).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

                return (
                  <Radar
                    key={key}
                    name={name}
                    dataKey={key}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                )
              })}
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </RechartsRadar>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
