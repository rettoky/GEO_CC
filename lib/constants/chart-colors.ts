/**
 * Chart Color System
 * 차트 및 시각화 컴포넌트용 색상 시스템
 */

// LLM별 브랜드 색상 (HEX)
export const LLM_COLORS = {
  perplexity: '#8b5cf6', // 보라색
  chatgpt: '#22c55e',    // 초록색
  gemini: '#3b82f6',     // 파란색
  claude: '#f97316',     // 주황색
} as const

// LLM별 그라디언트 색상
export const LLM_GRADIENTS = {
  perplexity: { start: '#8b5cf6', end: '#a78bfa' },
  chatgpt: { start: '#22c55e', end: '#4ade80' },
  gemini: { start: '#3b82f6', end: '#60a5fa' },
  claude: { start: '#f97316', end: '#fb923c' },
} as const

// 감성 분석 색상
export const SENTIMENT_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#94a3b8',
} as const

// 브랜드 경쟁사 팔레트 (8색)
export const BRAND_PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#22c55e', // green
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#64748b', // slate
] as const

// 차트 기본 색상
export const CHART_DEFAULTS = {
  grid: '#e5e7eb',
  gridDark: '#374151',
  axis: '#6b7280',
  axisDark: '#9ca3af',
  tooltip: {
    bg: 'rgba(255, 255, 255, 0.95)',
    bgDark: 'rgba(30, 41, 59, 0.95)',
    border: '#e5e7eb',
    borderDark: '#475569',
  },
} as const

// 타입 export
export type LLMType = keyof typeof LLM_COLORS
export type SentimentType = keyof typeof SENTIMENT_COLORS
