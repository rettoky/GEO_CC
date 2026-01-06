/**
 * OpenAI Responses API 호출 함수
 */

import type { LLMResult, UnifiedCitation, TextSpan } from './types.ts'
import { BRAND_DOMAIN_MAP } from './types.ts'

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
 * @param query 검색 쿼리
 * @param options 타겟 브랜드/도메인 (텍스트 기반 탐지에 사용)
 */
export async function callOpenAI(
  query: string,
  options?: { targetBrand?: string; targetDomain?: string }
): Promise<LLMResult> {
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
          search_context_size: 'medium',  // 인용 품질 개선: low → medium (기본값)
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

    let citations: UnifiedCitation[] = Array.from(citationMap.values()).map(
      ({ annotations: annots, textSpans }, index) =>
        normalizeOpenAICitation(annots[0], index + 1, textSpans)
    )

    // 한글 쿼리 등으로 annotation이 없는 경우 텍스트 기반 탐지 사용
    let textBasedFallbackUsed = false
    if (citations.length === 0 && answer.length > 0) {
      console.log('[OpenAI] No annotations found, using text-based detection fallback')
      citations = createTextBasedCitations(
        answer,
        options?.targetBrand,
        options?.targetDomain
      )
      textBasedFallbackUsed = citations.length > 0
    }

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
        textBasedFallbackUsed,
        textBasedCitationsCount: textBasedFallbackUsed ? citations.length : 0,
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

/**
 * 텍스트에서 URL 패턴 추출
 * 한글 쿼리에서 annotation이 생성되지 않을 때 대체 방안
 */
function extractUrlsFromText(text: string): { url: string; position: number }[] {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches: { url: string; position: number }[] = []
  let match

  while ((match = urlPattern.exec(text)) !== null) {
    // URL 끝의 구두점 제거
    let url = match[0].replace(/[.,;:!?)]+$/, '')
    const domain = extractDomain(url)

    // 제외 도메인 필터링
    if (!isExcludedDomain(domain)) {
      matches.push({
        url,
        position: match.index,
      })
    }
  }

  return matches
}

/**
 * 브랜드 언급에서 도메인 추론
 * BRAND_DOMAIN_MAP을 사용하여 브랜드명 → 도메인 매핑
 */
function inferDomainsFromBrands(
  text: string,
  targetBrand?: string,
  targetDomain?: string
): { domain: string; brand: string; position: number; confidence: number }[] {
  const results: { domain: string; brand: string; position: number; confidence: number }[] = []

  // 모든 브랜드에 대해 검색
  for (const [brand, domains] of Object.entries(BRAND_DOMAIN_MAP)) {
    // 브랜드명 검색 (대소문자 구분 없이)
    const brandPattern = new RegExp(brand, 'gi')
    let match

    while ((match = brandPattern.exec(text)) !== null) {
      // 첫 번째 도메인을 대표 도메인으로 사용
      if (domains.length > 0) {
        // 신뢰도: 타겟 브랜드/도메인과 일치하면 높음
        let confidence = 0.7
        if (targetBrand && brand.toLowerCase().includes(targetBrand.toLowerCase())) {
          confidence = 0.9
        }
        if (targetDomain) {
          const matchesTarget = domains.some(d =>
            targetDomain.includes(d) || d.includes(targetDomain)
          )
          if (matchesTarget) confidence = 0.95
        }

        results.push({
          domain: domains[0],
          brand,
          position: match.index,
          confidence,
        })
      }
    }
  }

  // 중복 제거 (같은 도메인은 첫 번째 언급만 유지)
  const uniqueResults = new Map<string, typeof results[0]>()
  for (const result of results) {
    if (!uniqueResults.has(result.domain)) {
      uniqueResults.set(result.domain, result)
    }
  }

  return Array.from(uniqueResults.values())
}

/**
 * 텍스트 기반 인용 생성 (annotation이 없을 때 대체)
 * URL 추출 + 브랜드-도메인 추론 결합
 */
function createTextBasedCitations(
  answer: string,
  targetBrand?: string,
  targetDomain?: string
): UnifiedCitation[] {
  const citations: UnifiedCitation[] = []
  const seenDomains = new Set<string>()

  // 1. URL 직접 추출
  const urls = extractUrlsFromText(answer)
  for (const { url, position } of urls) {
    const domain = extractDomain(url)
    if (domain && !seenDomains.has(domain)) {
      seenDomains.add(domain)

      const textSpan: TextSpan = {
        start: position,
        end: position + url.length,
        text: url,
        confidence: 0.8, // URL 직접 추출은 높은 신뢰도
      }

      citations.push({
        id: crypto.randomUUID(),
        source: 'chatgpt',
        position: citations.length + 1,
        url,
        cleanUrl: removeQueryParams(url),
        domain,
        title: null,
        snippet: null,
        publishedDate: null,
        mentionCount: 1,
        avgConfidence: 0.8,
        confidenceScores: [0.8],
        textSpans: [textSpan],
      })
    }
  }

  // 2. 브랜드-도메인 추론
  const inferredDomains = inferDomainsFromBrands(answer, targetBrand, targetDomain)
  for (const { domain, brand, position, confidence } of inferredDomains) {
    if (!seenDomains.has(domain)) {
      seenDomains.add(domain)

      // 문맥 추출 (브랜드 언급 주변 50자)
      const contextStart = Math.max(0, position - 25)
      const contextEnd = Math.min(answer.length, position + brand.length + 25)
      const context = answer.substring(contextStart, contextEnd)

      const textSpan: TextSpan = {
        start: position,
        end: position + brand.length,
        text: context,
        confidence,
      }

      citations.push({
        id: crypto.randomUUID(),
        source: 'chatgpt',
        position: citations.length + 1,
        url: `https://${domain}`, // 추론된 도메인으로 URL 생성
        cleanUrl: `https://${domain}`,
        domain,
        title: `${brand} (추론됨)`,
        snippet: context,
        publishedDate: null,
        mentionCount: 1,
        avgConfidence: confidence,
        confidenceScores: [confidence],
        textSpans: [textSpan],
      })
    }
  }

  return citations
}
