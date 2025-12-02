/**
 * Perplexity API Client
 * Perplexity AI API를 사용한 검색 기반 응답 생성
 */

import type { LLMResult, Citation } from '@/types'

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PerplexityResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  citations?: string[]
}

/**
 * Perplexity API 호출
 */
export async function analyzeWithPerplexity(
  query: string,
  apiKey: string
): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content:
          'You are a helpful search assistant. When answering, provide specific sources and citations for your information.',
      },
      {
        role: 'user',
        content: query,
      },
    ]

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages,
        temperature: 0.2,
        max_tokens: 2000,
        return_citations: true,
        search_recency_filter: 'month',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Perplexity API error: ${response.status} - ${errorText}`
      )
    }

    const data: PerplexityResponse = await response.json()
    const responseTime = Date.now() - startTime

    // 응답 텍스트 추출
    const answerText = data.choices[0]?.message?.content || ''

    // 인용 추출 (Perplexity는 citations 배열 제공)
    const citations: Citation[] = []
    if (data.citations && data.citations.length > 0) {
      data.citations.forEach((url, index) => {
        try {
          const urlObj = new URL(url)
          const domain = urlObj.hostname.replace(/^www\./, '')

          citations.push({
            url,
            domain,
            position: index + 1,
            snippet: '', // Perplexity는 스니펫을 별도로 제공하지 않음
          })
        } catch (error) {
          console.error('Invalid citation URL:', url, error)
        }
      })
    }

    return {
      success: true,
      query,
      answer: answerText,
      citations,
      metadata: {
        model: data.model,
        responseTime,
        tokenUsage: data.usage,
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('Perplexity analysis error:', error)

    return {
      success: false,
      query,
      answer: '',
      citations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        model: 'llama-3.1-sonar-large-128k-online',
        responseTime,
      },
    }
  }
}

/**
 * Perplexity API Key 유효성 검사
 */
export async function validatePerplexityApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Perplexity API key validation error:', error)
    return false
  }
}
