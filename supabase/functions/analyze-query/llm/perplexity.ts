/**
 * Perplexity API 호출 함수
 */

import type { LLMResult, UnifiedCitation } from './types.ts'

interface PerplexitySearchResult {
  url: string
  title: string
  snippet?: string
  date?: string
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  search_results?: PerplexitySearchResult[]
  citations?: string[]
}

/**
 * Perplexity API 호출 및 인용 추출
 */
export async function callPerplexity(query: string): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY not found')
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
        search_context_size: 'high',
      }),
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`)
    }

    const data: PerplexityResponse = await response.json()
    console.log('[DEBUG Perplexity] Raw response:', JSON.stringify(data))
    const answer = data.choices[0]?.message?.content || ''
    const responseTime = Date.now() - startTime

    // search_results 우선, 없으면 citations 사용
    const citations: UnifiedCitation[] = []

    if (data.search_results && data.search_results.length > 0) {
      data.search_results.forEach((result, index) => {
        citations.push(normalizePerplexityCitation(result, index + 1, answer))
      })
    } else if (data.citations && data.citations.length > 0) {
      data.citations.forEach((url, index) => {
        citations.push(normalizePerplexityCitation({ url, title: '', snippet: '' }, index + 1, answer))
      })
    }

    return {
      success: true,
      model: 'sonar',
      answer,
      citations,
      responseTime,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      model: 'sonar',
      answer: '',
      citations: [],
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Perplexity 인용을 UnifiedCitation으로 변환 (방법론 문서 Section 2.1)
 * position은 1부터 시작하며, 답변 텍스트의 [1], [2] 등의 마커와 대응
 */
function normalizePerplexityCitation(
  result: PerplexitySearchResult,
  position: number,
  answer: string
): UnifiedCitation {
  const domain = extractDomain(result.url)
  const cleanUrl = removeQueryParams(result.url)
  // [1], [2] 형태의 인용 마커 카운트 (방법론 문서 권장 방식)
  const mentionCount = countCitationMarkers(position, answer)

  return {
    id: crypto.randomUUID(),
    source: 'perplexity',
    position,
    url: result.url,
    cleanUrl,
    domain,
    title: result.title || null,
    snippet: result.snippet || null,
    publishedDate: result.date || null,
    mentionCount,
    avgConfidence: null,
    confidenceScores: [],
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
 * 답변에서 인용 번호 [1], [2] 등의 언급 횟수 카운트 (방법론 문서 Section 2.1)
 * Perplexity는 답변 텍스트에서 [1] 설명... [2] 추가 설명... 형식으로 인용 표시
 */
function countCitationMarkers(citationIndex: number, answer: string): number {
  // [1], [2], ... 형식의 인용 마커 찾기
  const pattern = new RegExp(`\\[${citationIndex}\\]`, 'g')
  const matches = answer.match(pattern)
  return matches ? matches.length : 0
}
