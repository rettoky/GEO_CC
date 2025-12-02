/**
 * Claude (Anthropic) API Client
 * Anthropic Claude를 사용한 응답 생성
 */

import type { LLMResult, Citation } from '@/types'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: Array<{
    type: 'text'
    text: string
  }>
  model: string
  stop_reason: string
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Claude API 호출
 */
export async function analyzeWithClaude(
  query: string,
  apiKey: string
): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        temperature: 0.3,
        system:
          'You are a helpful assistant. When providing information, cite specific sources with URLs when possible. Format citations clearly as [Source: URL].',
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Claude API error: ${response.status} - ${errorText}`)
    }

    const data: ClaudeResponse = await response.json()
    const responseTime = Date.now() - startTime

    // 응답 텍스트 추출
    const answerText = data.content[0]?.text || ''

    // URL 패턴 추출
    const urlRegex = /https?:\/\/[^\s\)]+/g
    const urls = answerText.match(urlRegex) || []
    const uniqueUrls = Array.from(new Set(urls))

    // Citation 객체 생성
    const citations: Citation[] = uniqueUrls
      .map((url, index) => {
        try {
          const urlObj = new URL(url)
          const domain = urlObj.hostname.replace(/^www\./, '')

          // URL 주변 텍스트를 스니펫으로 추출
          const urlIndex = answerText.indexOf(url)
          const snippetStart = Math.max(0, urlIndex - 100)
          const snippetEnd = Math.min(
            answerText.length,
            urlIndex + url.length + 100
          )
          const snippet = answerText
            .substring(snippetStart, snippetEnd)
            .trim()
            .replace(/\[Source:.*?\]/g, '')
            .trim()

          return {
            url: url.replace(/[.,;!?]$/, ''), // 끝 구두점 제거
            domain,
            position: index + 1,
            snippet: snippet || '',
          }
        } catch (error) {
          console.error('Invalid URL:', url, error)
          return null
        }
      })
      .filter((c): c is Citation => c !== null)

    return {
      success: true,
      query,
      answer: answerText,
      citations,
      metadata: {
        model: data.model,
        responseTime,
        tokenUsage: {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        },
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('Claude analysis error:', error)

    return {
      success: false,
      query,
      answer: '',
      citations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        model: 'claude-3-5-sonnet-20241022',
        responseTime,
      },
    }
  }
}

/**
 * Claude 검색 증강 (외부 검색 결과 활용)
 */
export async function analyzeWithClaudeSearch(
  query: string,
  apiKey: string,
  searchResults?: string[]
): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    let systemPrompt =
      'You are a helpful assistant with access to web search results.'
    let userPrompt = query

    if (searchResults && searchResults.length > 0) {
      systemPrompt +=
        ' Use the provided search results to answer the question and cite specific URLs.'
      userPrompt = `Question: ${query}\n\nSearch Results:\n${searchResults.join('\n\n')}`
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Claude search API error: ${response.status} - ${errorText}`
      )
    }

    const data: ClaudeResponse = await response.json()
    const responseTime = Date.now() - startTime

    const answerText = data.content[0]?.text || ''

    // URL 추출 및 Citation 생성
    const urlRegex = /https?:\/\/[^\s\)]+/g
    const urls = answerText.match(urlRegex) || []
    const uniqueUrls = Array.from(new Set(urls))

    const citations: Citation[] = uniqueUrls
      .map((url, index) => {
        try {
          const urlObj = new URL(url)
          const domain = urlObj.hostname.replace(/^www\./, '')

          return {
            url: url.replace(/[.,;!?]$/, ''),
            domain,
            position: index + 1,
            snippet: '',
          }
        } catch (error) {
          return null
        }
      })
      .filter((c): c is Citation => c !== null)

    return {
      success: true,
      query,
      answer: answerText,
      citations,
      metadata: {
        model: data.model,
        responseTime,
        tokenUsage: {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        },
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('Claude search analysis error:', error)

    return {
      success: false,
      query,
      answer: '',
      citations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        model: 'claude-3-5-sonnet-20241022',
        responseTime,
      },
    }
  }
}

/**
 * Claude API Key 유효성 검사
 */
export async function validateClaudeApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'test',
          },
        ],
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Claude API key validation error:', error)
    return false
  }
}
