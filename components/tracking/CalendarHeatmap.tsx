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

// 인용률에 따른 색상 (GitHub 스타일 그린 계열)
function getIntensityColor(value: number | null): string {
  if (value === null || value === 0) return 'var(--calendar-empty, #ebedf0)'
  if (value < 10) return 'var(--calendar-l1, #9be9a8)'
  if (value < 25) return 'var(--calendar-l2, #40c463)'
  if (value < 50) return 'var(--calendar-l3, #30a14e)'
  return 'var(--calendar-l4, #216e39)'
}

// 다크모드용 색상
const darkModeColors = `
  .dark {
    --calendar-empty: #161b22;
    --calendar-l1: #0e4429;
    --calendar-l2: #006d32;
    --calendar-l3: #26a641;
    --calendar-l4: #39d353;
  }
`

/**
 * GitHub 스타일 캘린더 히트맵
 */
export function CalendarHeatmap({
  data,
  title = '분석 활동 캘린더',
  description = '날짜별 평균 인용률을 GitHub 스타일로 표시합니다',
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

  // 캘린더 그리드 생성 (최근 16주)
  const calendarWeeks = useMemo(() => {
    const weeks: Array<Array<{ date: Date; dateStr: string; data: TrackingData | null }>> = []
    const today = new Date()

    // 16주 전부터 시작
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 111) // 16주 = 112일
    // 일요일로 조정
    startDate.setDate(startDate.getDate() - startDate.getDay())

    let currentDate = new Date(startDate)

    while (currentDate <= today) {
      const week: Array<{ date: Date; dateStr: string; data: TrackingData | null }> = []

      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0]
        week.push({
          date: new Date(currentDate),
          dateStr,
          data: dateDataMap.get(dateStr) || null,
        })
        currentDate.setDate(currentDate.getDate() + 1)
      }

      weeks.push(week)
    }

    return weeks
  }, [dateDataMap])

  // 월 레이블 위치 계산
  const monthLabels = useMemo(() => {
    const labels: Array<{ month: string; weekIndex: number }> = []
    let lastMonth = -1

    calendarWeeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0].date
      const month = firstDayOfWeek.getMonth()

      if (month !== lastMonth) {
        labels.push({ month: MONTHS[month], weekIndex })
        lastMonth = month
      }
    })

    return labels
  }, [calendarWeeks])

  // 통계 계산
  const stats = useMemo(() => {
    const values = data.map(d => d.citationRate).filter(v => v > 0)
    if (values.length === 0) return { avg: 0, max: 0, total: 0 }
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10,
      max: Math.max(...values),
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
          <div className="overflow-x-auto">
            {/* 월 레이블 */}
            <div className="flex mb-2 ml-12">
              {monthLabels.map(({ month, weekIndex }, idx) => (
                <div
                  key={idx}
                  className="text-sm font-medium text-muted-foreground"
                  style={{
                    marginLeft: idx === 0 ? weekIndex * 32 : (monthLabels[idx].weekIndex - monthLabels[idx - 1].weekIndex - 1) * 32,
                    width: 'auto',
                  }}
                >
                  {month}
                </div>
              ))}
            </div>

            <div className="flex">
              {/* 요일 레이블 */}
              <div className="flex flex-col gap-[4px] mr-2">
                {WEEKDAYS.map((day, idx) => (
                  <div
                    key={day}
                    className="text-sm text-muted-foreground h-[28px] flex items-center justify-end pr-2 w-10"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 캘린더 그리드 */}
              <div className="flex gap-[4px]">
                {calendarWeeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-[4px]">
                    {week.map(({ date, dateStr, data: dayData }) => {
                      const isToday = dateStr === new Date().toISOString().split('T')[0]
                      const isFuture = date > new Date()
                      const citationRate = dayData?.citationRate ?? null

                      return (
                        <Tooltip key={dateStr}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'w-[28px] h-[28px] rounded-md transition-all cursor-pointer hover:ring-2 hover:ring-primary/50 hover:scale-110',
                                isToday && 'ring-2 ring-primary ring-offset-1',
                                isFuture && 'opacity-30'
                              )}
                              style={{
                                backgroundColor: isFuture ? 'var(--calendar-empty, #ebedf0)' : getIntensityColor(citationRate),
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

            {/* 범례 */}
            <div className="flex items-center justify-end gap-3 mt-6 text-sm text-muted-foreground">
              <span>낮음</span>
              <div className="flex gap-[4px]">
                {[0, 5, 15, 35, 60].map((value, idx) => (
                  <div
                    key={idx}
                    className="w-[28px] h-[28px] rounded-md"
                    style={{ backgroundColor: getIntensityColor(value) }}
                  />
                ))}
              </div>
              <span>높음</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
