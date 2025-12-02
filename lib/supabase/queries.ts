import { createClient } from './server'
import type { Analysis } from './types'

/**
 * 분석 조회 함수 (T044)
 */
export async function getAnalysisById(id: string): Promise<Analysis | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching analysis:', error)
    return null
  }

  return data
}

/**
 * 분석 목록 조회 함수 (T052)
 */
export async function getAnalysisList(
  limit: number = 20,
  offset: number = 0
): Promise<Analysis[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching analysis list:', error)
    return []
  }

  return data || []
}

/**
 * 분석 삭제 함수 (T053)
 */
export async function deleteAnalysis(id: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase.from('analyses').delete().eq('id', id)

  if (error) {
    console.error('Error deleting analysis:', error)
    return false
  }

  return true
}
