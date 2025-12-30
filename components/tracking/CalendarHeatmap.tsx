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
import type { TrackingData } from '@/hooks/useTrackingAnalyses'

interface CalendarHeatmapProps {
  data: TrackingData[]
  title?: string
  description?: string
  className?: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

// GitHub 스타일 그린 계열 색상 (5단계)
const COLOR_LEVELS = {
  light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
}

// Min-Max 정규화 기반 색상 계산
function getIntensityColor(
  value: number | null,
  minRate: number,
  maxRate: number,
  isDark: boolean = false
): string {
  const colors = isDark ? COLOR_LEVELS.dark : COLOR_LEVELS.light

  if (value === null || value === 0) return colors[0]

  // 데이터 범위가 매우 좁으면 중간 색상
  if (maxRate - minRate < 0.1) return colors[2]

  // Min-Max 정규화: 0-1 범위로 변환
  const normalized = (value - minRate) / (maxRate - minRate)

  // 0-1을 1-4 레벨로 매핑 (0은 데이터 없음용)
  const level = Math.min(4, Math.max(1, Math.ceil(normalized * 4)))

  return colors[level]
}

// 다크모드용 CSS 변수
const darkModeColors = `
  .dark {
    --calendar-empty: #161b22;
  }
`

/**
 * GitHub 스타일 캘린더 히트맵
 */
export function CalendarHeatmap({
  data,
  title = '분석 활동 캘린더',
  description = '날짜별 평균 인용률을 색상 강도로 표시합니다',
  className,
}: CalendarHeatmapProps) {
  // 날짜별 데이터 맵 생성
  const dateDataMap = useMemo(() => {
    const map = new Map<string, TrackingData>()
    data.forEach(d => {
      // MM/dd 형식을 올해 날짜로 변환
      const [month, day] = d.date.split('/')
      const year = new Date().getFullYear()
      // 현재 월보다 큰 월이면 작년
      const currentMonth = new Date().getMonth() + 1
      const dataMonth = parseInt(month)
      const actualYear = dataMonth > currentMonth ? year - 1 : year
      const dateStr = `${actualYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      map.set(dateStr, d)
    })
    return map
  }, [data])

  // 캘린더 그리드 생성 (최근 16주) - 월 시작 여부 포함
  const calendarWeeks = useMemo(() => {
    const weeks: Array<{
      days: Array<{ date: Date; dateStr: string; data: TrackingData | null }>
      isMonthStart: boolean
    }> = []
    const today = new Date()

    // 16주 전부터 시작
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 111) // 16주 = 112일
    // 일요일로 조정
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const currentDate = new Date(startDate)
    let lastMonth = -1

    while (currentDate <= today) {
      const week: Array<{ date: Date; dateStr: string; data: TrackingData | null }> = []
      const firstDayMonth = currentDate.getMonth()
      const isMonthStart = firstDayMonth !== lastMonth && lastMonth !== -1

      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0]
        week.push({
          date: new Date(currentDate),
          dateStr,
          data: dateDataMap.get(dateStr) || null,
        })
        currentDate.setDate(currentDate.getDate() + 1)
      }

      weeks.push({ days: week, isMonthStart })
      lastMonth = firstDayMonth
    }

    return weeks
  }, [dateDataMap])

  // 월 레이블 위치 계산 (간격 포함)
  const monthLabels = useMemo(() => {
    const labels: Array<{ month: string; weekIndex: number; gapCount: number }> = []
    let lastMonth = -1
    let gapCount = 0

    calendarWeeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week.days[0].date
      const month = firstDayOfWeek.getMonth()

      if (week.isMonthStart) {
        gapCount++
      }

      if (month !== lastMonth) {
        labels.push({ month: MONTHS[month], weekIndex, gapCount })
        lastMonth = month
      }
    })

    return labels
  }, [calendarWeeks])

  // 통계 계산 (Min-Max 정규화용)
  const stats = useMemo(() => {
    const values = data.map(d => d.citationRate).filter(v => v > 0)
    if (values.length === 0) return { avg: 0, min: 0, max: 0, total: 0 }
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10,
      min: Math.round(Math.min(...values) * 10) / 10,
      max: Math.round(Math.max(...values) * 10) / 10,
      total: data.length,
    }
  }, [data])

  return (
    <TooltipProvider>
      <style>{darkModeColors}</style>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>총 <strong className="text-foreground">{stats.total}</strong>일</span>
              <span>평균 <strong className="text-foreground">{stats.avg}%</strong></span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* 반응형 캘린더 컨테이너 */}
          <div className="w-full">
            {/* 월 레이블 - 간소화 */}
            <div className="flex mb-2 pl-8 gap-1 text-xs text-muted-foreground">
              {monthLabels.filter((_, idx) => idx % 2 === 0 || monthLabels.length <= 4).map(({ month }, idx) => (
                <span key={idx} className="flex-1 text-center font-medium">
                  {month}
                </span>
              ))}
            </div>

            <div className="flex gap-1">
              {/* 요일 레이블 - 축약형 */}
              <div className="flex flex-col gap-[2px] shrink-0">
                {WEEKDAYS.map((day, idx) => (
                  <div
                    key={day}
                    className={cn(
                      "text-[10px] text-muted-foreground aspect-square flex items-center justify-center w-6",
                      idx % 2 === 1 && "text-transparent" // 홀수 행 숨김으로 공간 절약
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 캘린더 그리드 - 반응형 */}
              <div className="flex-1 grid gap-[2px]" style={{
                gridTemplateColumns: `repeat(${calendarWeeks.length}, minmax(0, 1fr))`
              }}>
                {calendarWeeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-[2px]">
                    {week.days.map(({ date, dateStr, data: dayData }) => {
                      const isToday = dateStr === new Date().toISOString().split('T')[0]
                      const isFuture = date > new Date()
                      const citationRate = dayData?.citationRate ?? null

                      return (
                        <Tooltip key={dateStr}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'aspect-square w-full min-w-[12px] max-w-[24px] rounded-sm transition-all cursor-pointer hover:ring-1 hover:ring-primary/50 hover:scale-105',
                                isToday && 'ring-1 ring-primary ring-offset-1',
                                isFuture && 'opacity-30'
                              )}
                              style={{
                                backgroundColor: isFuture
                                  ? 'var(--calendar-empty, #ebedf0)'
                                  : getIntensityColor(citationRate, stats.min, stats.max),
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-sm">
                            <div className="font-medium">
                              {date.toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short',
                              })}
                            </div>
                            {dayData ? (
                              <div className="space-y-1 mt-1">
                                <div>평균 인용률: <strong>{dayData.citationRate}%</strong></div>
                                <div className="text-xs text-muted-foreground">
                                  브랜드 노출: {dayData.brandExposure}%
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">데이터 없음</div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 범례 - 컴팩트 */}
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
              <span>{stats.min}%</span>
              <div className="flex gap-[2px]">
                {COLOR_LEVELS.light.slice(1).map((color, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-sm dark:hidden"
                    style={{ backgroundColor: color }}
                  />
                ))}
                {COLOR_LEVELS.dark.slice(1).map((color, idx) => (
                  <div
                    key={idx}
                    className="w-4 h-4 rounded-sm hidden dark:block"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span>{stats.max}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
