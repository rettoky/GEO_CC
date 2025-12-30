'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getLLMColor, getLLMName } from '@/lib/constants/llm-config'
import type { Analysis, LLMType } from '@/lib/supabase/types'

interface BubbleFlowChartProps {
  analyses: Analysis[]
  title?: string
  description?: string
  className?: string
}

// LLM별 색상 정의 (중앙화된 색상 시스템 사용)
const LLM_CONFIG: Record<string, { color: string; colorLight: string; label: string }> = {
  perplexity: {
    color: getLLMColor('perplexity'),
    colorLight: `${getLLMColor('perplexity')}59`, // 35% opacity in hex
    label: getLLMName('perplexity')
  },
  chatgpt: {
    color: getLLMColor('chatgpt'),
    colorLight: `${getLLMColor('chatgpt')}59`,
    label: getLLMName('chatgpt')
  },
  gemini: {
    color: getLLMColor('gemini'),
    colorLight: `${getLLMColor('gemini')}59`,
    label: getLLMName('gemini')
  },
}

// 시간대 레이블
const HOURLY_LABELS = ['0시', '6시', '12시', '18시', '24시']
const MINUTE_LABELS = ['0시', '4시', '8시', '12시', '16시', '20시', '24시']

type TimeMode = 'hourly' | 'tenMinute'

interface BubbleData {
  timeSlot: number // hourly: 0-23, tenMinute: 0-143
  llm: string
  citationRate: number
  count: number
}

/**
 * 시간대별 LLM 인용률 버블 산점도
 * X축: 시간 (시간 단위 또는 10분 단위)
 * Y축: LLM 종류 (레인)
 * 버블 크기: 인용률
 */
export function BubbleFlowChart({
  analyses,
  title = '시간대별 분석 패턴',
  description = 'LLM별 시간대에 따른 인용률 분포',
  className,
}: BubbleFlowChartProps) {
  const [timeMode, setTimeMode] = useState<TimeMode>('hourly')

  // 분석 데이터를 시간대 + LLM별로 집계
  const bubbleData = useMemo(() => {
    const dataMap = new Map<string, { rates: number[]; count: number }>()
    const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini']

    analyses.forEach(analysis => {
      const date = new Date(analysis.created_at)
      const hour = date.getHours()
      const minute = date.getMinutes()

      // 시간 슬롯 계산
      const timeSlot = timeMode === 'hourly'
        ? hour
        : hour * 6 + Math.floor(minute / 10) // 10분 단위: 0-143

      const summary = analysis.summary as {
        citationRateByLLM?: Record<LLMType, number | null>
      } | null

      const intermediateResults = analysis.intermediate_results as {
        allQueryResults?: Array<{
          summary?: { citationRateByLLM?: Record<LLMType, number | null> }
        }>
      } | null

      // 각 LLM별로 데이터 수집
      llmTypes.forEach(llm => {
        let citationRate: number | null = null

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
          const key = `${timeSlot}-${llm}`
          if (!dataMap.has(key)) {
            dataMap.set(key, { rates: [], count: 0 })
          }
          const entry = dataMap.get(key)!
          entry.rates.push(citationRate)
          entry.count++
        }
      })
    })

    // Map을 BubbleData 배열로 변환
    const bubbles: BubbleData[] = []
    dataMap.forEach((value, key) => {
      const [slotStr, llm] = key.split('-')
      const avgRate = value.rates.reduce((a, b) => a + b, 0) / value.rates.length
      bubbles.push({
        timeSlot: parseInt(slotStr),
        llm,
        citationRate: Math.round(avgRate * 10) / 10,
        count: value.count,
      })
    })

    return bubbles
  }, [analyses, timeMode])

  // LLM별 Min-Max 정규화를 위한 범위 계산
  const llmRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {}
    const llmTypes = ['perplexity', 'chatgpt', 'gemini']

    llmTypes.forEach(llm => {
      const llmRates = bubbleData
        .filter(d => d.llm === llm)
        .map(d => d.citationRate)

      if (llmRates.length === 0) {
        ranges[llm] = { min: 0, max: 50 }
      } else {
        ranges[llm] = {
          min: Math.min(...llmRates),
          max: Math.max(...llmRates),
        }
      }
    })

    return ranges
  }, [bubbleData])

  // 버블 반지름 계산 - LLM별 Min-Max 정규화
  const getBubbleRadius = (rate: number, llm: string) => {
    const MIN_RADIUS = 4
    const MAX_RADIUS = 30

    const range = llmRanges[llm] || { min: 0, max: 50 }
    const { min, max } = range

    // 데이터가 하나이거나 범위가 매우 좁으면 중간 크기
    if (max - min < 0.1) return (MIN_RADIUS + MAX_RADIUS) / 2

    // LLM별 Min-Max 정규화: (value - min) / (max - min)
    const normalized = (rate - min) / (max - min)

    // 최소값 → MIN_RADIUS, 최대값 → MAX_RADIUS
    return MIN_RADIUS + normalized * (MAX_RADIUS - MIN_RADIUS)
  }

  // 시간 슬롯을 시간 문자열로 변환
  const getTimeLabel = (slot: number): string => {
    if (timeMode === 'hourly') {
      return `${slot}시 ~ ${slot + 1}시`
    } else {
      const hour = Math.floor(slot / 6)
      const minuteStart = (slot % 6) * 10
      const minuteEnd = minuteStart + 10
      if (minuteEnd === 60) {
        return `${hour}:${minuteStart.toString().padStart(2, '0')} ~ ${hour + 1}:00`
      }
      return `${hour}:${minuteStart.toString().padStart(2, '0')} ~ ${hour}:${minuteEnd.toString().padStart(2, '0')}`
    }
  }

  const llmOrder = ['perplexity', 'chatgpt', 'gemini']
  const chartHeight = 210
  const laneHeight = chartHeight / 3
  const leftPadding = 80
  const rightPadding = 20
  const maxSlot = timeMode === 'hourly' ? 24 : 144
  const timeLabels = timeMode === 'hourly' ? HOURLY_LABELS : MINUTE_LABELS

  return (
    <TooltipProvider>
      <Card className={cn('glass-card overflow-hidden animate-fade-in-up', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
            <Tabs value={timeMode} onValueChange={(v) => setTimeMode(v as TimeMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="hourly" className="text-xs px-3 h-7">시간</TabsTrigger>
                <TabsTrigger value="tenMinute" className="text-xs px-3 h-7">10분</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="relative" style={{ height: chartHeight + 40 }}>
            {/* Y축 레이블 (LLM 이름) */}
            <div
              className="absolute left-0 top-0 flex flex-col justify-around"
              style={{ height: chartHeight, width: leftPadding - 10 }}
            >
              {llmOrder.map((llm) => (
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
                  fillOpacity={0.03}
                  className="dark:fill-opacity-05"
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

            {/* 버블 렌더링 */}
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

                const xPercent = (bubble.timeSlot / maxSlot) * 100
                const yCenter = (llmIndex + 0.5) * laneHeight
                const radius = getBubbleRadius(bubble.citationRate, bubble.llm)

                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute rounded-full cursor-pointer data-point-highlight transition-all duration-200"
                        style={{
                          left: `${xPercent}%`,
                          top: yCenter,
                          width: radius * 2,
                          height: radius * 2,
                          backgroundColor: LLM_CONFIG[bubble.llm].colorLight,
                          transform: `translate(-50%, -50%)`,
                          mixBlendMode: 'multiply',
                          color: LLM_CONFIG[bubble.llm].color,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-sm glass-card">
                      <div className="font-medium">{LLM_CONFIG[bubble.llm].label}</div>
                      <div className="text-muted-foreground">{getTimeLabel(bubble.timeSlot)}</div>
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

            {/* X축 레이블 */}
            <div
              className="absolute flex justify-between"
              style={{
                left: leftPadding,
                top: chartHeight + 8,
                width: `calc(100% - ${leftPadding + rightPadding}px)`
              }}
            >
              {timeLabels.map((label, idx) => (
                <span
                  key={idx}
                  className="text-xs text-muted-foreground"
                  style={{
                    transform: idx === timeLabels.length - 1 ? 'translateX(-50%)' : idx === 0 ? 'translateX(0)' : 'translateX(-50%)'
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* 범례 */}
          <div className="flex items-center justify-end gap-4 mt-4 text-xs text-muted-foreground">
            <span>버블 크기 = LLM별 상대 인용률</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              <span>최소</span>
            </div>
            <span>~</span>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-muted-foreground/30" />
              <span>최대</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
