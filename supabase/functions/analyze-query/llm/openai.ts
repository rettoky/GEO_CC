/**
 * OpenAI Responses API 호출 함수
 */

import type { LLMResult, UnifiedCitation, TextSpan } from './types.ts'

interface OpenAIAnnotation {
  type: string
  url: string
  title?: string
  start_index: number
  end_index: number
}

interface OpenAIResponse {
  output: Array<{
    type: string
    content?: Array<{
      type: string
      text?: string
      annotations?: OpenAIAnnotation[]
    }>
  }>
}

/**
 * OpenAI Responses API 호출 및 인용 추출
 */
export async function callOpenAI(query: string): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found')
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: query,
        tools: [{ type: 'web_search_preview' }],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data: OpenAIResponse = await response.json()
    const responseTime = Date.now() - startTime

    // output에서 텍스트와 annotations 추출
    let answer = ''
    const annotations: OpenAIAnnotation[] = []

    for (const output of data.output) {
      if (output.type === 'message' && output.content) {
        for (const content of output.content) {
          if (content.type === 'output_text') {
            answer += content.text || ''
            if (content.annotations) {
              annotations.push(...content.annotations)
            }
          }
        }
      }
    }

    // annotations를 UnifiedCitation으로 변환
    const citationMap = new Map<string, { annotation: OpenAIAnnotation; positions: number[] }>()

    annotations.forEach((annotation, index) => {
      if (annotation.type === 'url_citation') {
        const existing = citationMap.get(annotation.url)
        if (existing) {
          existing.positions.push(index + 1)
        } else {
          citationMap.set(annotation.url, { annotation, positions: [index + 1] })
        }
      }
    })

    const citations: UnifiedCitation[] = Array.from(citationMap.values()).map(
      ({ annotation, positions }, index) =>
        normalizeOpenAICitation(annotation, index + 1, answer, positions)
    )

    return {
      success: true,
      model: 'gpt-4o',
      answer,
      citations,
      responseTime,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      model: 'gpt-4o',
      answer: '',
      citations: [],
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * OpenAI 인용을 UnifiedCitation으로 변환
 */
function normalizeOpenAICitation(
  annotation: OpenAIAnnotation,
  position: number,
  answer: string,
  positions: number[]
): UnifiedCitation {
  const domain = extractDomain(annotation.url)
  const cleanUrl = removeQueryParams(annotation.url)

  const textSpans: TextSpan[] = positions.map(pos => ({
    start: annotation.start_index,
    end: annotation.end_index,
    text: answer.substring(annotation.start_index, annotation.end_index),
  }))

  return {
    id: crypto.randomUUID(),
    source: 'chatgpt',
    position,
    url: annotation.url,
    cleanUrl,
    domain,
    title: annotation.title || null,
    snippet: null,
    publishedDate: null,
    mentionCount: positions.length,
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
