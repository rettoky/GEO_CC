import { NextRequest, NextResponse } from 'next/server'

interface ReviewRequest {
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
 * POST /api/generate-review
 * Gemini를 사용하여 분석 결과에 대한 최종 검토 의견 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body: ReviewRequest = await request.json()

    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Google AI API key not configured' },
        { status: 500 }
      )
    }

    // Gemini에게 전달할 프롬프트 구성
    const prompt = buildReviewPrompt(body)

    // Gemini API 호출 (gemini-1.5-flash 사용 - 빠른 응답)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
            maxOutputTokens: 2048,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      return NextResponse.json(
        { success: false, error: `Gemini API error: ${response.status}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const review = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return NextResponse.json({
      success: true,
      review,
    })
  } catch (error) {
    console.error('Generate review error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Gemini 프롬프트 생성
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

  return `당신은 GEO(Generative Engine Optimization) 전문 컨설턴트입니다.
아래 AI 검색 엔진 분석 결과를 바탕으로 전문적인 최종 검토 의견을 한국어로 작성해주세요.

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

## LLM별 결과
${llmSummary}

## 상위 인용 도메인 (경쟁사)
${topDomainsText || '데이터 없음'}

## 요청사항
위 분석 결과를 종합하여 다음 구조로 최종 검토 의견을 작성해주세요:

1. **종합 평가** (2-3문장): 현재 AI 검색 노출 상태에 대한 전반적인 평가
2. **강점 분석** (2-3개 항목): 현재 잘 되고 있는 부분
3. **개선 필요 사항** (2-3개 항목): 즉시 개선이 필요한 부분
4. **경쟁사 분석** (2-3문장): 상위 인용 도메인 대비 경쟁력 분석
5. **핵심 권장사항** (3-5개): 우선순위가 높은 구체적인 실행 방안

마크다운 형식으로 작성하되, 실용적이고 즉시 실행 가능한 조언을 제공해주세요.
전문적이지만 이해하기 쉬운 언어를 사용해주세요.`
}
