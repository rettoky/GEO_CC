'use client'

import type { TrackingSection } from '@/lib/supabase/types'
import { TrackingChartFilters, type ChartView, type DateRange } from './TrackingChartFilters'
import type { AggregationType } from '@/hooks/useTrackingChartData'

interface TrackingSectionHeaderProps {
  section: TrackingSection | undefined
  analysesCount: number
  chartView: ChartView
  onChartViewChange: (value: ChartView) => void
  aggregation: AggregationType
  onAggregationChange: (value: AggregationType) => void
  dateRange: DateRange
  onDateRangeChange: (value: DateRange) => void
}

/**
 * 트래킹 섹션 헤더
 * 섹션 정보와 필터 컨트롤을 표시
 */
export function TrackingSectionHeader({
  section,
  analysesCount,
  chartView,
  onChartViewChange,
  aggregation,
  onAggregationChange,
  dateRange,
  onDateRangeChange,
}: TrackingSectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        {section && (
          <>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: section.color }}
            />
            <h2 className="text-xl font-semibold">{section.name}</h2>
            <span className="text-sm text-muted-foreground">
              ({analysesCount}개 분석)
            </span>
          </>
        )}
      </div>
      <TrackingChartFilters
        chartView={chartView}
        onChartViewChange={onChartViewChange}
        aggregation={aggregation}
        onAggregationChange={onAggregationChange}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />
    </div>
  )
}
