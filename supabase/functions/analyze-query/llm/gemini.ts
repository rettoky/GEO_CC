/**
 * Gemini API 호출 함수
 */

import type { LLMResult, UnifiedCitation } from './types.ts'

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

    const data: GeminiResponse = await response.json()
    const responseTime = Date.now() - startTime

    const candidate = data.candidates[0]
    const answer = candidate?.content?.parts?.map(p => p.text).join('') || ''
    const groundingMetadata = candidate?.groundingMetadata

    const citations: UnifiedCitation[] = []

    if (groundingMetadata?.groundingChunks) {
      const chunks = groundingMetadata.groundingChunks
      const supports = groundingMetadata.groundingSupports || []

      chunks.forEach((chunk, index) => {
        if (chunk.web) {
          // 이 chunk를 참조하는 supports 찾기
          const relatedSupports = supports.filter(
            s => s.groundingChunkIndices?.includes(index)
          )

          const confidenceScores = relatedSupports
            .flatMap(s => s.confidenceScores || [])
            .filter(score => score !== undefined)

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
              confidenceScores
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
 * Gemini 인용을 UnifiedCitation으로 변환
 */
function normalizeGeminiCitation(
  web: { uri: string; title?: string },
  position: number,
  answer: string,
  avgConfidence: number | null,
  confidenceScores: number[]
): UnifiedCitation {
  const domain = extractDomain(web.uri)
  const cleanUrl = removeQueryParams(web.uri)
  const mentionCount = countMentions(web.uri, answer)

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
    textSpans: [],
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
 * 답변에서 URL 언급 횟수 카운트
 */
function countMentions(url: string, answer: string): number {
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escapedUrl, 'gi')
  const matches = answer.match(regex)
  return matches ? matches.length : 0
}
