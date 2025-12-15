/**
 * OpenAI Responses API 호출 함수
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
        model: 'gpt-4o-mini',
        input: query,
        tools: [{
          type: 'web_search_preview',
          search_context_size: 'low',  // 비용 절감: medium(기본) → low
        }],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data: OpenAIResponse = await response.json()
    console.log('[DEBUG OpenAI] Raw response:', JSON.stringify(data))
    const responseTime = Date.now() - startTime

    // output에서 텍스트와 annotations 추출
    // 다중 output_text 블록 시 인덱스 오프셋 적용 (방법론 문서 Section 2.2)
    let answer = ''
    const annotations: OpenAIAnnotation[] = []
    let answerOffset = 0

    for (const output of data.output) {
      if (output.type === 'message' && output.content) {
        for (const content of output.content) {
          if (content.type === 'output_text') {
            const text = content.text || ''
            answer += text
            if (content.annotations) {
              // 각 annotation의 인덱스에 현재 오프셋 적용
              content.annotations.forEach(ann => {
                annotations.push({
                  ...ann,
                  start_index: ann.start_index + answerOffset,
                  end_index: ann.end_index + answerOffset,
                })
              })
            }
            answerOffset += text.length
          }
        }
      }
    }

    // annotations를 UnifiedCitation으로 변환 (방법론 문서 Section 2.2)
    // 각 URL에 대한 모든 annotation을 수집하여 textSpans 생성
    const citationMap = new Map<string, {
      annotations: OpenAIAnnotation[]
      textSpans: import('./types.ts').TextSpan[]
    }>()

    let citationsFiltered = 0

    annotations.forEach((annotation) => {
      if (annotation.type === 'url_citation') {
        // 제외 도메인 필터링
        const domain = extractDomain(annotation.url)
        if (isExcludedDomain(domain)) {
          citationsFiltered++
          return
        }

        // URL 정규화 (쿼리 파라미터 제거)
        const cleanUrl = annotation.url.split('?')[0]

        const existing = citationMap.get(cleanUrl)
        if (existing) {
          existing.annotations.push(annotation)
          existing.textSpans.push({
            start: annotation.start_index,
            end: annotation.end_index,
            text: answer.substring(annotation.start_index, annotation.end_index),
          })
        } else {
          citationMap.set(cleanUrl, {
            annotations: [annotation],
            textSpans: [{
              start: annotation.start_index,
              end: annotation.end_index,
              text: answer.substring(annotation.start_index, annotation.end_index),
            }],
          })
        }
      }
    })

    const citations: UnifiedCitation[] = Array.from(citationMap.values()).map(
      ({ annotations: annots, textSpans }, index) =>
        normalizeOpenAICitation(annots[0], index + 1, textSpans)
    )

    return {
      success: true,
      model: 'gpt-4o-mini',
      answer,
      citations,
      responseTime,
      timestamp: new Date().toISOString(),
      _debug: {
        annotationsCount: annotations.length,
        uniqueUrlsCount: citationMap.size,
        citationsFiltered,
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      model: 'gpt-4o-mini',
      answer: '',
      citations: [],
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * OpenAI 인용을 UnifiedCitation으로 변환 (방법론 문서 Section 2.2)
 * 각 annotation의 실제 위치를 textSpans에 보존
 */
function normalizeOpenAICitation(
  annotation: OpenAIAnnotation,
  position: number,
  textSpans: TextSpan[]
): UnifiedCitation {
  const domain = extractDomain(annotation.url)
  const cleanUrl = removeQueryParams(annotation.url)

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
    mentionCount: textSpans.length,
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
 * 제외 도메인 여부 확인
 */
function isExcludedDomain(domain: string): boolean {
  if (!domain) return false
  const normalizedDomain = domain.toLowerCase()
  return EXCLUDED_DOMAINS.some(excluded =>
    normalizedDomain === excluded || normalizedDomain.endsWith('.' + excluded)
  )
}
