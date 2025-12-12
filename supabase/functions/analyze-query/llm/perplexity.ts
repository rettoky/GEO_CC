/**
 * Perplexity API 호출 함수
 */

import type { LLMResult, UnifiedCitation, TextSpan } from './types.ts'

/**
 * 제외할 내부 서비스 도메인 목록
 * LLM/검색 인프라 도메인은 실제 콘텐츠 제공자가 아님
 */
const EXCLUDED_DOMAINS = [
  'vertexaisearch.cloud.google.com',
  'googleapis.com',
  'googleusercontent.com',
  'gstatic.com',
]

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
    let citationsFiltered = 0

    if (data.search_results && data.search_results.length > 0) {
      data.search_results.forEach((result, index) => {
        // 제외 도메인 필터링
        const domain = extractDomain(result.url)
        if (isExcludedDomain(domain)) {
          citationsFiltered++
          return
        }
        citations.push(normalizePerplexityCitation(result, index + 1, answer))
      })
    } else if (data.citations && data.citations.length > 0) {
      data.citations.forEach((url, index) => {
        // 제외 도메인 필터링
        const domain = extractDomain(url)
        if (isExcludedDomain(domain)) {
          citationsFiltered++
          return
        }
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
      _debug: {
        searchResultsCount: data.search_results?.length ?? 0,
        citationsCount: data.citations?.length ?? 0,
        citationsFiltered,
      },
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
  // 인용 마커 위치를 텍스트 스팬으로 추출
  const textSpans = extractCitationMarkerSpans(position, answer)

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
 * 답변에서 인용 번호 [1], [2] 등의 언급 횟수 카운트 (방법론 문서 Section 2.1)
 * Perplexity는 답변 텍스트에서 [1] 설명... [2] 추가 설명... 형식으로 인용 표시
 */
function countCitationMarkers(citationIndex: number, answer: string): number {
  // [1], [2], ... 형식의 인용 마커 찾기
  const pattern = new RegExp(`\\[${citationIndex}\\]`, 'g')
  const matches = answer.match(pattern)
  // API가 인용을 반환했으므로 최소 1회는 참조된 것으로 간주
  return matches ? matches.length : 1
}

/**
 * 답변에서 인용 마커 [N] 위치를 TextSpan 배열로 추출
 */
function extractCitationMarkerSpans(citationIndex: number, answer: string): TextSpan[] {
  const textSpans: TextSpan[] = []
  const pattern = new RegExp(`\\[${citationIndex}\\]`, 'g')
  let match

  while ((match = pattern.exec(answer)) !== null) {
    // 마커 앞뒤로 문맥을 포함한 텍스트 추출 (최대 50자)
    const contextStart = Math.max(0, match.index - 30)
    const contextEnd = Math.min(answer.length, match.index + match[0].length + 30)
    const contextText = answer.substring(contextStart, contextEnd)

    textSpans.push({
      start: match.index,
      end: match.index + match[0].length,
      text: contextText.trim(),
    })
  }

  return textSpans
}

/**
 * 제외 도메인 여부 확인
 */
function isExcludedDomain(domain: string): boolean {
  if (!domain) return false
  const normalizedDomain = domain.toLowerCase()
  return EXCLUDED_DOMAINS.some(excluded =>
    normalizedDomain === excluded || normalizedDomain.endsWith('.' + excluded)
  )
}
