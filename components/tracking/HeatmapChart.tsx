'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { LLMType } from '@/lib/supabase/types'
import { calculateHeatmapColor, LLM_COLORS } from '@/lib/types/visualization'

const LLM_LABELS: Record<LLMType, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
}

interface HeatmapDataPoint {
  date: string
  llm: LLMType
  value: number | null
  analysisIds?: string[]
}

interface HeatmapChartProps {
  /** 트래킹 데이터 (날짜별 LLM 인용률) */
  data: Array<{
    date: string
    perplexity: number | null
    chatgpt: number | null
    gemini: number | null
    claude: number | null
    analysisIds?: string[]
  }>
  /** 메트릭 종류 */
  metric?: 'citationRate' | 'brandExposure'
  /** 제목 */
  title?: string
  /** 설명 */
  description?: string
  /** 셀 클릭 이벤트 */
  onCellClick?: (point: HeatmapDataPoint) => void
  /** 카드 클래스 */
  className?: string
}

/**
 * 히트맵 차트 컴포넌트
 * X축: 날짜, Y축: LLM 종류
 * 색상: 인용률에 따른 그라데이션 (빨강 → 노랑 → 녹색)
 */
export function HeatmapChart({
  data,
  metric = 'citationRate',
  title = 'LLM별 인용율 히트맵',
  description = '날짜와 LLM에 따른 인용율을 색상으로 표시합니다',
  onCellClick,
  className,
}: HeatmapChartProps) {
  const [hoveredCell, setHoveredCell] = useState<{ date: string; llm: LLMType } | null>(null)

  // 데이터를 히트맵 포인트로 변환
  const heatmapData = useMemo(() => {
    const llms: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']
    const points: HeatmapDataPoint[] = []

    for (const row of data) {
      for (const llm of llms) {
        points.push({
          date: row.date,
          llm,
          value: row[llm],
          analysisIds: row.analysisIds,
        })
      }
    }

    return points
  }, [data])

  // 날짜 목록
  const dates = useMemo(() => {
    return Array.from(new Set(data.map(d => d.date)))
  }, [data])

  // LLM 목록
  const llms: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']

  // 셀 크기 계산
  const cellWidth = Math.max(32, Math.min(60, 500 / dates.length))
  const cellHeight = 40

  // 값에 따른 배경색
  const getCellColor = (value: number | null): string => {
    if (value === null) return 'hsl(var(--muted))'
    return calculateHeatmapColor(value)
  }

  // 값에 따른 텍스트색
  const getTextColor = (value: number | null): string => {
    if (value === null) return 'hsl(var(--muted-foreground))'
    // 밝은 배경(노란색 계열)에서는 어두운 텍스트
    if (value > 30 && value < 70) return '#000'
    return '#fff'
  }

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
    <TooltipProvider>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {title}
            <Badge variant="outline" className="text-xs font-normal">
              {dates.length}일 × {llms.length} LLM
            </Badge>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="pb-4">
          {/* 컬러 범례 */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <span className="text-xs text-muted-foreground">0%</span>
            <div className="flex h-3 w-24 rounded overflow-hidden">
              <div className="flex-1" style={{ backgroundColor: calculateHeatmapColor(0) }} />
              <div className="flex-1" style={{ backgroundColor: calculateHeatmapColor(25) }} />
              <div className="flex-1" style={{ backgroundColor: calculateHeatmapColor(50) }} />
              <div className="flex-1" style={{ backgroundColor: calculateHeatmapColor(75) }} />
              <div className="flex-1" style={{ backgroundColor: calculateHeatmapColor(100) }} />
            </div>
            <span className="text-xs text-muted-foreground">100%</span>
          </div>

          {/* 히트맵 그리드 */}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* 헤더 (날짜) */}
              <div className="flex">
                <div className="w-24 shrink-0" /> {/* LLM 라벨 공간 */}
                {dates.map((date) => (
                  <div
                    key={date}
                    className="text-center text-xs text-muted-foreground shrink-0"
                    style={{ width: cellWidth }}
                  >
                    {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </div>
                ))}
              </div>

              {/* 행 (LLM별) */}
              {llms.map((llm) => (
                <div key={llm} className="flex mt-1">
                  {/* LLM 라벨 */}
                  <div className="w-24 shrink-0 flex items-center gap-2 pr-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: LLM_COLORS[llm] }}
                    />
                    <span className="text-xs font-medium truncate">
                      {LLM_LABELS[llm]}
                    </span>
                  </div>

                  {/* 셀들 */}
                  {dates.map((date) => {
                    const point = heatmapData.find(p => p.date === date && p.llm === llm)
                    const value = point?.value ?? null
                    const isHovered = hoveredCell?.date === date && hoveredCell?.llm === llm

                    return (
                      <Tooltip key={`${date}-${llm}`}>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              'shrink-0 rounded-sm transition-all duration-150 flex items-center justify-center',
                              'border border-transparent hover:border-foreground/30',
                              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                              isHovered && 'ring-2 ring-primary ring-offset-1',
                              onCellClick && 'cursor-pointer'
                            )}
                            style={{
                              width: cellWidth - 2,
                              height: cellHeight - 2,
                              backgroundColor: getCellColor(value),
                              color: getTextColor(value),
                            }}
                            onMouseEnter={() => setHoveredCell({ date, llm })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => point && onCellClick?.(point)}
                          >
                            <span className="text-xs font-medium">
                              {value !== null ? `${Math.round(value)}` : '-'}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <div className="font-medium">{LLM_LABELS[llm]}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(date).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="text-sm">
                              {value !== null ? (
                                <span className="font-medium">인용률: {value}%</span>
                              ) : (
                                <span className="text-muted-foreground">데이터 없음</span>
                              )}
                            </div>
                            {onCellClick && value !== null && (
                              <div className="text-xs text-muted-foreground">
                                클릭하여 상세 보기
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
