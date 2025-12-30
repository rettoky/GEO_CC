/**
 * Tracking Components
 * 트래킹 관련 시각화 컴포넌트 모음
 */

import dynamic from 'next/dynamic'
import { ChartSkeleton } from '@/components/ui/chart-skeleton'

// 정적 exports (가벼운 컴포넌트들)
export { DrilldownModal } from './DrilldownModal'
export { TrackingChartFilters } from './TrackingChartFilters'
export { TrackingSectionHeader } from './TrackingSectionHeader'
export {
  NoSectionSelected,
  NoTrackingData,
  TrackingError,
} from './TrackingEmptyStates'

// Dynamic exports (무거운 차트 컴포넌트들)
// Recharts 라이브러리를 사용하는 차트들은 동적으로 로드
export const BubbleFlowChart = dynamic(
  () => import('./BubbleFlowChart').then(mod => ({ default: mod.BubbleFlowChart })),
  {
    loading: () => <ChartSkeleton title description />,
    ssr: false, // Recharts는 window 객체 필요
  }
)

export const CalendarHeatmap = dynamic(
  () => import('./CalendarHeatmap').then(mod => ({ default: mod.CalendarHeatmap })),
  {
    loading: () => <ChartSkeleton title />,
    ssr: false,
  }
)

export const SentimentTrackingDashboard = dynamic(
  () => import('./SentimentTracking').then(mod => ({ default: mod.SentimentTrackingDashboard })),
  {
    loading: () => <ChartSkeleton title description />,
    ssr: false,
  }
)

export const TrackingLLMChart = dynamic(
  () => import('./TrackingLLMChart').then(mod => ({ default: mod.TrackingLLMChart })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
)

export const TrackingLLMChartsGrid = dynamic(
  () => import('./TrackingLLMChartsGrid').then(mod => ({ default: mod.TrackingLLMChartsGrid })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
)

// 개별 Sentiment 차트들도 export (필요시 사용)
export {
  SentimentScoreChart,
  SentimentDistributionChart,
  SentimentSummaryChart,
} from './SentimentTracking'
