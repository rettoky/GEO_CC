/**
 * Competitors Queries
 * 경쟁사 분석 CRUD 함수 (수동/자동 감지)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  Competitor,
  CreateCompetitorInput,
  DetectionMethod,
  LLMAppearances,
} from '@/types/competitors'

/**
 * 특정 분석에 속한 모든 경쟁사 조회
 */
export async function getCompetitorsByAnalysisId(
  supabase: SupabaseClient,
  analysisId: string
): Promise<Competitor[]> {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('citation_count', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 단일 경쟁사 조회
 */
export async function getCompetitorById(
  supabase: SupabaseClient,
  id: string
): Promise<Competitor | null> {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * 경쟁사 생성
 */
export async function createCompetitor(
  supabase: SupabaseClient,
  input: CreateCompetitorInput
): Promise<Competitor> {
  const { data, error } = await supabase
    .from('competitors')
    .insert({
      analysis_id: input.analysis_id,
      domain: input.domain,
      brand_name: input.brand_name || null,
      detection_method: input.detection_method,
      citation_count: input.citation_count || 0,
      citation_rate: input.citation_rate || null,
      confidence_score: input.confidence_score || null,
      llm_appearances: input.llm_appearances || {},
      is_confirmed: input.is_confirmed || false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 경쟁사 대량 생성
 */
export async function createCompetitorsBulk(
  supabase: SupabaseClient,
  inputs: CreateCompetitorInput[]
): Promise<Competitor[]> {
  const { data, error } = await supabase
    .from('competitors')
    .insert(
      inputs.map((input) => ({
        analysis_id: input.analysis_id,
        domain: input.domain,
        brand_name: input.brand_name || null,
        detection_method: input.detection_method,
        citation_count: input.citation_count || 0,
        citation_rate: input.citation_rate || null,
        confidence_score: input.confidence_score || null,
        llm_appearances: input.llm_appearances || {},
        is_confirmed: input.is_confirmed || false,
      }))
    )
    .select()

  if (error) throw error
  return data || []
}

/**
 * 경쟁사 정보 업데이트
 */
export async function updateCompetitor(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<Competitor, 'id' | 'analysis_id' | 'created_at'>>
): Promise<Competitor> {
  const { data, error } = await supabase
    .from('competitors')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 경쟁사 확인 상태 업데이트
 */
export async function confirmCompetitor(
  supabase: SupabaseClient,
  id: string,
  isConfirmed: boolean
): Promise<Competitor> {
  return updateCompetitor(supabase, id, { is_confirmed: isConfirmed })
}

/**
 * 경쟁사 삭제
 */
export async function deleteCompetitor(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('competitors').delete().eq('id', id)

  if (error) throw error
}

/**
 * 감지 방법별 조회
 */
export async function getCompetitorsByMethod(
  supabase: SupabaseClient,
  analysisId: string,
  method: DetectionMethod
): Promise<Competitor[]> {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('detection_method', method)
    .order('citation_count', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 확인된 경쟁사만 조회
 */
export async function getConfirmedCompetitors(
  supabase: SupabaseClient,
  analysisId: string
): Promise<Competitor[]> {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('is_confirmed', true)
    .order('citation_count', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 자동 감지 경쟁사 중 미확인 항목 조회
 */
export async function getUnconfirmedAutoCompetitors(
  supabase: SupabaseClient,
  analysisId: string
): Promise<Competitor[]> {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('detection_method', 'auto')
    .eq('is_confirmed', false)
    .order('confidence_score', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 상위 N개 경쟁사 조회 (인용 횟수 기준)
 */
export async function getTopCompetitors(
  supabase: SupabaseClient,
  analysisId: string,
  limit: number = 10
): Promise<Competitor[]> {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('citation_count', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * 도메인으로 경쟁사 조회 (중복 체크용)
 */
export async function getCompetitorByDomain(
  supabase: SupabaseClient,
  analysisId: string,
  domain: string
): Promise<Competitor | null> {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('domain', domain)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows found
    throw error
  }
  return data
}

/**
 * 경쟁사 통계 조회
 */
export async function getCompetitorStats(
  supabase: SupabaseClient,
  analysisId: string
): Promise<{
  total: number
  manual: number
  auto: number
  confirmed: number
  unconfirmed: number
  avgCitationRate: number
  totalCitations: number
}> {
  const competitors = await getCompetitorsByAnalysisId(supabase, analysisId)

  const manual = competitors.filter((c) => c.detection_method === 'manual').length
  const auto = competitors.filter((c) => c.detection_method === 'auto').length
  const confirmed = competitors.filter((c) => c.is_confirmed).length
  const unconfirmed = competitors.filter((c) => !c.is_confirmed).length

  const totalCitations = competitors.reduce((sum, c) => sum + c.citation_count, 0)
  const avgCitationRate =
    competitors.reduce((sum, c) => sum + (c.citation_rate || 0), 0) /
    (competitors.length || 1)

  return {
    total: competitors.length,
    manual,
    auto,
    confirmed,
    unconfirmed,
    avgCitationRate,
    totalCitations,
  }
}

/**
 * LLM별 경쟁사 출현 집계
 */
export async function getCompetitorsByLLM(
  supabase: SupabaseClient,
  analysisId: string
): Promise<{
  perplexity: Competitor[]
  chatgpt: Competitor[]
  gemini: Competitor[]
  claude: Competitor[]
}> {
  const competitors = await getCompetitorsByAnalysisId(supabase, analysisId)

  const filterByLLM = (llmKey: keyof LLMAppearances) => {
    return competitors
      .filter((c) => {
        const appearances = c.llm_appearances as LLMAppearances
        return appearances && appearances[llmKey] && appearances[llmKey]! > 0
      })
      .sort((a, b) => {
        const aCount = (a.llm_appearances as LLMAppearances)[llmKey] || 0
        const bCount = (b.llm_appearances as LLMAppearances)[llmKey] || 0
        return bCount - aCount
      })
  }

  return {
    perplexity: filterByLLM('perplexity'),
    chatgpt: filterByLLM('chatgpt'),
    gemini: filterByLLM('gemini'),
    claude: filterByLLM('claude'),
  }
}
