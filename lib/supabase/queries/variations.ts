/**
 * Query Variations Queries
 * AI가 생성한 쿼리 변형 CRUD 함수
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  QueryVariation,
  CreateQueryVariationInput,
  GenerationMethod,
  VariationType,
} from '@/types/queryVariations'

/**
 * 특정 분석에 속한 모든 쿼리 변형 조회
 */
export async function getQueryVariationsByAnalysisId(
  supabase: SupabaseClient,
  analysisId: string
): Promise<QueryVariation[]> {
  const { data, error } = await supabase
    .from('query_variations')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 단일 쿼리 변형 조회
 */
export async function getQueryVariationById(
  supabase: SupabaseClient,
  id: string
): Promise<QueryVariation | null> {
  const { data, error } = await supabase
    .from('query_variations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * 쿼리 변형 생성 (단일)
 */
export async function createQueryVariation(
  supabase: SupabaseClient,
  input: CreateQueryVariationInput
): Promise<QueryVariation> {
  const { data, error } = await supabase
    .from('query_variations')
    .insert({
      analysis_id: input.analysis_id,
      base_query: input.base_query,
      variation: input.variation,
      variation_type: input.variation_type || null,
      generation_method: input.generation_method || 'ai',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 쿼리 변형 대량 생성
 */
export async function createQueryVariationsBulk(
  supabase: SupabaseClient,
  inputs: CreateQueryVariationInput[]
): Promise<QueryVariation[]> {
  const { data, error } = await supabase
    .from('query_variations')
    .insert(
      inputs.map((input) => ({
        analysis_id: input.analysis_id,
        base_query: input.base_query,
        variation: input.variation,
        variation_type: input.variation_type || null,
        generation_method: input.generation_method || 'ai',
      }))
    )
    .select()

  if (error) throw error
  return data || []
}

/**
 * 특정 변형 타입별 조회
 */
export async function getQueryVariationsByType(
  supabase: SupabaseClient,
  analysisId: string,
  variationType: VariationType
): Promise<QueryVariation[]> {
  const { data, error } = await supabase
    .from('query_variations')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('variation_type', variationType)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 생성 방법별 조회 (AI vs Manual)
 */
export async function getQueryVariationsByMethod(
  supabase: SupabaseClient,
  analysisId: string,
  method: GenerationMethod
): Promise<QueryVariation[]> {
  const { data, error } = await supabase
    .from('query_variations')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('generation_method', method)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 쿼리 변형 삭제
 */
export async function deleteQueryVariation(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('query_variations').delete().eq('id', id)

  if (error) throw error
}

/**
 * 특정 분석의 모든 쿼리 변형 삭제
 */
export async function deleteAllQueryVariations(
  supabase: SupabaseClient,
  analysisId: string
): Promise<void> {
  const { error } = await supabase
    .from('query_variations')
    .delete()
    .eq('analysis_id', analysisId)

  if (error) throw error
}

/**
 * 쿼리 변형 통계 조회
 */
export async function getQueryVariationStats(
  supabase: SupabaseClient,
  analysisId: string
): Promise<{
  total: number
  byType: Record<string, number>
  byMethod: Record<string, number>
}> {
  const variations = await getQueryVariationsByAnalysisId(supabase, analysisId)

  const byType: Record<string, number> = {}
  const byMethod: Record<string, number> = {}

  variations.forEach((v) => {
    const type = v.variation_type || 'unknown'
    const method = v.generation_method

    byType[type] = (byType[type] || 0) + 1
    byMethod[method] = (byMethod[method] || 0) + 1
  })

  return {
    total: variations.length,
    byType,
    byMethod,
  }
}
