/**
 * Gemini API 호출 함수
 */

import type { LLMResult, UnifiedCitation, TextSpan } from './types.ts'

/**
 * 제외할 내부 서비스 도메인 목록
 * 이 도메인들은 실제 콘텐츠 제공자가 아닌 LLM/검색 인프라 도메인
 */
const EXCLUDED_DOMAINS = [
  'vertexaisearch.cloud.google.com',
  'googleapis.com',
  'googleusercontent.com',
  'gstatic.com',
]

interface GeminiGroundingChunk {
  web?: {
    uri: string
    title?: string
  }
}

interface GeminiGroundingSupport {
  groundingChunkIndices?: number[]
  confidenceScores?: number[]
  segment?: {
    startIndex?: number
    endIndex?: number
    text?: string
  }
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
    groundingMetadata?: {
      groundingChunks?: GeminiGroundingChunk[]
      groundingSupports?: GeminiGroundingSupport[]
    }
  }>
}

/**
 * Gemini API 호출 및 인용 추출
 */
export async function callGemini(query: string): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not found')
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
                  text: query,
                },
              ],
            },
          ],
          tools: [
            {
              googleSearch: {},
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('[DEBUG Gemini] Raw response:', JSON.stringify(data))
    const responseTime = Date.now() - startTime

    const candidate = data.candidates?.[0]
    const answer = candidate?.content?.parts?.map((p: {text?: string}) => p.text).join('') || ''
    const groundingMetadata = candidate?.groundingMetadata

    // 디버그: groundingMetadata 존재 여부 확인
    console.log('[DEBUG Gemini] groundingMetadata exists:', !!groundingMetadata)
    console.log('[DEBUG Gemini] groundingChunks:', JSON.stringify(groundingMetadata?.groundingChunks))

    const citations: UnifiedCitation[] = []

    if (groundingMetadata?.groundingChunks) {
      const chunks = groundingMetadata.groundingChunks
      const supports = groundingMetadata.groundingSupports || []

      chunks.forEach((chunk, index) => {
        if (chunk.web) {
          // Gemini의 URI는 vertexaisearch.cloud.google.com 리다이렉트이므로
          // title 필드에서 실제 도메인을 추출 (예: "wikipedia.org", "naver.com")
          const domain = chunk.web.title?.toLowerCase().replace(/^www\./, '') || ''

          // 빈 도메인이면 건너뛰기
          if (!domain) {
            return
          }

          // 이 chunk를 참조하는 supports 찾기
          const relatedSupports = supports.filter(
            s => s.groundingChunkIndices?.includes(index)
          )

          const confidenceScores: number[] = []
          const textSpans: TextSpan[] = []

          // 각 support에서 confidence scores와 text spans 추출 (방법론 문서 Section 2.3)
          relatedSupports.forEach(support => {
            // confidence score 추출
            const supportIndex = support.groundingChunkIndices?.indexOf(index) ?? -1
            if (supportIndex >= 0 && support.confidenceScores?.[supportIndex] !== undefined) {
              const confidence = support.confidenceScores[supportIndex]
              confidenceScores.push(confidence)

              // text span 추출 (segment 정보)
              if (support.segment) {
                textSpans.push({
                  start: support.segment.startIndex ?? 0,
                  end: support.segment.endIndex ?? 0,
                  text: support.segment.text ?? '',
                  confidence,
                })
              }
            }
          })

          const avgConfidence =
            confidenceScores.length > 0
              ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
              : null

          citations.push(
            normalizeGeminiCitation(
              chunk.web,
              index + 1,
              answer,
              avgConfidence,
              confidenceScores,
              textSpans
            )
          )
        }
      })
    }

    return {
      success: true,
      model: 'gemini-2.0-flash',
      answer,
      citations,
      responseTime,
      timestamp: new Date().toISOString(),
      // 디버그 정보 추가
      _debug: {
        hasGroundingMetadata: !!groundingMetadata,
        groundingChunksCount: groundingMetadata?.groundingChunks?.length ?? 0,
        groundingSupportsCount: groundingMetadata?.groundingSupports?.length ?? 0,
        rawGroundingMetadata: groundingMetadata,
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      model: 'gemini-2.0-flash',
      answer: '',
      citations: [],
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Gemini 인용을 UnifiedCitation으로 변환 (방법론 문서 Section 2.3)
 * textSpans에 groundingSupports의 segment 정보 포함
 */
function normalizeGeminiCitation(
  web: { uri: string; title?: string },
  position: number,
  answer: string,
  avgConfidence: number | null,
  confidenceScores: number[],
  textSpans: TextSpan[]
): UnifiedCitation {
  // Gemini의 URI는 vertexaisearch.cloud.google.com 리다이렉트
  // 실제 도메인은 title 필드에 있음 (예: "wikipedia.org", "naver.com")
  const domain = web.title?.toLowerCase().replace(/^www\./, '') || extractDomain(web.uri)
  const cleanUrl = removeQueryParams(web.uri)
  // Gemini는 URL 문자열 매칭 대신 textSpans.length를 사용
  const mentionCount = textSpans.length > 0 ? textSpans.length : 1

  return {
    id: crypto.randomUUID(),
    source: 'gemini',
    position,
    url: web.uri,
    cleanUrl,
    domain,
    title: web.title || null,
    snippet: null,
    publishedDate: null,
    mentionCount,
    avgConfidence,
    confidenceScores,
    textSpans,
  }
}

/**
 * URL에서 도메인 추출 (www 제거)
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    let domain = urlObj.hostname.toLowerCase()
    if (domain.startsWith('www.')) {
      domain = domain.substring(4)
    }
    return domain
  } catch {
    return ''
  }
}

/**
 * URL에서 쿼리 파라미터 제거
 */
function removeQueryParams(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
  } catch {
    return url
  }
}

/**
 * 제외 도메인 여부 확인
 * LLM/검색 인프라 내부 도메인은 경쟁력 분석에서 제외
 */
function isExcludedDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase()
  return EXCLUDED_DOMAINS.some(excluded =>
    normalizedDomain === excluded || normalizedDomain.endsWith('.' + excluded)
  )
}
