/**
 * Variation Batch Analysis Orchestrator
 * 여러 쿼리 변형에 대해 순차적으로 LLM 분석 수행
 *
 * Flow:
 * 1. Create analysis record
 * 2. Save variations to DB
 * 3. Analyze BASE query first
 * 4. Analyze all variations sequentially
 * 5. Aggregate all results
 * 6. Generate visualization data
 * 7. Update analysis record with comprehensive results
 */

import { createClient } from '@/lib/supabase/client'
import { createQueryVariationsBulk } from '@/lib/supabase/queries/variations'
import type { GeneratedVariation } from '@/types/queryVariations'
import type { AnalysisResults, AnalysisSummary, LLMType } from '@/lib/supabase/types'

export interface BatchAnalysisProgress {
  stage: 'init' | 'variations' | 'base_analysis' | 'llm_analysis' | 'aggregation' | 'completed'
  currentVariation: number
  totalVariations: number
  currentLLM?: string
  percentage: number
  analysisId?: string
  message?: string
}

export type ProgressCallback = (progress: BatchAnalysisProgress) => void

// 개별 쿼리 분석 결과
interface QueryAnalysisResult {
  query: string
  queryType: 'base' | 'variation'
  variationType?: string
  results: AnalysisResults
  summary: AnalysisSummary
  error?: string
}

// 종합 집계 메트릭
interface AggregatedMetrics {
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  // LLM별 평균 인용률
  avgCitationRateByLLM: {
    perplexity: number
    chatgpt: number
    gemini: number
    claude: number
  }
  // 내 도메인 인용 통계
  myDomainStats: {
    totalCitations: number
    queriesWithCitation: number
    citationRate: number // 전체 쿼리 중 인용된 비율
    byLLM: {
      perplexity: { cited: number; total: number }
      chatgpt: { cited: number; total: number }
      gemini: { cited: number; total: number }
      claude: { cited: number; total: number }
    }
  }
  // 브랜드 언급 통계
  brandMentionStats: {
    totalMentions: number
    queriesWithMention: number
    mentionRate: number
  }
  // 상위 인용 도메인
  topCitedDomains: {
    domain: string
    count: number
    percentage: number
  }[]
  // 쿼리 타입별 성과
  performanceByQueryType: {
    type: string
    avgCitationRate: number
    avgBrandMentionRate: number
    count: number
  }[]
}

/**
 * 여러 쿼리 변형에 대해 순차적으로 분석 수행
 * 베이스 쿼리 + 모든 변형 쿼리를 분석하고 종합 결과 생성
 */
export async function analyzeBatchVariations(
  _unusedAnalysisId: string, // 더 이상 사용하지 않음 - 내부에서 생성
  baseQuery: string,
  variations: GeneratedVariation[],
  myDomain: string,
  myBrand: string,
  onProgress?: ProgressCallback,
  brandAliases?: string[],
  competitors?: Array<{ name: string; aliases: string[] }>
) {
  const supabase = createClient()
  const totalQueries = variations.length + 1 // base + variations

  // 0. analyses 테이블에 레코드 생성
  onProgress?.({
    stage: 'init',
    currentVariation: 0,
    totalVariations: totalQueries,
    percentage: 0,
    message: 'Supabase에 분석 레코드 생성 중...',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: analysisRecord, error: createError } = await (supabase as any)
    .from('analyses')
    .insert({
      query_text: baseQuery,
      my_domain: myDomain || null,
      my_brand: myBrand || null,
      status: 'processing',
      base_query: baseQuery,
      query_variations_count: variations.length,
      total_queries_analyzed: totalQueries,
    })
    .select()
    .single()

  if (createError || !analysisRecord) {
    throw new Error(`분석 레코드 생성 실패: ${createError?.message}`)
  }

  const analysisId = analysisRecord.id

  // 1. 변형을 DB에 저장
  onProgress?.({
    stage: 'variations',
    currentVariation: 0,
    totalVariations: totalQueries,
    percentage: 3,
    analysisId,
    message: '쿼리 변형 저장 중...',
  })

  if (variations.length > 0) {
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
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('analyses').update({ status: 'failed', error_message: 'Supabase credentials not configured' }).eq('id', analysisId)
    throw new Error('Supabase credentials not configured')
  }

  const allQueryResults: QueryAnalysisResult[] = []

  try {
    // 2. 베이스 쿼리 분석 (먼저)
    onProgress?.({
      stage: 'base_analysis',
      currentVariation: 0,
      totalVariations: totalQueries,
      percentage: 5,
      analysisId,
      message: `기본 쿼리 분석 중: "${baseQuery}"`,
    })

    const baseResult = await analyzeQuery(supabaseUrl, supabaseAnonKey, baseQuery, myDomain, myBrand, brandAliases, competitors)

    if (baseResult.success) {
      allQueryResults.push({
        query: baseQuery,
        queryType: 'base',
        results: baseResult.data.results,
        summary: baseResult.data.summary,
      })

      // 베이스 쿼리 결과를 analyses.results와 analyses.summary에 저장
      console.log('[BatchAnalysis] Saving base query results to DB')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: baseUpdateError } = await (supabase as any)
        .from('analyses')
        .update({
          results: baseResult.data.results,
          summary: baseResult.data.summary,
        })
        .eq('id', analysisId)

      if (baseUpdateError) {
        console.error('[BatchAnalysis] Failed to save base query results:', baseUpdateError)
      } else {
        console.log('[BatchAnalysis] Base query results saved successfully')
      }
    } else {
      allQueryResults.push({
        query: baseQuery,
        queryType: 'base',
        results: {} as AnalysisResults,
        summary: {} as AnalysisSummary,
        error: baseResult.error,
      })
    }

    // 3. 각 변형에 대해 분석 수행
    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i]
      const currentQuery = i + 2 // 1-based, base query is 1

      onProgress?.({
        stage: 'llm_analysis',
        currentVariation: currentQuery,
        totalVariations: totalQueries,
        percentage: 10 + (currentQuery / totalQueries) * 70, // 10% ~ 80%
        analysisId,
        message: `변형 쿼리 분석 중 (${i + 1}/${variations.length}): "${variation.query.substring(0, 30)}..."`,
      })

      const result = await analyzeQuery(supabaseUrl, supabaseAnonKey, variation.query, myDomain, myBrand, brandAliases, competitors)

      if (result.success) {
        allQueryResults.push({
          query: variation.query,
          queryType: 'variation',
          variationType: variation.type,
          results: result.data.results,
          summary: result.data.summary,
        })
      } else {
        allQueryResults.push({
          query: variation.query,
          queryType: 'variation',
          variationType: variation.type,
          results: {} as AnalysisResults,
          summary: {} as AnalysisSummary,
          error: result.error,
        })
      }
    }

    // 4. 종합 분석 및 집계
    onProgress?.({
      stage: 'aggregation',
      currentVariation: totalQueries,
      totalVariations: totalQueries,
      percentage: 85,
      analysisId,
      message: '결과 집계 및 시각화 데이터 생성 중...',
    })

    const aggregatedMetrics = aggregateResults(allQueryResults, myDomain)
    const visualizationData = generateVisualizationData(allQueryResults, aggregatedMetrics)

    console.log('[BatchAnalysis] Aggregated metrics:', JSON.stringify(aggregatedMetrics, null, 2))
    console.log('[BatchAnalysis] Visualization data summary:', {
      summaryCards: visualizationData.summaryCards,
      queryHeatmapLength: visualizationData.queryHeatmap.length,
      topDomainsLength: visualizationData.topDomainsChart.length,
    })

    // 5. 최종 결과 저장
    const updatePayload = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      intermediate_results: {
        allQueryResults,
        baseQueryResult: allQueryResults.find(r => r.queryType === 'base'),
        variationResults: allQueryResults.filter(r => r.queryType === 'variation'),
      },
      citation_metrics: aggregatedMetrics,
      visualization_data: visualizationData,
    }

    console.log('[BatchAnalysis] Updating analysis record:', analysisId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: finalUpdateError } = await (supabase as any)
      .from('analyses')
      .update(updatePayload)
      .eq('id', analysisId)

    if (finalUpdateError) {
      console.error('[BatchAnalysis] Final update failed:', finalUpdateError)
      throw new Error(`최종 결과 저장 실패: ${finalUpdateError.message}`)
    }

    console.log('[BatchAnalysis] Successfully updated analysis record')

    onProgress?.({
      stage: 'completed',
      currentVariation: totalQueries,
      totalVariations: totalQueries,
      percentage: 100,
      analysisId,
      message: '분석 완료!',
    })

    return {
      analysisId,
      results: allQueryResults,
      metrics: aggregatedMetrics,
      visualizationData,
    }
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('analyses')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', analysisId)
    throw error
  }
}

/**
 * 단일 쿼리 분석 (Edge Function 호출)
 * skipSave: true로 호출하여 Edge Function에서 별도 analyses 레코드 생성 방지
 */
async function analyzeQuery(
  supabaseUrl: string,
  supabaseAnonKey: string,
  query: string,
  myDomain: string,
  myBrand: string,
  brandAliases?: string[],
  competitors?: Array<{ name: string; aliases: string[] }>
): Promise<{ success: true; data: { results: AnalysisResults; summary: AnalysisSummary } } | { success: false; error: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        query,
        domain: myDomain,      // Edge Function은 'domain' 파라미터 사용
        brand: myBrand,        // Edge Function은 'brand' 파라미터 사용
        brandAliases,          // 브랜드 별칭 목록
        competitors,           // 경쟁사 브랜드 목록 (name, aliases)
        skipSave: true,        // 배치 분석에서는 별도 레코드 생성 안함
      }),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const data = await response.json()

    // Edge Function이 success: false를 반환한 경우 처리
    if (!data.success) {
      console.error('[BatchAnalysis] Edge Function returned failure:', data.error)
      return { success: false, error: data.error?.message || 'Edge Function returned failure' }
    }

    // data.data가 없는 경우 처리
    if (!data.data || !data.data.results) {
      console.error('[BatchAnalysis] Edge Function returned empty data:', data)
      return { success: false, error: 'Edge Function returned empty data' }
    }

    // 모든 LLM이 실패한 경우 로그
    const failedLLMs = data.data.summary?.failedLLMs || []
    const successfulLLMs = data.data.summary?.successfulLLMs || []
    console.log(`[BatchAnalysis] LLM results - Success: [${successfulLLMs.join(', ')}], Failed: [${failedLLMs.join(', ')}]`)

    return { success: true, data: { results: data.data.results, summary: data.data.summary } }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 모든 쿼리 결과 집계
 */
function aggregateResults(
  results: QueryAnalysisResult[],
  myDomain: string
  // myBrand parameter removed - can be added back for brand-specific aggregations
): AggregatedMetrics {
  const successfulResults = results.filter(r => !r.error)
  const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']

  // LLM별 인용률 계산
  const avgCitationRateByLLM = {
    perplexity: 0,
    chatgpt: 0,
    gemini: 0,
    claude: 0,
  }

  // 내 도메인 인용 통계
  const myDomainStats = {
    totalCitations: 0,
    queriesWithCitation: 0,
    citationRate: 0,
    byLLM: {
      perplexity: { cited: 0, total: 0 },
      chatgpt: { cited: 0, total: 0 },
      gemini: { cited: 0, total: 0 },
      claude: { cited: 0, total: 0 },
    },
  }

  // 브랜드 언급 통계
  const brandMentionStats = {
    totalMentions: 0,
    queriesWithMention: 0,
    mentionRate: 0,
  }

  // 도메인별 인용 횟수
  const domainCounts: Record<string, number> = {}

  // 쿼리 타입별 데이터
  const queryTypeData: Record<string, { citationRates: number[]; brandMentions: number[] }> = {}

  for (const result of successfulResults) {
    const queryType = result.queryType === 'base' ? 'base' : (result.variationType || 'unknown')

    if (!queryTypeData[queryType]) {
      queryTypeData[queryType] = { citationRates: [], brandMentions: [] }
    }

    let queryHasMyCitation = false
    let queryHasBrandMention = false

    for (const llm of llmTypes) {
      const llmResult = result.results[llm]
      if (!llmResult?.success) continue

      myDomainStats.byLLM[llm].total++

      // 인용률 집계
      const citationRate = result.summary?.citationRateByLLM?.[llm] || 0
      avgCitationRateByLLM[llm] += citationRate

      // 내 도메인 인용 체크
      if (myDomain && llmResult.citations) {
        const myCitations = llmResult.citations.filter(c =>
          c.domain?.toLowerCase().includes(myDomain.toLowerCase())
        )
        if (myCitations.length > 0) {
          myDomainStats.totalCitations += myCitations.length
          myDomainStats.byLLM[llm].cited++
          queryHasMyCitation = true
        }
      }

      // 도메인별 인용 횟수
      if (llmResult.citations) {
        for (const citation of llmResult.citations) {
          if (citation.domain) {
            domainCounts[citation.domain] = (domainCounts[citation.domain] || 0) + 1
          }
        }
      }
    }

    // 브랜드 언급 체크
    if (result.summary?.brandMentioned) {
      brandMentionStats.totalMentions += result.summary.brandMentionCount || 1
      queryHasBrandMention = true
    }

    if (queryHasMyCitation) myDomainStats.queriesWithCitation++
    if (queryHasBrandMention) brandMentionStats.queriesWithMention++

    // 쿼리 타입별 데이터 누적
    queryTypeData[queryType].citationRates.push(result.summary?.myDomainCited ? 1 : 0)
    queryTypeData[queryType].brandMentions.push(result.summary?.brandMentioned ? 1 : 0)
  }

  // 평균 계산
  const successCount = successfulResults.length || 1
  for (const llm of llmTypes) {
    avgCitationRateByLLM[llm] = Math.round((avgCitationRateByLLM[llm] / successCount) * 100) / 100
  }

  myDomainStats.citationRate = Math.round((myDomainStats.queriesWithCitation / successCount) * 100)
  brandMentionStats.mentionRate = Math.round((brandMentionStats.queriesWithMention / successCount) * 100)

  // 상위 인용 도메인 추출
  const totalDomainCitations = Object.values(domainCounts).reduce((a, b) => a + b, 0)
  const topCitedDomains = Object.entries(domainCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([domain, count]) => ({
      domain,
      count,
      percentage: Math.round((count / totalDomainCitations) * 100),
    }))

  // 쿼리 타입별 성과
  const performanceByQueryType = Object.entries(queryTypeData).map(([type, data]) => ({
    type,
    avgCitationRate: Math.round((data.citationRates.reduce((a, b) => a + b, 0) / data.citationRates.length) * 100),
    avgBrandMentionRate: Math.round((data.brandMentions.reduce((a, b) => a + b, 0) / data.brandMentions.length) * 100),
    count: data.citationRates.length,
  }))

  return {
    totalQueries: results.length,
    successfulQueries: successfulResults.length,
    failedQueries: results.length - successfulResults.length,
    avgCitationRateByLLM,
    myDomainStats,
    brandMentionStats,
    topCitedDomains,
    performanceByQueryType,
  }
}

/**
 * 시각화 데이터 생성
 */
function generateVisualizationData(
  results: QueryAnalysisResult[],
  metrics: AggregatedMetrics
) {
  const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']

  // 1. LLM별 인용률 차트 데이터
  const citationRateChart = llmTypes.map(llm => ({
    llm,
    avgRate: metrics.avgCitationRateByLLM[llm],
    myDomainCited: metrics.myDomainStats.byLLM[llm].cited,
    totalQueries: metrics.myDomainStats.byLLM[llm].total,
  }))

  // 2. 쿼리별 결과 히트맵 데이터
  const queryHeatmap = results.map((result, index) => ({
    index,
    query: result.query.substring(0, 50),
    queryType: result.queryType,
    variationType: result.variationType,
    perplexity: result.results.perplexity?.success ? (result.summary?.citationRateByLLM?.perplexity || 0) : null,
    chatgpt: result.results.chatgpt?.success ? (result.summary?.citationRateByLLM?.chatgpt || 0) : null,
    gemini: result.results.gemini?.success ? (result.summary?.citationRateByLLM?.gemini || 0) : null,
    claude: result.results.claude?.success ? (result.summary?.citationRateByLLM?.claude || 0) : null,
    myDomainCited: result.summary?.myDomainCited || false,
    brandMentioned: result.summary?.brandMentioned || false,
  }))

  // 3. 상위 도메인 차트
  const topDomainsChart = metrics.topCitedDomains

  // 4. 쿼리 타입별 성과 차트
  const queryTypeChart = metrics.performanceByQueryType

  // 5. 종합 요약 카드 데이터
  const summaryCards = {
    totalQueries: metrics.totalQueries,
    successRate: Math.round((metrics.successfulQueries / metrics.totalQueries) * 100),
    myDomainCitationRate: metrics.myDomainStats.citationRate,
    brandMentionRate: metrics.brandMentionStats.mentionRate,
    bestPerformingLLM: Object.entries(metrics.avgCitationRateByLLM)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A',
    topDomain: metrics.topCitedDomains[0]?.domain || 'N/A',
  }

  return {
    citationRateChart,
    queryHeatmap,
    topDomainsChart,
    queryTypeChart,
    summaryCards,
  }
}

// Export types for use in other components
export type { QueryAnalysisResult, AggregatedMetrics }
