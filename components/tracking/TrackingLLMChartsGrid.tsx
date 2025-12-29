'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrackingLLMChart } from './TrackingLLMChart'
import type { TrackingData } from '@/hooks/useTrackingAnalyses'
import type { YAxisDomain } from '@/hooks/useTrackingChartData'

interface TrackingLLMChartsGridProps {
  chartData: TrackingData[]
  yAxisDomains: YAxisDomain
  originalDataCount: number
  aggregatedDataCount: number
}

const LLM_CONFIGS = [
  { key: 'perplexity' as const, name: 'Perplexity', color: '#8b5cf6' },
  { key: 'chatgpt' as const, name: 'ChatGPT', color: '#22c55e' },
  { key: 'gemini' as const, name: 'Gemini', color: '#3b82f6' },
]

/**
 * LLM별 인용율 차트 그리드
 * 3개의 개별 LLM 차트를 3열로 배치
 */
export function TrackingLLMChartsGrid({
  chartData,
  yAxisDomains,
  originalDataCount,
  aggregatedDataCount,
}: TrackingLLMChartsGridProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>LLM별 인용율 추세</CardTitle>
        <CardDescription>
          각 LLM에서의 인용율 변화 추이
          {aggregatedDataCount !== originalDataCount && (
            <span className="ml-2 text-xs">
              ({originalDataCount}개 → {aggregatedDataCount}개 집계)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LLM_CONFIGS.map(({ key, name, color }) => (
            <TrackingLLMChart
              key={key}
              data={chartData}
              llmKey={key}
              llmName={name}
              color={color}
              yAxisDomain={yAxisDomains[key]}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
