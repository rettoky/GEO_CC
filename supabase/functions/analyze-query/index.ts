// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisResults,
  AnalysisSummary,
  CrossValidation,
  CrossValidationItem,
  LLMResult,
  LLMType,
  BrandMentionDetail,
  BrandMentionAnalysis,
} from './llm/types.ts'
import { callPerplexity } from './llm/perplexity.ts'
import { callOpenAI } from './llm/openai.ts'
import { callGemini } from './llm/gemini.ts'
import { callClaude } from './llm/claude.ts'

/**
 * CORS 헤더 설정
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * analyze-query Edge Function
 * 4개 LLM에 쿼리를 전송하고 인용 데이터를 분석
 */
Deno.serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    // 요청 파싱
    // skipSave: 배치 분석에서 호출 시 true - DB 저장 건너뜀
    const { query, domain, brand, brandAliases, skipSave }: AnalyzeRequest & { skipSave?: boolean } = await req.json()

    // 입력 검증
    if (!query || query.trim().length === 0) {
      const errorResponse: AnalyzeResponse = {
        success: false,
        analysisId: '',
        error: {
          message: 'Query is required',
          code: 'INVALID_INPUT',
        },
      }

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Supabase 클라이언트 초기화
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    let analysisId = ''

    // skipSave가 false인 경우에만 DB에 분석 레코드 생성 (단일 분석)
    if (!skipSave) {
      const { data: analysis, error: insertError } = await supabase
        .from('analyses')
        .insert({
          query_text: query,
          my_domain: domain || null,
          my_brand: brand || null,
          status: 'processing',
          results: {},
        })
        .select()
        .single()

      if (insertError || !analysis) {
        throw new Error('Failed to create analysis record')
      }

      analysisId = analysis.id
    }

    // 4개 LLM 병렬 호출 (T028)
    console.log('[DEBUG] Starting LLM calls for query:', query)
    const results = await Promise.allSettled([
      callPerplexity(query),
      callOpenAI(query),
      callGemini(query),
      callClaude(query),
    ])

    // 디버깅: 각 LLM 결과 로그
    console.log('[DEBUG] Perplexity result:', JSON.stringify(results[0]))
    console.log('[DEBUG] OpenAI result:', JSON.stringify(results[1]))
    console.log('[DEBUG] Gemini result:', JSON.stringify(results[2]))
    console.log('[DEBUG] Claude result:', JSON.stringify(results[3]))

    // 결과 매핑 (T029: UnifiedCitation은 이미 각 LLM 함수에서 정규화됨)
    const analysisResults: AnalysisResults = {
      perplexity: results[0].status === 'fulfilled' ? results[0].value : null,
      chatgpt: results[1].status === 'fulfilled' ? results[1].value : null,
      gemini: results[2].status === 'fulfilled' ? results[2].value : null,
      claude: results[3].status === 'fulfilled' ? results[3].value : null,
    }

    // AnalysisSummary 생성 (T030) - 경쟁사 브랜드 동적 감지 포함
    const summary = await generateSummary(analysisResults, query, domain, brand, brandAliases)

    // Cross-Validation 계산 (방법론 문서 Section 4.2)
    const crossValidation = calculateCrossValidation(analysisResults, domain)

    // skipSave가 false인 경우에만 DB 업데이트 (T031)
    if (!skipSave && analysisId) {
      const { error: updateError } = await supabase
        .from('analyses')
        .update({
          results: analysisResults,
          summary,
          cross_validation: crossValidation,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', analysisId)

      if (updateError) {
        console.error('Failed to update analysis:', updateError)
      }
    }

    const response: AnalyzeResponse = {
      success: true,
      analysisId,
      data: {
        results: analysisResults,
        summary,
        crossValidation,
      },
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing request:', error)

    const errorResponse: AnalyzeResponse = {
      success: false,
      analysisId: '',
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * AnalysisSummary 생성 함수 (T030)
 * 경쟁사 브랜드를 Gemini로 동적 감지
 */
async function generateSummary(
  results: AnalysisResults,
  query: string,
  myDomain?: string,
  myBrand?: string,
  brandAliases?: string[]
): Promise<AnalysisSummary> {
  const llmResults: LLMResult[] = Object.values(results).filter(
    (r): r is LLMResult => r !== null
  )

  // 전체 인용 수
  const allCitations = llmResults.flatMap((r) => r.citations)
  const totalCitations = allCitations.length

  // 고유 도메인 수
  const uniqueDomains = new Set(allCitations.map((c) => c.domain)).size

  // 타겟 도메인 인용 여부 및 횟수 (서브도메인 포함)
  let myDomainCited = false
  let myDomainCitationCount = 0

  if (myDomain) {
    const normalizedMyDomain = myDomain.toLowerCase().replace(/^www\./, '')
    myDomainCitationCount = allCitations.filter((c) => {
      const citationDomain = c.domain.toLowerCase()
      return citationDomain === normalizedMyDomain ||
             citationDomain.endsWith('.' + normalizedMyDomain) ||
             normalizedMyDomain.endsWith('.' + citationDomain)
    }).length
    myDomainCited = myDomainCitationCount > 0
  }

  // 브랜드 언급 분석 (별칭 포함) - 경쟁사 동적 감지
  const brandMentionAnalysis = await analyzeBrandMentions(results, query, myBrand, brandAliases)

  // 기존 호환성을 위한 브랜드 언급 여부 및 횟수
  const brandMentioned = brandMentionAnalysis.myBrand !== null && brandMentionAnalysis.myBrand.mentionCount > 0
  const brandMentionCount = brandMentionAnalysis.myBrand?.mentionCount || 0

  // 평균 응답 시간
  const avgResponseTime = llmResults.length > 0
    ? llmResults.reduce((sum, r) => sum + r.responseTime, 0) /
      llmResults.length
    : 0

  // 성공/실패 LLM 목록
  const successfulLLMs: LLMType[] = []
  const failedLLMs: LLMType[] = []

  const llmMap: Record<keyof AnalysisResults, LLMType> = {
    perplexity: 'perplexity',
    chatgpt: 'chatgpt',
    gemini: 'gemini',
    claude: 'claude',
  }

  for (const [key, llmType] of Object.entries(llmMap)) {
    const result = results[key as keyof AnalysisResults]
    if (result && result.success) {
      successfulLLMs.push(llmType)
    } else {
      failedLLMs.push(llmType)
    }
  }

  // LLM별 인용률
  const citationRateByLLM = {
    perplexity: results.perplexity?.citations.length ?? null,
    chatgpt: results.chatgpt?.citations.length ?? null,
    gemini: results.gemini?.citations.length ?? null,
    claude: results.claude?.citations.length ?? null,
  }

  return {
    totalCitations,
    uniqueDomains,
    myDomainCited,
    myDomainCitationCount,
    brandMentioned,
    brandMentionCount,
    avgResponseTime,
    successfulLLMs,
    failedLLMs,
    citationRateByLLM,
    brandMentionAnalysis,
  }
}

/**
 * 브랜드 언급 분석 함수
 * 내 브랜드와 경쟁사 브랜드의 언급을 분석
 * 경쟁사 브랜드는 Gemini를 사용하여 동적으로 감지
 */
async function analyzeBrandMentions(
  results: AnalysisResults,
  query: string,
  myBrand?: string,
  brandAliases?: string[]
): Promise<BrandMentionAnalysis> {
  const llmKeys: (keyof AnalysisResults)[] = ['perplexity', 'chatgpt', 'gemini', 'claude']

  // 내 브랜드 별칭 목록 생성
  const myBrandAliases: string[] = []
  if (myBrand) {
    myBrandAliases.push(myBrand)
    if (brandAliases && brandAliases.length > 0) {
      myBrandAliases.push(...brandAliases)
    }
  }

  // 내 브랜드 언급 분석
  let myBrandMention: BrandMentionDetail | null = null
  if (myBrandAliases.length > 0) {
    myBrandMention = detectBrandMentions(results, llmKeys, myBrand || '', myBrandAliases)
  }

  // LLM 응답 텍스트 합치기
  const combinedAnswers = llmKeys
    .map(key => results[key]?.answer || '')
    .filter(answer => answer.length > 0)
    .join('\n\n')

  // 경쟁사 브랜드 동적 감지 (Gemini 사용)
  const competitors: BrandMentionDetail[] = []

  if (combinedAnswers.length > 0) {
    try {
      const detectedBrands = await detectCompetitorBrandsWithGemini(query, combinedAnswers, myBrand)
      console.log('[DEBUG] Detected competitor brands:', JSON.stringify(detectedBrands))

      for (const brand of detectedBrands) {
        // 내 브랜드는 제외
        if (myBrandAliases.some(alias =>
          brand.aliases.some(a => a.toLowerCase() === alias.toLowerCase())
        )) {
          continue
        }

        const mention = detectBrandMentions(results, llmKeys, brand.name, brand.aliases)
        if (mention.mentionCount > 0) {
          competitors.push(mention)
        }
      }
    } catch (error) {
      console.error('[ERROR] Failed to detect competitor brands with Gemini:', error)
      // Gemini 실패 시 기본 감지 없이 진행
    }
  }

  // 언급 횟수로 정렬
  competitors.sort((a, b) => b.mentionCount - a.mentionCount)

  const totalBrandMentions = (myBrandMention?.mentionCount || 0) +
    competitors.reduce((sum, c) => sum + c.mentionCount, 0)

  return {
    myBrand: myBrandMention,
    competitors,
    totalBrandMentions,
  }
}

/**
 * Gemini를 사용하여 경쟁사 브랜드 감지 및 별칭 생성
 */
interface DetectedBrand {
  name: string
  aliases: string[]
}

async function detectCompetitorBrandsWithGemini(
  query: string,
  combinedAnswers: string,
  myBrand?: string
): Promise<DetectedBrand[]> {
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
  if (!apiKey) {
    console.warn('[WARN] GOOGLE_AI_API_KEY not found, skipping competitor detection')
    return []
  }

  // 응답 텍스트가 너무 길면 잘라내기 (토큰 제한)
  const truncatedAnswers = combinedAnswers.length > 8000
    ? combinedAnswers.substring(0, 8000) + '...'
    : combinedAnswers

  const prompt = `당신은 브랜드 분석 전문가입니다. 다음 AI 검색 응답 텍스트에서 언급된 브랜드/회사/제품명을 모두 추출하고, 각 브랜드의 다양한 별칭을 생성해주세요.

검색 쿼리: "${query}"
${myBrand ? `분석 대상 브랜드 (제외): "${myBrand}"` : ''}

AI 응답 텍스트:
"""
${truncatedAnswers}
"""

작업:
1. 위 텍스트에서 언급된 모든 브랜드/회사/제품명을 추출하세요
2. 각 브랜드에 대해 다양한 별칭을 생성하세요 (한글, 영문, 줄임말, 띄어쓰기 변형 등)
3. ${myBrand ? `"${myBrand}"와 관련된 브랜드는 제외하세요` : ''}
4. 너무 일반적인 단어(예: "보험", "생명", "화재" 단독)는 제외하세요

JSON 형식으로만 응답하세요:
[
  {"name": "브랜드명", "aliases": ["별칭1", "별칭2", "별칭3"]},
  ...
]

최대 15개의 브랜드만 반환하세요.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2000,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // JSON 배열 추출
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const brands: DetectedBrand[] = JSON.parse(cleanText)

    // 유효성 검증
    if (!Array.isArray(brands)) {
      throw new Error('Invalid response format')
    }

    // 유효한 브랜드만 필터링
    return brands
      .filter(b => b.name && Array.isArray(b.aliases) && b.aliases.length > 0)
      .map(b => ({
        name: b.name,
        aliases: [...new Set([b.name, ...b.aliases.filter(a => typeof a === 'string' && a.trim().length > 0)])],
      }))
      .slice(0, 15)

  } catch (error) {
    console.error('[ERROR] Gemini competitor detection failed:', error)
    return []
  }
}

/**
 * 특정 브랜드의 언급 감지 (중복 집계 방지)
 * 별칭이 겹치는 경우 (예: "삼성화재"와 "삼성") 같은 위치는 1회만 집계
 */
function detectBrandMentions(
  results: AnalysisResults,
  llmKeys: (keyof AnalysisResults)[],
  brandName: string,
  aliases: string[]
): BrandMentionDetail {
  let totalCount = 0
  const mentionedInLLMs: LLMType[] = []
  const contexts: string[] = []

  for (const llmKey of llmKeys) {
    const result = results[llmKey]
    if (!result || !result.success) continue

    const answer = result.answer

    // 모든 별칭의 매칭 위치 수집 (start, end)
    const matchPositions: Array<{ start: number; end: number; text: string }> = []

    for (const alias of aliases) {
      const regex = new RegExp(escapeRegExp(alias), 'gi')
      let match
      while ((match = regex.exec(answer)) !== null) {
        matchPositions.push({
          start: match.index,
          end: match.index + alias.length,
          text: match[0]
        })
      }
    }

    // 위치별로 정렬 (start 기준, 같으면 end 내림차순 - 더 긴 매칭 우선)
    matchPositions.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start
      return b.end - a.end // 더 긴 매칭 우선
    })

    // 겹치는 매칭 제거 (Greedy: 먼저 나온 매칭 우선)
    const uniqueMatches: Array<{ start: number; end: number; text: string }> = []
    let lastEnd = -1

    for (const pos of matchPositions) {
      // 이전 매칭과 겹치지 않는 경우만 추가
      if (pos.start >= lastEnd) {
        uniqueMatches.push(pos)
        lastEnd = pos.end
      }
    }

    const llmMentionCount = uniqueMatches.length

    // 문맥 추출 (최대 3개, 중복 제거된 매칭에서)
    for (const pos of uniqueMatches) {
      if (contexts.length >= 3) break

      const start = Math.max(0, pos.start - 30)
      const end = Math.min(answer.length, pos.end + 30)
      const context = answer.substring(start, end).trim()

      // 유사한 문맥 중복 방지
      const isDuplicate = contexts.some(c =>
        c.includes(context.substring(10, context.length - 10)) ||
        context.includes(c.substring(10, c.length - 10))
      )

      if (!isDuplicate) {
        contexts.push('...' + context + '...')
      }
    }

    if (llmMentionCount > 0) {
      totalCount += llmMentionCount
      mentionedInLLMs.push(llmKey as LLMType)
    }
  }

  return {
    brand: brandName,
    aliases,
    mentionCount: totalCount,
    mentionedInLLMs,
    contexts,
  }
}

/**
 * 정규식 특수문자 이스케이프
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Cross-Validation 계산 함수 (방법론 문서 Section 4.2)
 * 여러 LLM이 같은 도메인을 인용하면 신뢰도가 상승
 *
 * 등급 기준:
 * - A: 3개 이상 LLM에서 인용 (95%+ 신뢰도)
 * - B: 2개 LLM에서 인용 (80%+ 신뢰도)
 * - C: 1개 LLM에서 인용 (60% 신뢰도)
 * - D: 미인용 또는 검증 실패 (30% 미만)
 */
function calculateCrossValidation(
  results: AnalysisResults,
  myDomain?: string
): CrossValidation {
  // 모든 LLM의 인용 수집
  const llmCitations: { llm: LLMType; domain: string }[] = []

  const llmMap: [keyof AnalysisResults, LLMType][] = [
    ['perplexity', 'perplexity'],
    ['chatgpt', 'chatgpt'],
    ['gemini', 'gemini'],
    ['claude', 'claude'],
  ]

  for (const [key, llmType] of llmMap) {
    const result = results[key]
    if (result?.success && result.citations) {
      result.citations.forEach(citation => {
        llmCitations.push({ llm: llmType, domain: citation.domain })
      })
    }
  }

  // 도메인별 인용한 LLM 목록 집계
  const domainLLMs = new Map<string, Set<LLMType>>()

  for (const { llm, domain } of llmCitations) {
    if (!domainLLMs.has(domain)) {
      domainLLMs.set(domain, new Set())
    }
    domainLLMs.get(domain)!.add(llm)
  }

  // CrossValidationItem 배열 생성
  const items: CrossValidationItem[] = []

  for (const [domain, llmSet] of domainLLMs) {
    const citedBy = Array.from(llmSet)
    const llmCount = citedBy.length

    // 등급 및 신뢰도 결정
    let grade: 'A' | 'B' | 'C' | 'D'
    let reliability: number

    if (llmCount >= 3) {
      grade = 'A'
      reliability = 95
    } else if (llmCount === 2) {
      grade = 'B'
      reliability = 80
    } else {
      grade = 'C'
      reliability = 60
    }

    items.push({
      domain,
      citedBy,
      grade,
      reliability,
    })
  }

  // 신뢰도 순으로 정렬
  items.sort((a, b) => b.reliability - a.reliability)

  // 내 도메인 등급 찾기
  let myDomainGrade: 'A' | 'B' | 'C' | 'D' | null = null

  if (myDomain) {
    const normalizedMyDomain = myDomain.toLowerCase().replace(/^www\./, '')
    const myDomainItem = items.find(item =>
      checkDomainMatch(item.domain, normalizedMyDomain)
    )
    myDomainGrade = myDomainItem?.grade || null
  }

  return {
    items,
    myDomainGrade,
  }
}

/**
 * 도메인 매칭 함수 (방법론 문서 Section 5.1)
 * 서브도메인 지원: blog.example.com === example.com
 */
function checkDomainMatch(citationDomain: string, targetDomain: string): boolean {
  const citation = citationDomain.toLowerCase().replace(/^www\./, '')
  const target = targetDomain.toLowerCase().replace(/^www\./, '')

  // 정확히 일치
  if (citation === target) return true

  // 서브도메인 일치 (blog.example.com === example.com)
  if (citation.endsWith('.' + target)) return true

  // 역방향: example.com이 sub.example.com에 포함
  if (target.endsWith('.' + citation)) return true

  return false
}
