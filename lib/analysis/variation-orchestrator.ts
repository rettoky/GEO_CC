/**
 * Variation Batch Analysis Orchestrator
 * 여러 쿼리 변형에 대해 순차적으로 LLM 분석 수행
 */

import { createClient } from '@/lib/supabase/client'
import { createQueryVariationsBulk } from '@/lib/supabase/queries/variations'
import type { GeneratedVariation } from '@/types/queryVariations'

export interface BatchAnalysisProgress {
  stage: 'variations' | 'llm_analysis' | 'completed'
  currentVariation: number
  totalVariations: number
  currentLLM?: string
  percentage: number
}

export type ProgressCallback = (progress: BatchAnalysisProgress) => void

/**
 * 여러 쿼리 변형에 대해 순차적으로 분석 수행
 */
export async function analyzeBatchVariations(
  analysisId: string,
  baseQuery: string,
  variations: GeneratedVariation[],
  myDomain: string,
  myBrand: string,
  onProgress?: ProgressCallback
) {
  const supabase = createClient()

  // 1. 변형을 DB에 저장
  onProgress?.({
    stage: 'variations',
    currentVariation: 0,
    totalVariations: variations.length,
    percentage: 0,
  })

  await createQueryVariationsBulk(
    supabase,
    variations.map((v) => ({
      analysis_id: analysisId,
      base_query: baseQuery,
      variation: v.query,
      variation_type: v.type,
      generation_method: 'ai',
    }))
  )

  // 2. 각 변형에 대해 분석 수행
  const results: any[] = []
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials not configured')
  }

  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i]

    onProgress?.({
      stage: 'llm_analysis',
      currentVariation: i + 1,
      totalVariations: variations.length,
      percentage: ((i + 1) / variations.length) * 100,
    })

    // analyze-query Edge Function 호출
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        query: variation.query,
        myDomain,
        myBrand,
        analysisId, // 같은 analysis_id로 저장
      }),
    })

    if (!response.ok) {
      console.error(`Failed to analyze variation: ${variation.query}`)
      results.push({
        variation: variation.query,
        type: variation.type,
        error: `Analysis failed: ${response.statusText}`,
      })
      continue
    }

    const result = await response.json()
    results.push({
      variation: variation.query,
      type: variation.type,
      result,
    })
  }

  onProgress?.({
    stage: 'completed',
    currentVariation: variations.length,
    totalVariations: variations.length,
    percentage: 100,
  })

  return results
}

/**
 * 배치 분석 상태 요약
 */
export function summarizeBatchResults(results: any[]): {
  total: number
  successful: number
  failed: number
  avgCitationRate: number
} {
  const total = results.length
  const successful = results.filter((r) => !r.error).length
  const failed = results.filter((r) => r.error).length

  const successfulResults = results.filter((r) => !r.error && r.result)
  const avgCitationRate =
    successfulResults.reduce((sum, r) => {
      const citationRate = r.result?.summary?.citationRate || 0
      return sum + citationRate
    }, 0) / (successfulResults.length || 1)

  return {
    total,
    successful,
    failed,
    avgCitationRate: Math.round(avgCitationRate * 100) / 100,
  }
}
