'use client'

import { useState, useMemo, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useTrackingSection } from '@/contexts/TrackingSectionContext'
import { useTrackingAnalyses } from '@/hooks/useTrackingAnalyses'
import { useTrackingChartData, type AggregationType } from '@/hooks/useTrackingChartData'
import {
  BubbleFlowChart,
  CalendarHeatmap,
  DrilldownModal,
  SentimentTrackingDashboard,
  TrackingLLMChartsGrid,
  TrackingSectionHeader,
} from '@/components/tracking'
import {
  NoSectionSelected,
  NoTrackingData,
  TrackingError,
} from '@/components/tracking/TrackingEmptyStates'
import type { ChartView, DateRange } from '@/components/tracking/TrackingChartFilters'
import type { LLMType } from '@/lib/supabase/types'

export function TrackingTab() {
  const { selectedSectionId, sections } = useTrackingSection()
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [chartView, setChartView] = useState<ChartView>('basic')
  const [aggregation, setAggregation] = useState<AggregationType>('daily')
  const [drilldown, setDrilldown] = useState<{
    isOpen: boolean
    date?: string
    llm?: LLMType
  }>({ isOpen: false })

  const { trackingData, analyses, loading, error } = useTrackingAnalyses({
    sectionId: selectedSectionId,
    dateRange,
  })

  const selectedSection = sections.find(s => s.id === selectedSectionId)

  // 차트 데이터 가공
  const { chartData, yAxisDomains, originalDataCount, aggregatedDataCount } = useTrackingChartData(
    trackingData,
    aggregation
  )

  // 드릴다운용 분석 데이터 필터링
  const drilldownAnalyses = useMemo(() => {
    if (!drilldown.date) return []

    return analyses
      .filter(a => {
        const analysisDate = new Date(a.created_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\. /g, '-').replace('.', '')
        const targetDate = new Date(drilldown.date!).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\. /g, '-').replace('.', '')
        return analysisDate === targetDate
      })
      .filter(a => a.summary !== null)
      .map(a => ({
        id: a.id,
        query: a.query_text,
        results: a.results,
        summary: a.summary!,
        createdAt: a.created_at,
      }))
  }, [analyses, drilldown.date])

  const handleChartViewChange = useCallback((value: ChartView) => {
    setChartView(value)
  }, [])

  const handleAggregationChange = useCallback((value: AggregationType) => {
    setAggregation(value)
  }, [])

  const handleDateRangeChange = useCallback((value: DateRange) => {
    setDateRange(value)
  }, [])

  const handleCloseDrilldown = useCallback(() => {
    setDrilldown({ isOpen: false })
  }, [])

  // 섹션이 선택되지 않은 경우
  if (!selectedSectionId) {
    return <NoSectionSelected />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return <TrackingError error={error} />
  }

  if (trackingData.length === 0) {
    return <NoTrackingData sectionName={selectedSection?.name} />
  }

  return (
    <div className="space-y-6">
      {/* 헤더: 섹션 정보 및 필터 */}
      <TrackingSectionHeader
        section={selectedSection}
        analysesCount={analyses.length}
        chartView={chartView}
        onChartViewChange={handleChartViewChange}
        aggregation={aggregation}
        onAggregationChange={handleAggregationChange}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />

      {/* 기본 차트 뷰 */}
      {chartView === 'basic' && (
        <>
          {/* LLM별 인용율 추세 - 3열 분할 */}
          <TrackingLLMChartsGrid
            chartData={chartData}
            yAxisDomains={yAxisDomains}
            originalDataCount={originalDataCount}
            aggregatedDataCount={aggregatedDataCount}
          />

          {/* 버블 플로우 + 캘린더 히트맵 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 시간대별 버블 플로우 차트 */}
            <BubbleFlowChart
              analyses={analyses}
              title="시간대별 분석 패턴"
              description="LLM별 시간대에 따른 인용률 분포"
            />

            {/* Calendar Heatmap */}
            <CalendarHeatmap
              data={trackingData}
              title="분석 활동 캘린더"
            />
          </div>
        </>
      )}

      {/* 감성 분석 뷰 */}
      {chartView === 'sentiment' && (
        <SentimentTrackingDashboard data={chartData} />
      )}

      {/* 드릴다운 모달 */}
      <DrilldownModal
        isOpen={drilldown.isOpen}
        onClose={handleCloseDrilldown}
        date={drilldown.date}
        llm={drilldown.llm}
        analyses={drilldownAnalyses}
      />
    </div>
  )
}
