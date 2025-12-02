/**
 * Query Variations Types
 * AI가 생성한 쿼리 변형 관련 타입 정의
 */

export type VariationType = 'demographic' | 'informational' | 'comparison' | 'recommendation'
export type GenerationMethod = 'ai' | 'manual'

/**
 * 쿼리 변형 엔티티
 */
export interface QueryVariation {
  id: string
  analysis_id: string
  base_query: string
  variation: string
  variation_type: VariationType | null
  generation_method: GenerationMethod
  created_at: string
}

/**
 * 쿼리 변형 생성 입력
 */
export interface CreateQueryVariationInput {
  analysis_id: string
  base_query: string
  variation: string
  variation_type?: VariationType
  generation_method?: GenerationMethod
}

/**
 * GPT-4o가 생성한 변형 (AI 응답 형식)
 */
export interface GeneratedVariation {
  query: string
  type: VariationType
  reasoning: string
}

/**
 * 쿼리 변형 생성 결과
 */
export interface VariationGenerationResult {
  variations: GeneratedVariation[]
  modelUsed: string
  tokensUsed: number
  rawResponse: string
}

/**
 * 쿼리 변형 생성 입력 파라미터
 */
export interface VariationGenerationInput {
  baseQuery: string
  productCategory?: string
  productName?: string
  count: number // 5-30
}
