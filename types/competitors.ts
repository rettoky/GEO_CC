/**
 * Competitors Types
 * 경쟁사 분석 관련 타입 정의 (수동/자동 감지)
 */

export type DetectionMethod = 'manual' | 'auto'

/**
 * LLM별 경쟁사 출현 횟수
 */
export interface LLMAppearances {
  perplexity?: number
  chatgpt?: number
  gemini?: number
  claude?: number
}

/**
 * 경쟁사 엔티티
 */
export interface Competitor {
  id: string
  analysis_id: string
  domain: string
  brand_name: string | null
  detection_method: DetectionMethod
  citation_count: number
  citation_rate: number | null
  confidence_score: number | null
  llm_appearances: LLMAppearances
  is_confirmed: boolean
  created_at: string
}

/**
 * 경쟁사 생성 입력
 */
export interface CreateCompetitorInput {
  analysis_id: string
  domain: string
  brand_name?: string
  detection_method: DetectionMethod
  citation_count?: number
  citation_rate?: number
  confidence_score?: number
  llm_appearances?: LLMAppearances
  is_confirmed?: boolean
}

/**
 * 자동 감지된 경쟁사 점수 (알고리즘 출력)
 */
export interface CompetitorScore {
  domain: string
  citationCount: number
  llmDiversity: number // 1-4 (몇 개 LLM이 언급했는지)
  avgPosition: number
  competitorScore: number // 0-100
  confidenceScore: number // 0-1
}

/**
 * 도메인 데이터 (자동 감지 알고리즘 내부 사용)
 */
export interface DomainData {
  count: number
  llms: Set<string>
  positions: number[]
}
