/**
 * ChatGPT (OpenAI) API Client
 * OpenAI GPT-4o를 사용한 응답 생성
 */

import OpenAI from 'openai'
import type { LLMResult, Citation } from '@/types'

/**
 * ChatGPT API 호출
 */
export async function analyzeWithChatGPT(
  query: string,
  apiKey: string
): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant. When providing information, cite your sources with specific URLs when possible. Format citations as [Source: URL] at the end of relevant sentences.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const responseTime = Date.now() - startTime
    const answerText = completion.choices[0]?.message?.content || ''

    // URL 패턴 추출 (답변에서 인용된 URL 찾기)
    const urlRegex = /https?:\/\/[^\s\)]+/g
    const urls = answerText.match(urlRegex) || []

    // 중복 제거 및 Citation 객체 생성
    const uniqueUrls = Array.from(new Set(urls))
    const citations: Citation[] = uniqueUrls
      .map((url, index) => {
        try {
          const urlObj = new URL(url)
          const domain = urlObj.hostname.replace(/^www\./, '')

          // URL 주변 텍스트를 스니펫으로 추출 (간단한 방법)
          const urlIndex = answerText.indexOf(url)
          const snippetStart = Math.max(0, urlIndex - 100)
          const snippetEnd = Math.min(answerText.length, urlIndex + url.length + 100)
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
        model: completion.model,
        responseTime,
        tokenUsage: {
          prompt_tokens: completion.usage?.prompt_tokens,
          completion_tokens: completion.usage?.completion_tokens,
          total_tokens: completion.usage?.total_tokens,
        },
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('ChatGPT analysis error:', error)

    return {
      success: false,
      query,
      answer: '',
      citations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        model: 'gpt-4o',
        responseTime,
      },
    }
  }
}

/**
 * ChatGPT 검색 모드 (Web Browsing 시뮬레이션)
 * GPT-4o는 기본적으로 웹 검색을 지원하지 않으므로,
 * 사용자가 검색 결과를 제공하거나 별도의 검색 API 통합 필요
 */
export async function analyzeWithChatGPTSearch(
  query: string,
  apiKey: string,
  searchResults?: string[]
): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const openai = new OpenAI({ apiKey })

    let systemPrompt = 'You are a helpful assistant with access to web search results.'
    let userPrompt = query

    if (searchResults && searchResults.length > 0) {
      systemPrompt +=
        ' Use the provided search results to answer the question and cite specific URLs.'
      userPrompt = `Question: ${query}\n\nSearch Results:\n${searchResults.join('\n\n')}`
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const responseTime = Date.now() - startTime
    const answerText = completion.choices[0]?.message?.content || ''

    // URL 추출 및 Citation 생성 (위와 동일)
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
        model: completion.model,
        responseTime,
        tokenUsage: {
          prompt_tokens: completion.usage?.prompt_tokens,
          completion_tokens: completion.usage?.completion_tokens,
          total_tokens: completion.usage?.total_tokens,
        },
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('ChatGPT search analysis error:', error)

    return {
      success: false,
      query,
      answer: '',
      citations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        model: 'gpt-4o',
        responseTime,
      },
    }
  }
}

/**
 * OpenAI API Key 유효성 검사
 */
export async function validateOpenAIApiKey(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey })
    await openai.models.list()
    return true
  } catch (error) {
    console.error('OpenAI API key validation error:', error)
    return false
  }
}
