/**
 * Sentiment Analysis Types
 * 브랜드 언급에 대한 감성 분석 관련 타입 정의
 */

import type { LLMType } from '@/lib/supabase/types'

/**
 * 감성 유형
 * - positive: 긍정적 언급 (추천, 칭찬, 만족 등)
 * - negative: 부정적 언급 (비판, 불만, 경고 등)
 * - neutral: 중립적 언급 (단순 정보 제공, 비교 등)
 */
export type SentimentType = 'positive' | 'negative' | 'neutral'

/**
 * 개별 감성 분석 결과
 */
export interface SentimentAnalysis {
  /** 감성 유형 */
  sentiment: SentimentType
  /** 신뢰도 (0-1, 1이 가장 높음) */
  confidence: number
  /** 감성 판단 이유 */
  reason: string
}

/**
 * 감성 분석이 포함된 브랜드 언급
 */
export interface BrandMentionWithSentiment {
  /** 브랜드명 */
  brand: string
  /** 언급된 문맥 (±30자 전후) */
  context: string
  /** 감성 분석 결과 */
  sentiment: SentimentAnalysis
  /** 언급을 감지한 LLM */
  llmSource: LLMType
  /** 원본 텍스트 내 위치 (선택적) */
  position?: {
    start: number
    end: number
  }
}

/**
 * 감성별 브랜드 언급 그룹
 */
export interface SentimentGroupedMentions {
  /** 긍정적 언급 목록 */
  positive: BrandMentionWithSentiment[]
  /** 부정적 언급 목록 */
  negative: BrandMentionWithSentiment[]
  /** 중립적 언급 목록 */
  neutral: BrandMentionWithSentiment[]
}

/**
 * 감성 분석 요약 통계
 */
export interface SentimentSummary {
  /** 전체 분석된 언급 수 */
  totalMentions: number
  /** 긍정 언급 수 */
  positiveCount: number
  /** 부정 언급 수 */
  negativeCount: number
  /** 중립 언급 수 */
  neutralCount: number
  /** 긍정 비율 (0-100) */
  positiveRate: number
  /** 부정 비율 (0-100) */
  negativeRate: number
  /** 평균 신뢰도 */
  avgConfidence: number
  /** 감성 점수 (-100 ~ +100, 높을수록 긍정) */
  sentimentScore: number
}

/**
 * 브랜드별 감성 분석 결과
 */
export interface BrandSentimentAnalysis {
  /** 브랜드명 */
  brand: string
  /** 브랜드 별칭 */
  aliases: string[]
  /** 감성별 그룹화된 언급 */
  mentions: SentimentGroupedMentions
  /** 감성 요약 통계 */
  summary: SentimentSummary
  /** LLM별 감성 분포 */
  byLLM: Record<LLMType, SentimentSummary | null>
}

/**
 * 전체 감성 분석 응답
 */
export interface SentimentAnalysisResponse {
  /** 성공 여부 */
  success: boolean
  /** 내 브랜드 감성 분석 */
  myBrand: BrandSentimentAnalysis | null
  /** 경쟁사 감성 분석 */
  competitors: BrandSentimentAnalysis[]
  /** 분석 메타데이터 */
  metadata: {
    /** 분석에 사용된 LLM 수 */
    analyzedLLMs: number
    /** 전체 분석된 언급 수 */
    totalMentionsAnalyzed: number
    /** 분석 소요 시간 (ms) */
    analysisTime: number
  }
  /** 에러 정보 (실패 시) */
  error?: {
    message: string
    code?: string
  }
}

/**
 * 감성 색상 매핑
 */
export const SENTIMENT_COLORS: Record<SentimentType, { bg: string; text: string; border: string }> = {
  positive: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  negative: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  neutral: {
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
}

/**
 * 감성 아이콘 매핑 (Lucide 아이콘명)
 */
export const SENTIMENT_ICONS: Record<SentimentType, string> = {
  positive: 'ThumbsUp',
  negative: 'ThumbsDown',
  neutral: 'Minus',
}

/**
 * 감성 라벨
 */
export const SENTIMENT_LABELS: Record<SentimentType, { ko: string; en: string }> = {
  positive: { ko: '긍정', en: 'Positive' },
  negative: { ko: '부정', en: 'Negative' },
  neutral: { ko: '중립', en: 'Neutral' },
}
