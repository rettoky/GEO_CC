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

interface ReviewRequest {
  analysisId?: string  // 분석 ID (저장용)
  query: string
  myDomain?: string
  myBrand?: string
  summary: {
    totalCitations: number
    uniqueDomains: number
    myDomainCited: boolean
    myDomainCitationCount: number
    brandMentioned: boolean
    brandMentionCount: number
    successfulLLMs: string[]
    failedLLMs: string[]
    // 브랜드 언급 분석 데이터
    brandMentionAnalysis?: {
      myBrand?: {
        mentionCount: number
        mentionedInLLMs: string[]
      } | null
      competitors?: Array<{
        brand: string
        mentionCount: number
        mentionedInLLMs: string[]
      }>
    }
  }
  topDomains: Array<{
    domain: string
    count: number
  }>
  llmResults: {
    [key: string]: {
      success: boolean
      citationCount: number
      hasDomainCitation: boolean
      hasBrandMention: boolean
    }
  }
}

/**
 * generate-review Edge Function
 * Gemini를 사용하여 분석 결과에 대한 최종 검토 의견 생성 및 저장
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
    const body: ReviewRequest = await req.json()

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

    // Gemini에게 전달할 프롬프트 구성
    const prompt = buildReviewPrompt(body)

    // Gemini API 호출 (gemini-2.5-flash 사용)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,  // 한국어 검토 의견이 잘리지 않도록 증가
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      return new Response(
        JSON.stringify({ success: false, error: `Gemini API error: ${response.status}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await response.json()
    const review = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // analysisId가 있으면 DB에 저장
    if (body.analysisId && review) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { error: updateError } = await supabase
          .from('analyses')
          .update({
            final_review: review,
            final_review_created_at: new Date().toISOString(),
          })
          .eq('id', body.analysisId)

        if (updateError) {
          console.error('Failed to save review:', updateError)
        } else {
          console.log('[DEBUG] Review saved for analysis:', body.analysisId)
        }
      } catch (dbError) {
        console.error('Database error:', dbError)
        // DB 저장 실패해도 리뷰는 반환
      }
    }

    return new Response(
      JSON.stringify({ success: true, review }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Generate review error:', error)
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
 * Gemini 프롬프트 생성 - 분석 결과 기반 동적 구성
 */
function buildReviewPrompt(data: ReviewRequest): string {
  const {
    query,
    myDomain,
    myBrand,
    summary,
    topDomains,
    llmResults,
  } = data

  // LLM별 결과 요약
  const llmSummary = Object.entries(llmResults)
    .map(([llm, result]) => {
      if (!result.success) return `- ${llm}: 분석 실패`
      return `- ${llm}: 인용 ${result.citationCount}개, 도메인 인용 ${result.hasDomainCitation ? 'O' : 'X'}, 브랜드 언급 ${result.hasBrandMention ? 'O' : 'X'}`
    })
    .join('\n')

  // 상위 경쟁 도메인
  const topDomainsText = topDomains.slice(0, 10)
    .map((d, i) => `${i + 1}. ${d.domain} (${d.count}회)`)
    .join('\n')

  // 미노출 LLM 목록 추출
  const notExposedLLMs = Object.entries(llmResults)
    .filter(([, result]) => result.success && !result.hasDomainCitation)
    .map(([llm]) => llm)

  // 노출된 LLM 목록 추출
  const exposedLLMs = Object.entries(llmResults)
    .filter(([, result]) => result.success && result.hasDomainCitation)
    .map(([llm]) => llm)

  // 성공한 LLM 중 인용 수
  const successfulLLMCitations = Object.entries(llmResults)
    .filter(([, result]) => result.success)
    .map(([llm, result]) => ({ llm, count: result.citationCount }))
    .sort((a, b) => b.count - a.count)

  // 경쟁사 브랜드 언급 분석
  const competitorAnalysis = summary.brandMentionAnalysis?.competitors || []
  const myBrandMentionCount = summary.brandMentionAnalysis?.myBrand?.mentionCount || 0
  const myBrandMentionedInLLMs = summary.brandMentionAnalysis?.myBrand?.mentionedInLLMs || []

  // 상위 경쟁 브랜드 텍스트
  const topCompetitorsText = competitorAnalysis.length > 0
    ? competitorAnalysis.slice(0, 5)
        .map((c, i) => `${i + 1}. ${c.brand}: ${c.mentionCount}회 (${c.mentionedInLLMs.join(', ')})`)
        .join('\n')
    : '경쟁사 브랜드 분석 데이터 없음'

  // === 분석 결과에 따른 상황 판단 ===
  const totalExposure = exposedLLMs.length
  const totalSuccess = summary.successfulLLMs.length
  const exposureRate = totalSuccess > 0 ? Math.round((totalExposure / totalSuccess) * 100) : 0

  // 노출 상태 판단
  let exposureStatus: 'excellent' | 'good' | 'moderate' | 'poor' | 'none'
  if (exposureRate >= 75) exposureStatus = 'excellent'
  else if (exposureRate >= 50) exposureStatus = 'good'
  else if (exposureRate >= 25) exposureStatus = 'moderate'
  else if (exposureRate > 0) exposureStatus = 'poor'
  else exposureStatus = 'none'

  // 경쟁 상황 분석
  const topCompetitorDomain = topDomains[0]?.domain || '없음'
  const topCompetitorCount = topDomains[0]?.count || 0
  const myDomainRank = myDomain
    ? topDomains.findIndex(d => d.domain.includes(myDomain.replace(/^www\./, ''))) + 1
    : 0

  // === 동적 프롬프트 구성 ===
  return `당신은 GEO(Generative Engine Optimization) 전문 컨설턴트입니다.
아래 AI 검색 엔진 분석 결과를 바탕으로 **이 분석 결과에 특화된** 구체적인 최종 검토 의견을 한국어로 작성해주세요.

## 분석 정보
- 검색 쿼리: "${query}"
- 타겟 도메인: ${myDomain || '미지정'}
- 브랜드명: ${myBrand || '미지정'}

## 분석 결과 요약
- 총 인용 수: ${summary.totalCitations}개
- 고유 도메인 수: ${summary.uniqueDomains}개
- 내 도메인 인용 여부: ${summary.myDomainCited ? `예 (${summary.myDomainCitationCount}회)` : '아니오'}
- 브랜드 언급 여부: ${summary.brandMentioned ? `예 (${summary.brandMentionCount}회)` : '아니오'}
- 성공한 LLM: ${summary.successfulLLMs.join(', ') || '없음'}
- 실패한 LLM: ${summary.failedLLMs.join(', ') || '없음'}
- **도메인 노출된 LLM: ${exposedLLMs.join(', ') || '없음'} (${exposureRate}% 노출률)**
- **도메인 미노출 LLM: ${notExposedLLMs.join(', ') || '없음'}**

## LLM별 상세 결과
${llmSummary}

## LLM별 인용 수 순위
${successfulLLMCitations.map((item, i) => `${i + 1}. ${item.llm}: ${item.count}개`).join('\n')}

## 상위 인용 도메인 (경쟁사)
${topDomainsText || '데이터 없음'}
${myDomainRank > 0 ? `\n→ 내 도메인 순위: ${myDomainRank}위` : myDomain ? '\n→ 내 도메인: 상위 10위 밖' : ''}

## 경쟁 브랜드 언급 현황
${topCompetitorsText}
${myBrand ? `\n→ 내 브랜드(${myBrand}): ${myBrandMentionCount}회 (${myBrandMentionedInLLMs.length > 0 ? myBrandMentionedInLLMs.join(', ') : '언급 없음'})` : ''}

## 현재 상황 진단
- 노출 상태: ${exposureStatus === 'excellent' ? '매우 우수 (75%+ 노출)' : exposureStatus === 'good' ? '양호 (50-74% 노출)' : exposureStatus === 'moderate' ? '보통 (25-49% 노출)' : exposureStatus === 'poor' ? '미흡 (25% 미만 노출)' : '노출 없음'}
- 최다 인용 경쟁 도메인: ${topCompetitorDomain} (${topCompetitorCount}회)
${competitorAnalysis.length > 0 ? `- 최다 언급 경쟁 브랜드: ${competitorAnalysis[0].brand} (${competitorAnalysis[0].mentionCount}회)` : ''}

## 중요 지시사항
**원론적인 GEO 전략이 아닌, 위 분석 결과에서 발견된 구체적인 문제점과 기회에 집중하세요.**

1. **분석 결과 기반 평가**: 실제 데이터(노출률 ${exposureRate}%, 미노출 LLM: ${notExposedLLMs.join(', ') || '없음'}, 경쟁 도메인/브랜드 현황)를 인용하며 평가하세요.

2. **경쟁 분석 구체화**:
   - 상위 인용 도메인(${topCompetitorDomain} 등)과의 차이점 분석
   - 경쟁 브랜드 대비 내 브랜드의 노출 위치 분석
   ${myDomainRank > 0 ? `- 현재 ${myDomainRank}위인 순위를 어떻게 올릴 수 있는지` : myDomain ? '- 상위 10위에 진입하기 위한 전략' : ''}

3. **미노출 LLM별 맞춤 전략**: ${notExposedLLMs.length > 0 ? `
   ${notExposedLLMs.includes('chatgpt') ? '- **ChatGPT**: Bing 검색 최적화 필요. FCP 0.4초 미만 목표, 120-180단어 섹션 구성, 통계 19개+ 포함' : ''}
   ${notExposedLLMs.includes('perplexity') ? '- **Perplexity**: 콘텐츠 신선도 강화 필요. 2-3일 갱신 주기, 첫 80토큰 내 직접 답변, 학술적 톤 사용' : ''}
   ${notExposedLLMs.includes('gemini') ? '- **Gemini**: Google SERP 최적화 필요. Top 10 진입 목표, Core Web Vitals 준수, 멀티모달 콘텐츠 추가' : ''}
   ${notExposedLLMs.includes('claude') ? '- **Claude**: Brave Search 최적화 필요. 650-1,050단어 간결 콘텐츠, 25단어 이내 핵심 문장, E-E-A-T 강화' : ''}` : '모든 LLM에 노출되어 있습니다. 노출 품질과 순위 향상에 집중하세요.'}

4. **실행 가능한 권장사항**:
   - "콘텐츠 품질을 개선하세요" ❌ (너무 일반적)
   - "검색어 '${query}'에 대한 ${topCompetitorDomain}의 콘텐츠 구조를 벤치마킹하고, 비교표와 구체적 수치를 추가하세요" ✅ (구체적)
   - 각 권장사항에 예상 효과와 우선순위 포함

## 출력 구조

### 1. 종합 평가 (3-4문장)
- 현재 노출률(${exposureRate}%)과 경쟁 상황을 명시
- 가장 심각한 문제점 1개와 가장 큰 기회 1개 언급

### 2. 강점 분석 (노출된 LLM 기준)
${exposedLLMs.length > 0 ? exposedLLMs.map(llm => `- ${llm}에서 노출된 이유 분석`).join('\n') : '- 현재 강점 없음 (전체 미노출 상태)'}

### 3. 개선 필요 사항 (미노출 LLM별 구체적 전략)
${notExposedLLMs.length > 0 ? notExposedLLMs.map(llm => `- **${llm}**: 해당 LLM 특성에 맞는 구체적 개선안 (수치 목표 포함)`).join('\n') : '- 노출 품질 향상을 위한 개선안'}

### 4. 경쟁사 분석 (3-4문장)
- ${topCompetitorDomain}이 상위 노출된 이유 분석
- 경쟁 브랜드 대비 내 브랜드 포지셔닝
- 차별화 전략 제안

### 5. 핵심 권장사항 (우선순위별 3-5개)
- 즉시 실행 가능한 액션 아이템
- 각 항목에 예상 효과 명시 (예: "Perplexity 노출 확률 30% 향상 예상")
- 구체적 수치 목표 포함

마크다운 형식으로 작성하되, **이 분석 결과에만 해당하는** 맞춤형 조언을 제공해주세요.`
}
