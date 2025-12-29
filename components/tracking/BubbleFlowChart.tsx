'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Analysis, LLMType } from '@/lib/supabase/types'

interface BubbleFlowChartProps {
  analyses: Analysis[]
  title?: string
  description?: string
  className?: string
}

// LLM별 색상 정의
const LLM_CONFIG: Record<string, { color: string; label: string }> = {
  perplexity: { color: '#8b5cf6', label: 'Perplexity' },
  chatgpt: { color: '#22c55e', label: 'ChatGPT' },
  gemini: { color: '#3b82f6', label: 'Gemini' },
}

// 시간대 레이블 (6시간 단위)
const TIME_LABELS = ['0시', '6시', '12시', '18시', '24시']

interface BubbleData {
  hour: number
  llm: string
  citationRate: number
  count: number
}

/**
 * 시간대별 LLM 인용률 버블 산점도
 * X축: 시간 (0-24시)
 * Y축: LLM 종류 (레인)
 * 버블 크기: 인용률
 */
export function BubbleFlowChart({
  analyses,
  title = '시간대별 분석 패턴',
  description = 'LLM별 시간대에 따른 인용률 분포',
  className,
}: BubbleFlowChartProps) {
  // 분석 데이터를 시간대 + LLM별로 집계
  const bubbleData = useMemo(() => {
    const hourlyMap = new Map<string, { rates: number[]; count: number }>()
    const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini']

    analyses.forEach(analysis => {
      const hour = new Date(analysis.created_at).getHours()
      const summary = analysis.summary as {
        citationRateByLLM?: Record<LLMType, number | null>
      } | null

      // intermediate_results에서도 추출
      const intermediateResults = analysis.intermediate_results as {
        allQueryResults?: Array<{
          summary?: { citationRateByLLM?: Record<LLMType, number | null> }
        }>
      } | null

      // 각 LLM별로 데이터 수집
      llmTypes.forEach(llm => {
        let citationRate: number | null = null

        // 배치 분석인 경우
        if (intermediateResults?.allQueryResults) {
          const rates = intermediateResults.allQueryResults
            .map(qr => qr.summary?.citationRateByLLM?.[llm])
            .filter((r): r is number => r !== null && r !== undefined)
          if (rates.length > 0) {
            citationRate = rates.reduce((a, b) => a + b, 0) / rates.length
          }
        } else if (summary?.citationRateByLLM?.[llm] !== null && summary?.citationRateByLLM?.[llm] !== undefined) {
          citationRate = summary.citationRateByLLM[llm]
        }

        if (citationRate !== null && citationRate > 0) {
          const key = `${hour}-${llm}`
          if (!hourlyMap.has(key)) {
            hourlyMap.set(key, { rates: [], count: 0 })
          }
          const entry = hourlyMap.get(key)!
          entry.rates.push(citationRate)
          entry.count++
        }
      })
    })

    // Map을 BubbleData 배열로 변환
    const bubbles: BubbleData[] = []
    hourlyMap.forEach((value, key) => {
      const [hourStr, llm] = key.split('-')
      const avgRate = value.rates.reduce((a, b) => a + b, 0) / value.rates.length
      bubbles.push({
        hour: parseInt(hourStr),
        llm,
        citationRate: Math.round(avgRate * 10) / 10,
        count: value.count,
      })
    })

    return bubbles
  }, [analyses])

  // 최대 인용률 (버블 크기 정규화용)
  const maxCitationRate = useMemo(() => {
    if (bubbleData.length === 0) return 50
    return Math.max(...bubbleData.map(d => d.citationRate), 30)
  }, [bubbleData])

  // 버블 반지름 계산 (최소 4px, 최대 20px)
  const getBubbleRadius = (rate: number) => {
    const normalized = rate / maxCitationRate
    return Math.max(4, Math.min(20, normalized * 20))
  }

  const llmOrder = ['perplexity', 'chatgpt', 'gemini']
  const chartHeight = 180
  const chartWidth = '100%'
  const laneHeight = chartHeight / 3
  const leftPadding = 80
  const rightPadding = 20

  return (
    <TooltipProvider>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="relative" style={{ height: chartHeight + 40 }}>
            {/* Y축 레이블 (LLM 이름) */}
            <div
              className="absolute left-0 top-0 flex flex-col justify-around"
              style={{ height: chartHeight, width: leftPadding - 10 }}
            >
              {llmOrder.map((llm, idx) => (
                <div
                  key={llm}
                  className="flex items-center gap-2 pr-2"
                  style={{ height: laneHeight }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: LLM_CONFIG[llm].color }}
                  />
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {LLM_CONFIG[llm].label}
                  </span>
                </div>
              ))}
            </div>

            {/* 차트 영역 */}
            <svg
              className="absolute"
              style={{ left: leftPadding, top: 0, width: `calc(100% - ${leftPadding + rightPadding}px)`, height: chartHeight }}
              viewBox={`0 0 100 ${chartHeight}`}
              preserveAspectRatio="none"
            >
              {/* 배경 레인 */}
              {llmOrder.map((llm, idx) => (
                <rect
                  key={llm}
                  x="0"
                  y={idx * laneHeight}
                  width="100"
                  height={laneHeight}
                  fill={LLM_CONFIG[llm].color}
                  fillOpacity={0.05}
                  className="dark:fill-opacity-10"
                />
              ))}

              {/* 수평 구분선 */}
              {llmOrder.map((_, idx) => (
                <line
                  key={idx}
                  x1="0"
                  y1={(idx + 1) * laneHeight}
                  x2="100"
                  y2={(idx + 1) * laneHeight}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.3"
                />
              ))}
            </svg>

            {/* 버블 렌더링 (별도 SVG로 분리하여 preserveAspectRatio 제거) */}
            <div
              className="absolute"
              style={{
                left: leftPadding,
                top: 0,
                width: `calc(100% - ${leftPadding + rightPadding}px)`,
                height: chartHeight
              }}
            >
              {bubbleData.map((bubble, idx) => {
                const llmIndex = llmOrder.indexOf(bubble.llm)
                if (llmIndex === -1) return null

                const xPercent = (bubble.hour / 24) * 100
                const yCenter = (llmIndex + 0.5) * laneHeight
                const radius = getBubbleRadius(bubble.citationRate)

                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute rounded-full cursor-pointer transition-transform hover:scale-125"
                        style={{
                          left: `${xPercent}%`,
                          top: yCenter,
                          width: radius * 2,
                          height: radius * 2,
                          backgroundColor: LLM_CONFIG[bubble.llm].color,
                          opacity: 0.7,
                          transform: `translate(-50%, -50%)`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-sm">
                      <div className="font-medium">{LLM_CONFIG[bubble.llm].label}</div>
                      <div className="text-muted-foreground">{bubble.hour}시 ~ {bubble.hour + 1}시</div>
                      <div className="mt-1">
                        인용률: <strong>{bubble.citationRate}%</strong>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bubble.count}개 분석
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            {/* X축 레이블 (시간) */}
            <div
              className="absolute flex justify-between"
              style={{
                left: leftPadding,
                top: chartHeight + 8,
                width: `calc(100% - ${leftPadding + rightPadding}px)`
              }}
            >
              {TIME_LABELS.map((label, idx) => (
                <span
                  key={idx}
                  className="text-xs text-muted-foreground"
                  style={{
                    transform: idx === TIME_LABELS.length - 1 ? 'translateX(-50%)' : idx === 0 ? 'translateX(0)' : 'translateX(-50%)'
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* 범례 */}
          <div className="flex items-center justify-end gap-4 mt-4 text-xs text-muted-foreground">
            <span>버블 크기 = 인용률</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              <span>작음</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-muted-foreground/50" />
              <span>큼</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
