// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisResults,
  AnalysisSummary,
  LLMResult,
  LLMType,
} from './llm/types.ts'
import { callPerplexity } from './llm/perplexity.ts'
import { callOpenAI } from './llm/openai.ts'
import { callGemini } from './llm/gemini.ts'
import { callClaude } from './llm/claude.ts'

/**
 * CORS 헤더 설정
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * analyze-query Edge Function
 * 4개 LLM에 쿼리를 전송하고 인용 데이터를 분석
 */
Deno.serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    // 요청 파싱
    const { query, domain, brand }: AnalyzeRequest = await req.json()

    // 입력 검증
    if (!query || query.trim().length === 0) {
      const errorResponse: AnalyzeResponse = {
        success: false,
        analysisId: '',
        error: {
          message: 'Query is required',
          code: 'INVALID_INPUT',
        },
      }

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Supabase 클라이언트 초기화
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // DB에 분석 레코드 생성
    const { data: analysis, error: insertError } = await supabase
      .from('analyses')
      .insert({
        query_text: query,
        my_domain: domain || null,
        my_brand: brand || null,
        status: 'processing',
        results: {},
      })
      .select()
      .single()

    if (insertError || !analysis) {
      throw new Error('Failed to create analysis record')
    }

    const analysisId = analysis.id

    // 4개 LLM 병렬 호출 (T028)
    const results = await Promise.allSettled([
      callPerplexity(query),
      callOpenAI(query),
      callGemini(query),
      callClaude(query),
    ])

    // 결과 매핑 (T029: UnifiedCitation은 이미 각 LLM 함수에서 정규화됨)
    const analysisResults: AnalysisResults = {
      perplexity: results[0].status === 'fulfilled' ? results[0].value : null,
      chatgpt: results[1].status === 'fulfilled' ? results[1].value : null,
      gemini: results[2].status === 'fulfilled' ? results[2].value : null,
      claude: results[3].status === 'fulfilled' ? results[3].value : null,
    }

    // AnalysisSummary 생성 (T030)
    const summary = generateSummary(analysisResults, domain, brand)

    // DB 업데이트 (T031)
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        results: analysisResults,
        summary,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', analysisId)

    if (updateError) {
      console.error('Failed to update analysis:', updateError)
    }

    const response: AnalyzeResponse = {
      success: true,
      analysisId,
      data: {
        results: analysisResults,
        summary,
      },
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing request:', error)

    const errorResponse: AnalyzeResponse = {
      success: false,
      analysisId: '',
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * AnalysisSummary 생성 함수 (T030)
 */
function generateSummary(
  results: AnalysisResults,
  myDomain?: string,
  myBrand?: string
): AnalysisSummary {
  const llmResults: LLMResult[] = Object.values(results).filter(
    (r): r is LLMResult => r !== null
  )

  // 전체 인용 수
  const allCitations = llmResults.flatMap((r) => r.citations)
  const totalCitations = allCitations.length

  // 고유 도메인 수
  const uniqueDomains = new Set(allCitations.map((c) => c.domain)).size

  // 타겟 도메인 인용 여부 및 횟수
  let myDomainCited = false
  let myDomainCitationCount = 0

  if (myDomain) {
    const normalizedMyDomain = myDomain.toLowerCase().replace(/^www\./, '')
    myDomainCitationCount = allCitations.filter((c) =>
      c.domain === normalizedMyDomain
    ).length
    myDomainCited = myDomainCitationCount > 0
  }

  // 브랜드 언급 여부 및 횟수
  let brandMentioned = false
  let brandMentionCount = 0

  if (myBrand) {
    const brandRegex = new RegExp(myBrand, 'gi')
    for (const result of llmResults) {
      const matches = result.answer.match(brandRegex)
      if (matches) {
        brandMentioned = true
        brandMentionCount += matches.length
      }
    }
  }

  // 평균 응답 시간
  const avgResponseTime = llmResults.length > 0
    ? llmResults.reduce((sum, r) => sum + r.responseTime, 0) /
      llmResults.length
    : 0

  // 성공/실패 LLM 목록
  const successfulLLMs: LLMType[] = []
  const failedLLMs: LLMType[] = []

  const llmMap: Record<keyof AnalysisResults, LLMType> = {
    perplexity: 'perplexity',
    chatgpt: 'chatgpt',
    gemini: 'gemini',
    claude: 'claude',
  }

  for (const [key, llmType] of Object.entries(llmMap)) {
    const result = results[key as keyof AnalysisResults]
    if (result && result.success) {
      successfulLLMs.push(llmType)
    } else {
      failedLLMs.push(llmType)
    }
  }

  // LLM별 인용률
  const citationRateByLLM = {
    perplexity: results.perplexity?.citations.length ?? null,
    chatgpt: results.chatgpt?.citations.length ?? null,
    gemini: results.gemini?.citations.length ?? null,
    claude: results.claude?.citations.length ?? null,
  }

  return {
    totalCitations,
    uniqueDomains,
    myDomainCited,
    myDomainCitationCount,
    brandMentioned,
    brandMentionCount,
    avgResponseTime,
    successfulLLMs,
    failedLLMs,
    citationRateByLLM,
  }
}
