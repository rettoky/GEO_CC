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
    // competitors: 사용자가 입력한 경쟁사 브랜드 목록
    const { query, domain, brand, brandAliases, competitors, skipSave }: AnalyzeRequest & {
      competitors?: Array<{ name: string; aliases: string[] }>;
      skipSave?: boolean
    } = await req.json()

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
    console.log('[DEBUG] Starting LLM calls for query:', query.substring(0, 100))

    // 환경 변수 확인 (API 키 존재 여부만 확인)
    console.log('[DEBUG] API keys configured:', {
      perplexity: !!Deno.env.get('PERPLEXITY_API_KEY'),
      openai: !!Deno.env.get('OPENAI_API_KEY'),
      google: !!Deno.env.get('GOOGLE_AI_API_KEY'),
      anthropic: !!Deno.env.get('ANTHROPIC_API_KEY'),
    })

    const results = await Promise.allSettled([
      callPerplexity(query),
      callOpenAI(query),
      callGemini(query),
      callClaude(query),
    ])

    // 디버깅: 각 LLM 결과 요약
    const llmNames = ['Perplexity', 'OpenAI', 'Gemini', 'Claude']
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const r = result.value
        console.log(`[DEBUG] ${llmNames[index]}: success=${r.success}, citations=${r.citations?.length || 0}, error=${r.error || 'none'}, time=${r.responseTime}ms`)
      } else {
        console.log(`[DEBUG] ${llmNames[index]}: REJECTED - ${result.reason}`)
      }
    })

    // 결과 매핑 (T029: UnifiedCitation은 이미 각 LLM 함수에서 정규화됨)
    const analysisResults: AnalysisResults = {
      perplexity: results[0].status === 'fulfilled' ? results[0].value : null,
      chatgpt: results[1].status === 'fulfilled' ? results[1].value : null,
      gemini: results[2].status === 'fulfilled' ? results[2].value : null,
      claude: results[3].status === 'fulfilled' ? results[3].value : null,
    }

    // AnalysisSummary 생성 (T030) - 사용자 입력 경쟁사 사용
    const summary = await generateSummary(analysisResults, query, domain, brand, brandAliases, competitors)

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
 * 사용자가 입력한 경쟁사 목록 사용 (없으면 자동 감지)
 */
async function generateSummary(
  results: AnalysisResults,
  query: string,
  myDomain?: string,
  myBrand?: string,
  brandAliases?: string[],
  competitors?: Array<{ name: string; aliases: string[] }>
): Promise<AnalysisSummary> {
  const llmResults: LLMResult[] = Object.values(results).filter(
    (r): r is LLMResult => r !== null
  )

  // 전체 인용 수
  const allCitations = llmResults.flatMap((r) => r.citations)
  const totalCitations = allCitations.length

  // 고유 도메인 수
  const uniqueDomains = new Set(allCitations.map((c) => c.domain)).size

  // 타겟 도메인 인용 여부 및 횟수 (서브도메인 + 별칭 매칭 포함)
  let myDomainCited = false
  let myDomainCitationCount = 0

  // 인용 데이터를 source 정보와 함께 추출
  const citationsWithSource: Array<{ domain: string; source: LLMType }> = []
  const llmEntries: [keyof AnalysisResults, LLMType][] = [
    ['perplexity', 'perplexity'],
    ['chatgpt', 'chatgpt'],
    ['gemini', 'gemini'],
    ['claude', 'claude'],
  ]
  for (const [key, llmType] of llmEntries) {
    const result = results[key]
    if (result?.success && result.citations) {
      result.citations.forEach(c => {
        citationsWithSource.push({ domain: c.domain, source: llmType })
      })
    }
  }

  if (myDomain) {
    // 1. 도메인 정확 매칭 (서브도메인 포함)
    const exactMatches = countExactDomainMatches(citationsWithSource, myDomain)

    // 2. 브랜드 별칭 기반 도메인 매칭
    // 내 브랜드 별칭이 포함된 도메인도 집계 (예: meritz가 포함된 meritzfire.com)
    const myBrandAliases: string[] = []
    if (myBrand) {
      myBrandAliases.push(myBrand)
      if (brandAliases && brandAliases.length > 0) {
        myBrandAliases.push(...brandAliases)
      }
    }

    // 정확 매칭된 도메인은 제외하고 별칭 매칭
    const normalizedMyDomain = myDomain.toLowerCase().replace(/^www\./, '')
    const aliasMatches = myBrandAliases.length > 0
      ? findAliasMatchingDomains(citationsWithSource, myBrandAliases, [normalizedMyDomain])
      : { count: 0, domains: [], llms: [] }

    // 합산 (중복 없이)
    myDomainCitationCount = exactMatches.count + aliasMatches.count
    myDomainCited = myDomainCitationCount > 0

    // 디버그 로그
    console.log('[DEBUG] Domain citation count:', {
      domain: myDomain,
      exactMatches: exactMatches.count,
      aliasMatches: aliasMatches.count,
      aliasMatchedDomains: aliasMatches.domains,
      total: myDomainCitationCount
    })
  }

  // 브랜드 언급 분석 (별칭 포함) - 사용자 입력 경쟁사 사용
  const brandMentionAnalysis = await analyzeBrandMentions(results, query, myBrand, brandAliases, competitors)

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
 * 경쟁사 브랜드는 사용자가 입력한 목록 사용 (없으면 자동 감지)
 * 브랜드 언급 + 도메인 인용을 통합 집계
 */
async function analyzeBrandMentions(
  results: AnalysisResults,
  query: string,
  myBrand?: string,
  brandAliases?: string[],
  userCompetitors?: Array<{ name: string; aliases: string[] }>
): Promise<BrandMentionAnalysis> {
  const llmKeys: (keyof AnalysisResults)[] = ['perplexity', 'chatgpt', 'gemini', 'claude']

  // 인용 데이터를 source 정보와 함께 추출
  const citationsWithSource: Array<{ domain: string; source: LLMType }> = []
  for (const llmKey of llmKeys) {
    const result = results[llmKey]
    if (result?.success && result.citations) {
      result.citations.forEach(c => {
        citationsWithSource.push({ domain: c.domain, source: llmKey as LLMType })
      })
    }
  }

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

  // 경쟁사 브랜드 분석
  const competitors: BrandMentionDetail[] = []

  // 사용자가 입력한 경쟁사만 사용 (자동 감지 제거)
  // 사용자가 경쟁사를 설정하지 않으면 경쟁사 분석을 수행하지 않음
  if (!userCompetitors || userCompetitors.length === 0) {
    console.log('[DEBUG] No user-provided competitors, skipping competitor analysis')
    return {
      myBrand: myBrandMention,
      competitors: [],
      totalBrandMentions: myBrandMention?.mentionCount || 0,
    }
  }

  console.log('[DEBUG] Using user-provided competitors:', JSON.stringify(userCompetitors))
  const brandsToAnalyze = userCompetitors

  // 경쟁사 브랜드 언급 분석
  for (const brand of brandsToAnalyze) {
    // 내 브랜드는 제외
    if (myBrandAliases.some(alias =>
      brand.aliases.some(a => a.toLowerCase() === alias.toLowerCase())
    )) {
      continue
    }

    // 1. 텍스트 기반 브랜드 언급 집계
    const textMention = detectBrandMentions(results, llmKeys, brand.name, brand.aliases)

    // 2. 별칭 기반 도메인 인용 집계
    const domainMatches = findAliasMatchingDomains(citationsWithSource, brand.aliases)

    // 3. 통합 집계 (텍스트 언급 + 도메인 인용)
    const totalMentionCount = textMention.mentionCount + domainMatches.count

    if (totalMentionCount > 0) {
      // LLM 합집합
      const allLLMs = [...new Set([...textMention.mentionedInLLMs, ...domainMatches.llms])]

      competitors.push({
        brand: brand.name,
        aliases: brand.aliases,
        mentionCount: totalMentionCount,
        mentionedInLLMs: allLLMs,
        contexts: textMention.contexts,
      })

      console.log('[DEBUG] Competitor brand stats:', {
        brand: brand.name,
        textMentions: textMention.mentionCount,
        domainCitations: domainMatches.count,
        matchedDomains: domainMatches.domains,
        total: totalMentionCount
      })
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
 * 브랜드 별칭이 도메인에 포함된 경우 추가 집계
 * 예: "메리츠" 별칭이 "meritz.com" 도메인에 매칭
 * 한글 브랜드명을 영문으로 변환하여 도메인 매칭 시도
 *
 * 주의: 오탐 방지를 위해 다음 조건을 적용:
 * - 최소 5자 이상의 고유 패턴만 사용
 * - 일반적인 단어(life, bank, home 등)는 제외
 */
function findAliasMatchingDomains(
  citations: Array<{ domain: string; source: LLMType }>,
  aliases: string[],
  excludeDomains: string[] = []
): { count: number; domains: string[]; llms: LLMType[] } {
  const matchedDomains = new Set<string>()
  const matchedLLMs = new Set<LLMType>()

  // 오탐을 유발하는 일반적인 단어 제외 목록
  const commonWords = new Set([
    'life', 'bank', 'home', 'shop', 'mall', 'plus', 'news', 'info',
    'korea', 'korean', 'insurance', 'finance', 'asset', 'fire',
    'direct', 'online', 'mobile', 'smart', 'care', 'health',
    'save', 'money', 'loan', 'credit', 'card', 'point', 'pay',
    'service', 'center', 'support', 'help', 'guide', 'blog',
  ])

  // 별칭에서 영문 패턴 추출 (한글 제외, 영문만)
  const englishPatterns: string[] = []
  for (const alias of aliases) {
    // 영문만 추출 (최소 3자 이상 - AIA, 라이나 등 짧은 브랜드명 지원)
    const englishOnly = alias.toLowerCase().replace(/[^a-z0-9]/g, '')

    // 3자 이상이고 일반적인 단어가 아닌 경우만 패턴으로 사용
    if (englishOnly.length >= 3 && !commonWords.has(englishOnly)) {
      englishPatterns.push(englishOnly)
    }

    // 원본 별칭도 소문자로 추가 (영문인 경우, 3자 이상)
    const lowerAlias = alias.toLowerCase()
    if (/^[a-z0-9]+$/.test(lowerAlias) && lowerAlias.length >= 3 && !commonWords.has(lowerAlias)) {
      englishPatterns.push(lowerAlias)
    }
  }

  // 중복 제거
  const uniquePatterns = [...new Set(englishPatterns)]

  console.log('[DEBUG] findAliasMatchingDomains patterns:', uniquePatterns)

  for (const citation of citations) {
    const domain = citation.domain.toLowerCase()

    // 이미 매칭된 도메인이거나 제외 도메인이면 건너뛰기
    if (matchedDomains.has(domain) || excludeDomains.includes(domain)) {
      continue
    }

    // 도메인에 별칭 패턴이 포함된 경우
    for (const pattern of uniquePatterns) {
      if (domain.includes(pattern)) {
        matchedDomains.add(domain)
        matchedLLMs.add(citation.source)
        console.log('[DEBUG] Domain matched:', { domain, pattern, source: citation.source })
        break
      }
    }
  }

  return {
    count: matchedDomains.size,
    domains: Array.from(matchedDomains),
    llms: Array.from(matchedLLMs)
  }
}

/**
 * 도메인 정확 매칭 집계 (서브도메인 포함)
 */
function countExactDomainMatches(
  citations: Array<{ domain: string; source: LLMType }>,
  targetDomain: string
): { count: number; llms: LLMType[] } {
  const normalizedTarget = targetDomain.toLowerCase().replace(/^www\./, '')
  const matchedLLMs = new Set<LLMType>()
  let count = 0

  for (const citation of citations) {
    const citationDomain = citation.domain.toLowerCase()

    // 정확 매칭 또는 서브도메인 매칭
    if (citationDomain === normalizedTarget ||
        citationDomain.endsWith('.' + normalizedTarget) ||
        normalizedTarget.endsWith('.' + citationDomain)) {
      count++
      matchedLLMs.add(citation.source)
    }
  }

  return { count, llms: Array.from(matchedLLMs) }
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
