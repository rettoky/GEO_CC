/**
 * Visualization Types
 * 히트맵, 레이더 차트, 드릴다운 등 시각화 관련 타입 정의
 */

import type { LLMType, AnalysisResults, AnalysisSummary } from '@/lib/supabase/types'

/**
 * ========================================
 * 히트맵 (Heatmap) 관련 타입
 * ========================================
 */

/**
 * 히트맵 데이터 포인트
 * X축: 날짜, Y축: LLM
 */
export interface HeatmapDataPoint {
  /** 날짜 (YYYY-MM-DD) */
  date: string
  /** LLM 종류 */
  llm: LLMType
  /** 측정값 (인용률, 브랜드 노출률 등, 0-100) */
  value: number
  /** 색상 (hex 또는 tailwind 클래스) */
  color: string
  /** 원본 분석 ID (드릴다운용) */
  analysisId?: string
  /** 추가 메타데이터 */
  metadata?: {
    citationCount?: number
    totalSources?: number
    brandMentioned?: boolean
  }
}

/**
 * 히트맵 전체 데이터
 */
export interface HeatmapData {
  /** 데이터 포인트 배열 */
  data: HeatmapDataPoint[]
  /** X축 (날짜) 목록 */
  dates: string[]
  /** Y축 (LLM) 목록 */
  llms: LLMType[]
  /** 값 범위 */
  valueRange: {
    min: number
    max: number
  }
  /** 메트릭 종류 */
  metricType: 'citationRate' | 'brandExposure' | 'mentionShare'
}

/**
 * 히트맵 색상 스케일 설정
 */
export interface HeatmapColorScale {
  /** 최소값 색상 */
  minColor: string
  /** 중간값 색상 */
  midColor: string
  /** 최대값 색상 */
  maxColor: string
  /** 데이터 없음 색상 */
  noDataColor: string
}

/**
 * ========================================
 * 레이더 차트 (Radar Chart) 관련 타입
 * ========================================
 */

/**
 * 레이더 차트 데이터 포인트
 */
export interface RadarDataPoint {
  /** 메트릭 이름 */
  metric: string
  /** 메트릭 한글명 */
  metricLabel: string
  /** 측정값 (0-100으로 정규화) */
  value: number
  /** 최대값 (기본 100) */
  fullMark: number
}

/**
 * 레이더 차트 시리즈 (여러 날짜/LLM 비교용)
 */
export interface RadarSeries {
  /** 시리즈 이름 (날짜 또는 LLM) */
  name: string
  /** 시리즈 색상 */
  color: string
  /** 데이터 포인트 */
  data: RadarDataPoint[]
}

/**
 * 레이더 차트 전체 데이터
 */
export interface RadarChartData {
  /** 메트릭 목록 */
  metrics: string[]
  /** 시리즈 데이터 */
  series: RadarSeries[]
  /** 비교 모드 */
  compareMode: 'date' | 'llm'
}

/**
 * 레이더 차트 메트릭 정의
 */
export const RADAR_METRICS = {
  citationRate: { label: '인용률', fullMark: 100 },
  brandExposure: { label: '브랜드 노출', fullMark: 100 },
  mentionShare: { label: '언급 점유율', fullMark: 100 },
  responseQuality: { label: '응답 품질', fullMark: 100 },
  competitorGap: { label: '경쟁사 대비', fullMark: 100 },
  consistency: { label: '일관성', fullMark: 100 },
} as const

export type RadarMetricKey = keyof typeof RADAR_METRICS

/**
 * ========================================
 * 드릴다운 (Drilldown) 관련 타입
 * ========================================
 */

/**
 * 드릴다운 데이터
 */
export interface DrilldownData {
  /** 부모 데이터 포인트 식별자 */
  parentId: string
  /** 드릴다운 유형 */
  type: 'date' | 'llm' | 'query'
  /** 상세 분석 결과 목록 */
  analyses: DrilldownAnalysis[]
  /** 집계 메타데이터 */
  aggregation: {
    totalAnalyses: number
    avgCitationRate: number
    avgBrandExposure: number
    dateRange?: { start: string; end: string }
  }
}

/**
 * 드릴다운 개별 분석
 */
export interface DrilldownAnalysis {
  /** 분석 ID */
  id: string
  /** 쿼리 텍스트 */
  query: string
  /** 분석 결과 */
  results: AnalysisResults
  /** 분석 요약 */
  summary: AnalysisSummary
  /** 생성 시간 */
  createdAt: string
  /** 해당 LLM (드릴다운 타입이 llm인 경우) */
  llm?: LLMType
}

/**
 * 드릴다운 상태
 */
export interface DrilldownState {
  /** 드릴다운 활성화 여부 */
  isOpen: boolean
  /** 선택된 데이터 포인트 */
  selectedPoint: HeatmapDataPoint | null
  /** 드릴다운 데이터 */
  data: DrilldownData | null
  /** 로딩 상태 */
  isLoading: boolean
}

/**
 * ========================================
 * 트래킹 시각화 공통 타입
 * ========================================
 */

/**
 * 시각화 차트 종류
 */
export type ChartType = 'line' | 'bar' | 'heatmap' | 'radar'

/**
 * 트래킹 데이터 (기존 TrackingData 확장)
 */
export interface TrackingVisualizationData {
  /** 날짜 */
  date: string
  /** 전체 인용률 */
  citationRate: number
  /** 브랜드 노출률 */
  brandExposure: number
  /** 언급 점유율 */
  mentionShare?: number
  /** LLM별 인용률 */
  byLLM: {
    chatgpt: number | null
    claude: number | null
    gemini: number | null
    perplexity: number | null
  }
  /** 분석 ID 목록 (드릴다운용) */
  analysisIds: string[]
  /** 분석 수 */
  analysisCount: number
}

/**
 * 차트 설정
 */
export interface ChartConfig {
  /** 차트 종류 */
  type: ChartType
  /** 표시할 메트릭 */
  metric: 'citationRate' | 'brandExposure' | 'mentionShare'
  /** 날짜 범위 필터 */
  dateRange: '7days' | '30days' | '90days' | 'all'
  /** LLM 필터 (null이면 전체) */
  llmFilter: LLMType[] | null
  /** 비교 모드 활성화 */
  compareMode: boolean
  /** 애니메이션 활성화 */
  animated: boolean
}

/**
 * ========================================
 * 색상 유틸리티
 * ========================================
 */

/**
 * 값에 따른 히트맵 색상 계산
 * @param value 0-100 사이의 값
 * @returns hex 색상
 */
export function calculateHeatmapColor(value: number): string {
  // 0: 빨강, 50: 노랑, 100: 녹색
  if (value < 0) value = 0
  if (value > 100) value = 100

  if (value < 50) {
    // 빨강 → 노랑
    const ratio = value / 50
    const r = 239
    const g = Math.round(68 + (189 * ratio))
    const b = Math.round(68 + (0 * ratio))
    return `rgb(${r}, ${g}, ${b})`
  } else {
    // 노랑 → 녹색
    const ratio = (value - 50) / 50
    const r = Math.round(234 - (200 * ratio))
    const g = Math.round(179 - (72 * ratio))
    const b = Math.round(8 + (56 * ratio))
    return `rgb(${r}, ${g}, ${b})`
  }
}

/**
 * LLM별 색상
 */
export const LLM_COLORS: Record<LLMType, string> = {
  chatgpt: '#10a37f',
  claude: '#d97757',
  gemini: '#4285f4',
  perplexity: '#1a73e8',
}

/**
 * 차트 기본 색상 팔레트
 */
export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#6b7280',
} as const
