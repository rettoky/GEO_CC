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
    const encoder = new TextEncoder()
    const jsonBytes = encoder.encode(jsonContent)
    const numBytes = jsonBytes.length

    console.log('[DEBUG] JSON content size:', numBytes, 'bytes')

    // 5-1. Resumable upload 시작
    console.log('[DEBUG] Starting resumable upload to Files API...')
    const startUploadResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(numBytes),
          'X-Goog-Upload-Header-Content-Type': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: {
            display_name: `analysis-${analysisId.substring(0, 8)}.json`,
          }
        }),
      }
    )

    let fileId: string | null = null
    let geminiFileName: string | null = null

    if (!startUploadResponse.ok) {
      const errorText = await startUploadResponse.text()
      console.error('[ERROR] Failed to start resumable upload:', errorText)
    } else {
      // Get upload URL from response header
      const uploadUrl = startUploadResponse.headers.get('X-Goog-Upload-URL')
      console.log('[DEBUG] Got upload URL:', uploadUrl ? 'yes' : 'no')

      if (uploadUrl) {
        // 5-2. 실제 파일 데이터 업로드
        console.log('[DEBUG] Uploading file data...')
        const uploadDataResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Length': String(numBytes),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize',
          },
          body: jsonBytes,
        })

        if (!uploadDataResponse.ok) {
          const errorText = await uploadDataResponse.text()
          console.error('[ERROR] Failed to upload file data:', errorText)
        } else {
          const filesData = await uploadDataResponse.json()
          console.log('[DEBUG] Files API response:', JSON.stringify(filesData))
          geminiFileName = filesData.file?.name  // files/{id} 형식
          fileId = geminiFileName
        }
      } else {
        console.error('[ERROR] No upload URL in response headers')
        // 응답 헤더 디버깅
        console.log('[DEBUG] Response headers:')
        startUploadResponse.headers.forEach((value, key) => {
          console.log(`  ${key}: ${value}`)
        })
      }
    }

    // 5-2. FileSearchStore에 파일 import
    if (geminiFileName) {
      console.log('[DEBUG] Importing file to FileSearchStore:', geminiFileName)
      const importResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${storeId}:importFile?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: geminiFileName,
          }),
        }
      )

      if (!importResponse.ok) {
        const errorText = await importResponse.text()
        console.error('[ERROR] Failed to import file to store:', errorText)
      } else {
        const importData = await importResponse.json()
        console.log('[DEBUG] File imported to store:', JSON.stringify(importData))

        // 인덱싱이 완료될 때까지 잠시 대기 (최대 10초)
        if (importData.name) {
          await waitForOperation(importData.name, apiKey)
        }
      }
    } else {
      console.error('[ERROR] No file name from Files API, cannot import to store')
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

/**
 * Long-running operation 완료 대기 (최대 15초)
 */
async function waitForOperation(operationName: string, apiKey: string): Promise<boolean> {
  const maxAttempts = 15
  const delayMs = 1000

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
      )

      if (response.ok) {
        const data = await response.json()
        console.log(`[DEBUG] Operation status (attempt ${i + 1}):`, JSON.stringify(data))

        if (data.done === true) {
          console.log('[DEBUG] Operation completed successfully')
          return true
        }
      }
    } catch (error) {
      console.error('[ERROR] Failed to check operation status:', error)
    }

    // 대기
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  console.log('[DEBUG] Operation not completed within timeout, proceeding anyway')
  return false
}
