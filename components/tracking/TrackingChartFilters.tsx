'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, Heart } from 'lucide-react'
import type { AggregationType } from '@/hooks/useTrackingChartData'

type ChartView = 'basic' | 'sentiment'
type DateRange = '7days' | '30days' | 'all'

interface TrackingChartFiltersProps {
  chartView: ChartView
  onChartViewChange: (value: ChartView) => void
  aggregation: AggregationType
  onAggregationChange: (value: AggregationType) => void
  dateRange: DateRange
  onDateRangeChange: (value: DateRange) => void
}

/**
 * 트래킹 차트 필터 컨트롤
 * 차트 뷰, 집계 단위, 기간 필터를 제공
 */
export function TrackingChartFilters({
  chartView,
  onChartViewChange,
  aggregation,
  onAggregationChange,
  dateRange,
  onDateRangeChange,
}: TrackingChartFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 차트 뷰 선택 */}
      <Tabs
        value={chartView}
        onValueChange={(value) => onChartViewChange(value as ChartView)}
      >
        <TabsList className="grid grid-cols-2 w-auto">
          <TabsTrigger value="basic" className="flex items-center gap-1 px-3">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">기본</span>
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="flex items-center gap-1 px-3">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">감성</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 집계 단위 */}
      <Select
        value={aggregation}
        onValueChange={(value) => onAggregationChange(value as AggregationType)}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">일별</SelectItem>
          <SelectItem value="weekly">주별</SelectItem>
          <SelectItem value="monthly">월별</SelectItem>
        </SelectContent>
      </Select>

      {/* 기간 필터 */}
      <Select
        value={dateRange}
        onValueChange={(value) => onDateRangeChange(value as DateRange)}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7days">최근 7일</SelectItem>
          <SelectItem value="30days">최근 30일</SelectItem>
          <SelectItem value="all">전체</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export type { ChartView, DateRange }
