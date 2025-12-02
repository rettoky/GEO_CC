/**
 * Gemini (Google AI) API Client
 * Google Gemini를 사용한 응답 생성
 */

import type { LLMResult, Citation } from '@/types'

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
      role: string
    }
    finishReason: string
    safetyRatings: Array<{
      category: string
      probability: string
    }>
  }>
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

/**
 * Gemini API 호출
 */
export async function analyzeWithGemini(
  query: string,
  apiKey: string
): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const model = 'gemini-1.5-flash-latest'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${query}\n\nWhen answering, please cite specific sources with URLs when possible. Format citations clearly.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data: GeminiResponse = await response.json()
    const responseTime = Date.now() - startTime

    // 응답 텍스트 추출
    const answerText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || ''

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
        model,
        responseTime,
        tokenUsage: {
          prompt_tokens: data.usageMetadata?.promptTokenCount,
          completion_tokens: data.usageMetadata?.candidatesTokenCount,
          total_tokens: data.usageMetadata?.totalTokenCount,
        },
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('Gemini analysis error:', error)

    return {
      success: false,
      query,
      answer: '',
      citations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        model: 'gemini-1.5-flash-latest',
        responseTime,
      },
    }
  }
}

/**
 * Gemini 검색 증강 생성 (Grounding with Google Search)
 * 참고: Grounding 기능은 별도 설정 필요할 수 있음
 */
export async function analyzeWithGeminiSearch(
  query: string,
  apiKey: string
): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const model = 'gemini-1.5-flash-latest'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const response = await fetch(url, {
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
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
        // Grounding 설정 (실험적 기능)
        tools: [
          {
            googleSearchRetrieval: {
              dynamicRetrievalConfig: {
                mode: 'MODE_DYNAMIC',
                dynamicThreshold: 0.7,
              },
            },
          },
        ],
      }),
    })

    if (!response.ok) {
      // Grounding 지원 안 되면 기본 분석으로 폴백
      console.warn('Gemini grounding not available, falling back to basic analysis')
      return analyzeWithGemini(query, apiKey)
    }

    const data: GeminiResponse = await response.json()
    const responseTime = Date.now() - startTime

    const answerText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

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
        model,
        responseTime,
        tokenUsage: {
          prompt_tokens: data.usageMetadata?.promptTokenCount,
          completion_tokens: data.usageMetadata?.candidatesTokenCount,
          total_tokens: data.usageMetadata?.totalTokenCount,
        },
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('Gemini search analysis error:', error)

    return {
      success: false,
      query,
      answer: '',
      citations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        model: 'gemini-1.5-flash-latest',
        responseTime,
      },
    }
  }
}

/**
 * Gemini API Key 유효성 검사
 */
export async function validateGeminiApiKey(apiKey: string): Promise<boolean> {
  try {
    const model = 'gemini-1.5-flash-latest'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`

    const response = await fetch(url)
    return response.ok
  } catch (error) {
    console.error('Gemini API key validation error:', error)
    return false
  }
}
