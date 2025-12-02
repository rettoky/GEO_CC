# Edge Function 배포 코드

Supabase Dashboard → Functions → "Deploy a new function" → "via editor"로 이동하여 아래 코드를 붙여넣으세요.

**함수명**: `analyze-query`

---

## 전체 코드

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

type LLMType = 'perplexity' | 'chatgpt' | 'gemini' | 'claude'

interface TextSpan {
  start: number
  end: number
  text: string
  confidence?: number
}

interface UnifiedCitation {
  id: string
  source: LLMType
  position: number
  url: string
  cleanUrl: string
  domain: string
  title: string | null
  snippet: string | null
  publishedDate: string | null
  mentionCount: number
  avgConfidence: number | null
  confidenceScores: number[]
  textSpans: TextSpan[]
}

interface LLMResult {
  success: boolean
  model: string
  answer: string
  citations: UnifiedCitation[]
  responseTime: number
  error?: string
  timestamp: string
}

interface AnalysisResults {
  perplexity: LLMResult | null
  chatgpt: LLMResult | null
  gemini: LLMResult | null
  claude: LLMResult | null
}

interface AnalysisSummary {
  totalCitations: number
  uniqueDomains: number
  myDomainCited: boolean
  myDomainCitationCount: number
  brandMentioned: boolean
  brandMentionCount: number
  avgResponseTime: number
  successfulLLMs: LLMType[]
  failedLLMs: LLMType[]
  citationRateByLLM: {
    perplexity: number | null
    chatgpt: number | null
    gemini: number | null
    claude: number | null
  }
}

interface AnalyzeRequest {
  query: string
  domain?: string
  brand?: string
}

interface AnalyzeResponse {
  success: boolean
  analysisId: string
  data?: {
    results: AnalysisResults
    summary: AnalysisSummary
  }
  error?: {
    message: string
    code?: string
  }
}

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

function removeQueryParams(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
  } catch {
    return url
  }
}

function countMentions(url: string, answer: string): number {
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escapedUrl, 'gi')
  const matches = answer.match(regex)
  return matches ? matches.length : 0
}

interface PerplexitySearchResult {
  url: string
  title: string
  snippet?: string
  date?: string
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  search_results?: PerplexitySearchResult[]
  citations?: string[]
}

function normalizePerplexityCitation(
  result: PerplexitySearchResult,
  position: number,
  answer: string
): UnifiedCitation {
  const domain = extractDomain(result.url)
  const cleanUrl = removeQueryParams(result.url)
  const mentionCount = countMentions(result.url, answer)

  return {
    id: crypto.randomUUID(),
    source: 'perplexity',
    position,
    url: result.url,
    cleanUrl,
    domain,
    title: result.title || null,
    snippet: result.snippet || null,
    publishedDate: result.date || null,
    mentionCount,
    avgConfidence: null,
    confidenceScores: [],
    textSpans: [],
  }
}

async function callPerplexity(query: string): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY not found')
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
        search_context_size: 'high',
      }),
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`)
    }

    const data: PerplexityResponse = await response.json()
    const answer = data.choices[0]?.message?.content || ''
    const responseTime = Date.now() - startTime

    const citations: UnifiedCitation[] = []

    if (data.search_results && data.search_results.length > 0) {
      data.search_results.forEach((result, index) => {
        citations.push(normalizePerplexityCitation(result, index + 1, answer))
      })
    } else if (data.citations && data.citations.length > 0) {
      data.citations.forEach((url, index) => {
        citations.push(normalizePerplexityCitation({ url, title: '', snippet: '' }, index + 1, answer))
      })
    }

    return {
      success: true,
      model: 'sonar-pro',
      answer,
      citations,
      responseTime,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      model: 'sonar-pro',
      answer: '',
      citations: [],
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

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

async function callOpenAI(query: string): Promise<LLMResult> {
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

interface GeminiGroundingChunk {
  web?: {
    uri: string
    title?: string
  }
}

interface GeminiGroundingSupport {
  groundingChunkIndices?: number[]
  confidenceScores?: number[]
  segment?: {
    startIndex?: number
    endIndex?: number
    text?: string
  }
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
    groundingMetadata?: {
      groundingChunks?: GeminiGroundingChunk[]
      groundingSupports?: GeminiGroundingSupport[]
    }
  }>
}

function normalizeGeminiCitation(
  web: { uri: string; title?: string },
  position: number,
  answer: string,
  avgConfidence: number | null,
  confidenceScores: number[]
): UnifiedCitation {
  const domain = extractDomain(web.uri)
  const cleanUrl = removeQueryParams(web.uri)
  const mentionCount = countMentions(web.uri, answer)

  return {
    id: crypto.randomUUID(),
    source: 'gemini',
    position,
    url: web.uri,
    cleanUrl,
    domain,
    title: web.title || null,
    snippet: null,
    publishedDate: null,
    mentionCount,
    avgConfidence,
    confidenceScores,
    textSpans: [],
  }
}

async function callGemini(query: string): Promise<LLMResult> {
  const startTime = Date.now()

  try {
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not found')
    }

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
              parts: [
                {
                  text: query,
                },
              ],
            },
          ],
          tools: [
            {
              googleSearch: {},
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data: GeminiResponse = await response.json()
    const responseTime = Date.now() - startTime

    const candidate = data.candidates[0]
    const answer = candidate?.content?.parts?.map(p => p.text).join('') || ''
    const groundingMetadata = candidate?.groundingMetadata

    const citations: UnifiedCitation[] = []

    if (groundingMetadata?.groundingChunks) {
      const chunks = groundingMetadata.groundingChunks
      const supports = groundingMetadata.groundingSupports || []

      chunks.forEach((chunk, index) => {
        if (chunk.web) {
          const relatedSupports = supports.filter(
            s => s.groundingChunkIndices?.includes(index)
          )

          const confidenceScores = relatedSupports
            .flatMap(s => s.confidenceScores || [])
            .filter(score => score !== undefined)

          const avgConfidence =
            confidenceScores.length > 0
              ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
              : null

          citations.push(
            normalizeGeminiCitation(
              chunk.web,
              index + 1,
              answer,
              avgConfidence,
              confidenceScores
            )
          )
        }
      })
    }

    return {
      success: true,
      model: 'gemini-2.0-flash',
      answer,
      citations,
      responseTime,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      model: 'gemini-2.0-flash',
      answer: '',
      citations: [],
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

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

async function callClaude(query: string): Promise<LLMResult> {
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

    let answer = ''
    const searchResults: ClaudeWebSearchResult[] = []

    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        answer += block.text
      } else if (block.type === 'web_search_tool_result' && block.content) {
        searchResults.push(...block.content)
      }
    }

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

function generateSummary(
  results: AnalysisResults,
  myDomain?: string,
  myBrand?: string
): AnalysisSummary {
  const llmResults: LLMResult[] = Object.values(results).filter(
    (r): r is LLMResult => r !== null
  )

  const allCitations = llmResults.flatMap((r) => r.citations)
  const totalCitations = allCitations.length

  const uniqueDomains = new Set(allCitations.map((c) => c.domain)).size

  let myDomainCited = false
  let myDomainCitationCount = 0

  if (myDomain) {
    const normalizedMyDomain = myDomain.toLowerCase().replace(/^www\./, '')
    myDomainCitationCount = allCitations.filter((c) =>
      c.domain === normalizedMyDomain
    ).length
    myDomainCited = myDomainCitationCount > 0
  }

  let brandMentioned = false
  let brandMentionCount = 0

  if (myBrand) {
    const brandRegex = new RegExp(myBrand, 'gi')
    for (const result of llmResults) {
      const matches = result.answer.match(brandRegex)
      if (matches) {
        brandMentioned = true
        brandMentionCount += matches.length
      }
    }
  }

  const avgResponseTime = llmResults.length > 0
    ? llmResults.reduce((sum, r) => sum + r.responseTime, 0) /
      llmResults.length
    : 0

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
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, domain, brand }: AnalyzeRequest = await req.json()

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

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

    const analysisId = analysis.id

    const results = await Promise.allSettled([
      callPerplexity(query),
      callOpenAI(query),
      callGemini(query),
      callClaude(query),
    ])

    const analysisResults: AnalysisResults = {
      perplexity: results[0].status === 'fulfilled' ? results[0].value : null,
      chatgpt: results[1].status === 'fulfilled' ? results[1].value : null,
      gemini: results[2].status === 'fulfilled' ? results[2].value : null,
      claude: results[3].status === 'fulfilled' ? results[3].value : null,
    }

    const summary = generateSummary(analysisResults, domain, brand)

    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        results: analysisResults,
        summary,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', analysisId)

    if (updateError) {
      console.error('Failed to update analysis:', updateError)
    }

    const response: AnalyzeResponse = {
      success: true,
      analysisId,
      data: {
        results: analysisResults,
        summary,
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
```

---

## 배포 방법

1. Supabase Dashboard → Edge Functions → "Deploy a new function" 클릭
2. "via editor" 선택
3. Function name: `analyze-query` 입력
4. 위 코드를 전체 복사하여 붙여넣기
5. Deploy 버튼 클릭

## 참고

- 이미 설정된 환경 변수: `GOOGLE_AI_API_KEY`
- 자동 주입되는 변수: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- 나머지 API 키 (`PERPLEXITY_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)는 선택사항이며, 없으면 해당 LLM은 실패하지만 전체 함수는 계속 작동합니다.
