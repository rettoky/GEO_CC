// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * CORS 헤더 설정
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InitRequest {
  analysisId: string
}

interface InitResponse {
  success: boolean
  conversationId?: string
  existingConversation?: boolean
  error?: string
}

/**
 * review-chat-init Edge Function
 * Gemini File Search Store 생성 및 분석 데이터 업로드
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
    const { analysisId }: InitRequest = await req.json()

    if (!analysisId) {
      return new Response(
        JSON.stringify({ success: false, error: 'analysisId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Google AI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 기존 대화 확인
    const { data: existingConversation } = await supabase
      .from('review_conversations')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('status', 'active')
      .single()

    if (existingConversation) {
      console.log('[DEBUG] Existing conversation found:', existingConversation.id)
      return new Response(
        JSON.stringify({
          success: true,
          conversationId: existingConversation.id,
          existingConversation: true,
        } as InitResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 2. 분석 데이터 조회
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ success: false, error: 'Analysis not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 3. File Search Store 생성
    console.log('[DEBUG] Creating File Search Store...')
    const storeResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: `geo-analysis-${analysisId.substring(0, 8)}`,
        }),
      }
    )

    if (!storeResponse.ok) {
      const errorText = await storeResponse.text()
      console.error('[ERROR] Failed to create store:', errorText)
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create store: ${storeResponse.status}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const storeData = await storeResponse.json()
    const storeId = storeData.name  // fileSearchStores/{id}
    console.log('[DEBUG] Store created:', storeId)

    // 4. 분석 데이터를 JSON으로 변환
    const analysisDataForRAG = buildAnalysisDataForRAG(analysis)
    const jsonContent = JSON.stringify(analysisDataForRAG, null, 2)

    // 5. 파일 업로드 (inline data 방식)
    console.log('[DEBUG] Uploading analysis data to store...')
    const uploadResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${storeId}:importFiles?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inlinePayloads: [{
            mimeType: 'application/json',
            displayName: 'analysis-data.json',
            content: btoa(unescape(encodeURIComponent(jsonContent))),  // Base64 인코딩
          }],
        }),
      }
    )

    let fileId: string | null = null
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('[ERROR] Failed to upload file:', errorText)
      // 파일 업로드 실패해도 계속 진행 (store는 생성됨)
    } else {
      const uploadData = await uploadResponse.json()
      console.log('[DEBUG] File uploaded:', uploadData)
      // operation에서 fileId 추출 시도
      if (uploadData.name) {
        fileId = uploadData.name
      }
    }

    // 6. DB에 conversation 저장
    const { data: newConversation, error: insertError } = await supabase
      .from('review_conversations')
      .insert({
        analysis_id: analysisId,
        gemini_store_id: storeId,
        gemini_file_id: fileId,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[ERROR] Failed to save conversation:', insertError)
      // Store 정리 시도
      await cleanupStore(storeId, apiKey)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save conversation' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[DEBUG] Conversation created:', newConversation.id)

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: newConversation.id,
        existingConversation: false,
      } as InitResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('[ERROR] review-chat-init error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * 분석 데이터를 RAG용 JSON으로 변환
 */
function buildAnalysisDataForRAG(analysis: Record<string, unknown>): Record<string, unknown> {
  const results = analysis.results as Record<string, unknown> || {}
  const summary = analysis.summary as Record<string, unknown> || {}
  const crossValidation = analysis.cross_validation as Record<string, unknown> || {}

  // LLM별 결과 요약
  const llmSummaries: Record<string, unknown> = {}
  for (const [llm, result] of Object.entries(results)) {
    if (result && typeof result === 'object') {
      const r = result as Record<string, unknown>
      llmSummaries[llm] = {
        success: r.success,
        model: r.model,
        answerPreview: typeof r.answer === 'string' ? r.answer.substring(0, 1000) : '',
        citationCount: Array.isArray(r.citations) ? r.citations.length : 0,
        citations: Array.isArray(r.citations)
          ? (r.citations as Array<Record<string, unknown>>).map((c) => ({
              domain: c.domain,
              title: c.title,
              url: c.url,
              snippet: typeof c.snippet === 'string' ? c.snippet?.substring(0, 200) : '',
            }))
          : [],
        responseTime: r.responseTime,
      }
    }
  }

  // 상위 도메인 추출
  const topDomains: Array<{ domain: string; count: number; citedBy: string[] }> = []
  const domainMap = new Map<string, { count: number; citedBy: Set<string> }>()

  for (const [llm, result] of Object.entries(results)) {
    if (result && typeof result === 'object') {
      const r = result as Record<string, unknown>
      if (Array.isArray(r.citations)) {
        for (const citation of r.citations as Array<Record<string, unknown>>) {
          const domain = citation.domain as string
          if (domain) {
            const existing = domainMap.get(domain) || { count: 0, citedBy: new Set() }
            existing.count++
            existing.citedBy.add(llm)
            domainMap.set(domain, existing)
          }
        }
      }
    }
  }

  for (const [domain, data] of domainMap.entries()) {
    topDomains.push({
      domain,
      count: data.count,
      citedBy: Array.from(data.citedBy),
    })
  }
  topDomains.sort((a, b) => b.count - a.count)

  return {
    documentType: 'GEO Analysis Data',
    analysisId: analysis.id,
    createdAt: analysis.created_at,
    completedAt: analysis.completed_at,

    // 검색 정보
    query: analysis.query_text,
    baseQuery: analysis.base_query,
    targetDomain: analysis.my_domain,
    targetBrand: analysis.my_brand,
    brandAliases: analysis.brand_aliases,

    // 분석 요약
    summary: {
      totalCitations: summary.totalCitations,
      uniqueDomains: summary.uniqueDomains,
      myDomainCited: summary.myDomainCited,
      myDomainCitationCount: summary.myDomainCitationCount,
      brandMentioned: summary.brandMentioned,
      brandMentionCount: summary.brandMentionCount,
      avgResponseTime: summary.avgResponseTime,
      successfulLLMs: summary.successfulLLMs,
      failedLLMs: summary.failedLLMs,
    },

    // 브랜드 언급 분석
    brandMentionAnalysis: summary.brandMentionAnalysis,

    // LLM별 상세 결과
    llmResults: llmSummaries,

    // 상위 인용 도메인
    topCitedDomains: topDomains.slice(0, 20),

    // 교차 검증 (신뢰도)
    crossValidation: crossValidation,

    // AI 최종 검토 의견
    finalReview: analysis.final_review,
    finalReviewCreatedAt: analysis.final_review_created_at,
  }
}

/**
 * Store 정리 (에러 시)
 */
async function cleanupStore(storeId: string, apiKey: string): Promise<void> {
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${storeId}?key=${apiKey}`,
      {
        method: 'DELETE',
      }
    )
    console.log('[DEBUG] Store cleaned up:', storeId)
  } catch (error) {
    console.error('[ERROR] Failed to cleanup store:', error)
  }
}
