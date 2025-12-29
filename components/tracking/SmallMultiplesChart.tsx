'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { TrackingData } from '@/hooks/useTrackingAnalyses'
import type { LLMType } from '@/lib/supabase/types'

interface SmallMultiplesChartProps {
  data: TrackingData[]
  title?: string
  description?: string
  className?: string
}

// Claude는 인용 데이터가 없어 제외
const ACTIVE_LLMS: Array<{
  key: LLMType
  label: string
  color: string
}> = [
  { key: 'perplexity', label: 'Perplexity', color: '#8b5cf6' },
  { key: 'chatgpt', label: 'ChatGPT', color: '#22c55e' },
  { key: 'gemini', label: 'Gemini', color: '#3b82f6' },
]

/**
 * LLM별 Small Multiples Line Chart
 * 각 LLM의 인용률 추세를 개별 미니 차트로 표시
 */
export function SmallMultiplesChart({
  data,
  title = 'LLM별 인용률 추세',
  description = '각 LLM의 인용률 변화를 개별 차트로 비교합니다',
  className,
}: SmallMultiplesChartProps) {
  // Y축 공통 범위 계산 (비교를 위해 동일하게 유지)
  const yAxisDomain = useMemo((): [number, number] => {
    if (data.length === 0) return [0, 50]

    const allValues = data.flatMap(d => [
      d.perplexity,
      d.chatgpt,
      d.gemini,
    ]).filter(v => v !== null && v !== undefined && v > 0)

    if (allValues.length === 0) return [0, 50]

    const maxValue = Math.max(...allValues)
    const minValue = Math.min(...allValues)

    const upperBound = Math.ceil((maxValue * 1.15) / 5) * 5
    const lowerBound = minValue > 10 ? Math.floor((minValue * 0.8) / 5) * 5 : 0

    return [lowerBound, Math.max(upperBound, lowerBound + 20)]
  }, [data])

  // LLM별 통계 계산
  const llmStats = useMemo(() => {
    return ACTIVE_LLMS.map(llm => {
      const values = data.map(d => d[llm.key]).filter(v => v > 0)
      const avg = values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10
        : 0
      const latest = data.length > 0 ? data[data.length - 1][llm.key] : 0
      const trend = data.length >= 2
        ? data[data.length - 1][llm.key] - data[data.length - 2][llm.key]
        : 0

      return { ...llm, avg, latest, trend }
    })
  }, [data])

  if (data.length === 0) {
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
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {llmStats.map((llm) => (
            <div
              key={llm.key}
              className="border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors"
            >
              {/* LLM 헤더 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: llm.color }}
                  />
                  <span className="font-medium text-sm">{llm.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">평균</span>
                  <span className="font-semibold" style={{ color: llm.color }}>
                    {llm.avg}%
                  </span>
                  {llm.trend !== 0 && (
                    <span className={cn(
                      'text-xs',
                      llm.trend > 0 ? 'text-green-500' : 'text-red-500'
                    )}>
                      {llm.trend > 0 ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </div>

              {/* 미니 라인 차트 */}
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="date"
                      tick={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={yAxisDomain}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, llm.label]}
                      labelFormatter={(label) => label}
                    />
                    <ReferenceLine
                      y={llm.avg}
                      stroke={llm.color}
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                    <Line
                      type="monotone"
                      dataKey={llm.key}
                      stroke={llm.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: llm.color }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 요약 정보 */}
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>최신: {llm.latest}%</span>
                <span>{data.length}개 데이터</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
