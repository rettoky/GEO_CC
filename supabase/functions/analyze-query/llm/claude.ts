/**
 * Claude API 호출 함수
 */

import type { LLMResult, UnifiedCitation } from './types.ts'

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
        model: 'claude-sonnet-4-20250514',
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

    // searchResults를 UnifiedCitation으로 변환
    const citations: UnifiedCitation[] = searchResults
      .filter(result => result.type === 'web_search_result')
      .map((result, index) => normalizeClaudeCitation(result, index + 1, answer))

    return {
      success: true,
      model: 'claude-sonnet-4-20250514',
      answer,
      citations,
      responseTime,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      model: 'claude-sonnet-4-20250514',
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
 * 답변에서 URL 언급 횟수 카운트
 */
function countMentions(url: string, answer: string): number {
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escapedUrl, 'gi')
  const matches = answer.match(regex)
  return matches ? matches.length : 0
}
