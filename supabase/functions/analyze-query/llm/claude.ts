/**
 * Claude API 호출 함수
 */

import type { LLMResult, UnifiedCitation } from './types.ts'

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

interface ClaudeWebSearchResult {
  type: string
  url: string
  title?: string
  snippet?: string
}

interface ClaudeContentBlock {
  type: string
  name?: string
  input?: unknown
  content?: ClaudeWebSearchResult[]
  text?: string
}

interface ClaudeResponse {
  content: ClaudeContentBlock[]
}

/**
 * Claude API 호출 및 인용 추출
 */
export async function callClaude(query: string): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        tools: [
          {
            type: 'web_search_20250305',
            max_uses: 5,
          },
        ],
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data: ClaudeResponse = await response.json()
    console.log('[DEBUG Claude] Raw response:', JSON.stringify(data))
    const responseTime = Date.now() - startTime

    // content 블록에서 텍스트와 web_search_tool_result 추출
    let answer = ''
    const searchResults: ClaudeWebSearchResult[] = []

    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        answer += block.text
      } else if (block.type === 'web_search_tool_result' && block.content) {
        searchResults.push(...block.content)
      }
    }

    // searchResults를 UnifiedCitation으로 변환 (제외 도메인 필터링 포함)
    let citationsFiltered = 0
    const citations: UnifiedCitation[] = searchResults
      .filter(result => {
        if (result.type !== 'web_search_result') return false
        // 제외 도메인 필터링
        const domain = extractDomain(result.url)
        if (isExcludedDomain(domain)) {
          citationsFiltered++
          return false
        }
        return true
      })
      .map((result, index) => normalizeClaudeCitation(result, index + 1, answer))

    return {
      success: true,
      model: 'claude-3-5-haiku-20241022',
      answer,
      citations,
      responseTime,
      timestamp: new Date().toISOString(),
      _debug: {
        searchResultsCount: searchResults.length,
        citationsFiltered,
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      model: 'claude-3-5-haiku-20241022',
      answer: '',
      citations: [],
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Claude 인용을 UnifiedCitation으로 변환
 */
function normalizeClaudeCitation(
  result: ClaudeWebSearchResult,
  position: number,
  answer: string
): UnifiedCitation {
  const domain = extractDomain(result.url)
  const cleanUrl = removeQueryParams(result.url)
  const mentionCount = countMentions(result.url, answer)

  return {
    id: crypto.randomUUID(),
    source: 'claude',
    position,
    url: result.url,
    cleanUrl,
    domain,
    title: result.title || null,
    snippet: result.snippet || null,
    publishedDate: null,
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
 * 답변에서 도메인 언급 횟수 카운트
 * 전체 URL 대신 도메인으로 검색하여 더 정확한 카운트 제공
 * 예: "https://meritz.com/page" → "meritz.com" 검색
 */
function countMentions(url: string, answer: string): number {
  const domain = extractDomain(url)
  if (!domain) return 1  // 도메인 추출 실패 시 기본값 1

  // 도메인의 점(.)을 이스케이프하여 정규식 생성
  const escapedDomain = domain.replace(/\./g, '\\.')
  const regex = new RegExp(escapedDomain, 'gi')
  const matches = answer.match(regex)

  // API가 반환한 인용은 최소 1회 언급된 것으로 간주
  return matches ? Math.max(matches.length, 1) : 1
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
