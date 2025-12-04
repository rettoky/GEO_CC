# GEO Analyzer 핵심 방법론
## LLM 인용 데이터 추출 및 분석 가이드

---

## 문서 정보
| 항목 | 내용 |
|------|------|
| 버전 | 2.0 |
| 작성일 | 2025-11-28 |
| 중요도 | **최상 (프로젝트 핵심)** |
| 관련 Phase | Phase 1-3 (Edge Function) |

---

## 1. 개요

### 1.1 이 문서의 목적

이 문서는 GEO Analyzer 프로젝트의 **가장 핵심적인 기술적 도전**을 다룹니다:

> **"LLM이 검색 결과에서 어떤 페이지를 인용하는지, 어떤 우선순위로 선택하는지 파악하는 방법"**

### 1.2 2025년 현재 상황

**좋은 소식:** 2025년 현재, 모든 주요 LLM이 API를 통해 인용 데이터를 제공합니다.

| LLM | 인용 API | 신뢰도 점수 | 텍스트 매핑 | 비용 (1,000 요청당) |
|-----|---------|------------|------------|-------------------|
| Perplexity | ✅ `search_results[]` | ❌ | ❌ | ~$5 |
| OpenAI | ✅ `annotations[]` | ❌ | ✅ | ~$30 |
| Gemini | ✅ `groundingMetadata` | ✅ | ✅ | $35 |
| Claude | ✅ 웹 검색 도구 | ❌ | ✅ | $10 |

### 1.3 핵심 인사이트

1. **Perplexity**가 가장 풍부한 인용 데이터를 기본 제공
2. **Gemini**만 신뢰도 점수(0-1)를 제공하여 "얼마나 확신하는지" 파악 가능
3. **OpenAI**는 텍스트 내 정확한 위치(start_index, end_index)를 제공
4. 각 LLM마다 인용 선택 기준이 다름 → 멀티 엔진 분석 필수

---

## 2. LLM별 API 상세 구현

### 2.1 Perplexity API (최우선 구현)

#### API 엔드포인트
```
POST https://api.perplexity.ai/chat/completions
```

#### 요청 형식
```typescript
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'sonar-pro',  // sonar-pro가 2배 더 많은 인용 반환
    messages: [
      { role: 'user', content: query }
    ],
    search_context_size: 'high',  // low/medium/high
    return_related_questions: false,
  }),
})
```

#### 응답 형식 및 파싱
```typescript
interface PerplexityResponse {
  id: string
  model: string
  choices: [{
    message: {
      role: 'assistant'
      content: string  // "[1] 설명... [2] 추가 설명..."
    }
    finish_reason: string
  }]
  citations: string[]  // ["https://...", "https://..."] - deprecated but still works
  search_results: SearchResult[]  // 권장: 더 풍부한 메타데이터
}

interface SearchResult {
  title: string
  url: string
  date?: string  // 발행일
  snippet?: string  // 발췌문
}
```

#### 인용 추출 로직
```typescript
function parsePerplexityCitations(response: PerplexityResponse): Citation[] {
  const citations: Citation[] = []
  
  // search_results 우선 사용 (더 풍부한 데이터)
  if (response.search_results && response.search_results.length > 0) {
    response.search_results.forEach((result, index) => {
      citations.push({
        position: index + 1,
        url: result.url,
        title: result.title,
        domain: new URL(result.url).hostname.replace('www.', ''),
        snippet: result.snippet || null,
        publishedDate: result.date || null,
        source: 'perplexity',
      })
    })
  } 
  // fallback: citations 배열 사용
  else if (response.citations && response.citations.length > 0) {
    response.citations.forEach((url, index) => {
      citations.push({
        position: index + 1,
        url: url,
        title: null,  // citations 배열에는 제목 없음
        domain: new URL(url).hostname.replace('www.', ''),
        snippet: null,
        publishedDate: null,
        source: 'perplexity',
      })
    })
  }
  
  // 응답 텍스트에서 인용 번호 매핑
  const content = response.choices[0].message.content
  const citationPattern = /\[(\d+)\]/g
  let match
  
  while ((match = citationPattern.exec(content)) !== null) {
    const citationIndex = parseInt(match[1]) - 1
    if (citations[citationIndex]) {
      citations[citationIndex].mentionCount = 
        (citations[citationIndex].mentionCount || 0) + 1
    }
  }
  
  return citations
}
```

#### Perplexity 인용 특성 (GEO 최적화 포인트)
- **FAQ Schema 페이지**: 인용 확률 41% (일반 페이지 24%)
- **BLUF 구조**: 상단 80토큰 이내 직접 답변 선호
- **페이지 로딩 속도**: 2초 이하 권장
- **최신성**: 시간 감쇠 메커니즘 적용

---

### 2.2 OpenAI API (Responses API)

#### API 엔드포인트
```
POST https://api.openai.com/v1/responses
```

#### 요청 형식
```typescript
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    tools: [{ type: 'web_search_preview' }],
    input: query,
    tool_choice: { type: 'web_search_preview' },  // 강제 검색
  }),
})
```

#### 대안: Chat Completions API (Search Models)
```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-search-preview',  // 또는 gpt-4o-mini-search-preview
    messages: [
      { role: 'user', content: query }
    ],
    web_search_options: {
      search_context_size: 'medium',  // low/medium/high
      user_location: {
        type: 'approximate',
        country: 'KR',
      },
    },
  }),
})
```

#### 응답 형식 및 파싱
```typescript
interface OpenAISearchResponse {
  id: string
  object: string
  output: [{
    type: 'message'
    content: [{
      type: 'output_text'
      text: string
      annotations: Annotation[]
    }]
  }]
}

interface Annotation {
  type: 'url_citation'
  url: string
  title: string
  start_index: number  // 텍스트 내 시작 위치
  end_index: number    // 텍스트 내 종료 위치
}
```

#### 인용 추출 로직
```typescript
function parseOpenAICitations(response: OpenAISearchResponse): Citation[] {
  const citations: Citation[] = []
  const seenUrls = new Set<string>()
  
  const output = response.output[0]
  if (!output || output.type !== 'message') return citations
  
  const content = output.content[0]
  if (!content || content.type !== 'output_text') return citations
  
  const annotations = content.annotations || []
  const text = content.text
  
  annotations.forEach((annotation, index) => {
    if (annotation.type !== 'url_citation') return
    
    // URL 정규화 (utm 파라미터 제거)
    const cleanUrl = annotation.url.split('?')[0]
    
    if (seenUrls.has(cleanUrl)) {
      // 이미 있는 URL이면 언급 횟수만 증가
      const existing = citations.find(c => c.url.split('?')[0] === cleanUrl)
      if (existing) {
        existing.mentionCount = (existing.mentionCount || 1) + 1
        existing.textSpans = existing.textSpans || []
        existing.textSpans.push({
          start: annotation.start_index,
          end: annotation.end_index,
          text: text.substring(annotation.start_index, annotation.end_index),
        })
      }
      return
    }
    
    seenUrls.add(cleanUrl)
    
    citations.push({
      position: citations.length + 1,
      url: annotation.url,
      title: annotation.title,
      domain: new URL(annotation.url).hostname.replace('www.', ''),
      source: 'chatgpt',
      mentionCount: 1,
      textSpans: [{
        start: annotation.start_index,
        end: annotation.end_index,
        text: text.substring(annotation.start_index, annotation.end_index),
      }],
    })
  })
  
  return citations
}
```

#### OpenAI 인용 특성 (GEO 최적화 포인트)
- **선택적 인용**: 구글 SERP와 15% 미만 중복
- **맥락 기반 소스 선택**: 쿼리 의도에 맞는 소스 우선
- **저자 정보 중시**: E-E-A-T 신호 반영

---

### 2.3 Google Gemini API (Search Grounding)

#### API 엔드포인트
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
```

#### 요청 형식
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: query }] }
      ],
      tools: [{
        google_search: {}  // Gemini 2.0+
        // 또는 google_search_retrieval: { dynamic_retrieval_config: { mode: 'MODE_DYNAMIC' } }  // Gemini 1.5
      }],
    }),
  }
)
```

#### 응답 형식 및 파싱
```typescript
interface GeminiResponse {
  candidates: [{
    content: {
      parts: [{ text: string }]
      role: string
    }
    groundingMetadata?: {
      groundingChunks: GroundingChunk[]
      groundingSupports: GroundingSupport[]
      webSearchQueries: string[]
      searchEntryPoint?: {
        renderedContent: string  // 검색 제안 위젯 HTML
      }
    }
  }]
}

interface GroundingChunk {
  web?: {
    uri: string
    title: string
  }
}

interface GroundingSupport {
  segment: {
    startIndex: number
    endIndex: number
    text: string
  }
  groundingChunkIndices: number[]
  confidenceScores: number[]  // ⭐ 핵심: 신뢰도 점수!
}
```

#### 인용 추출 로직 (신뢰도 점수 포함)
```typescript
function parseGeminiCitations(response: GeminiResponse): Citation[] {
  const citations: Citation[] = []
  
  const candidate = response.candidates[0]
  if (!candidate?.groundingMetadata) return citations
  
  const { groundingChunks, groundingSupports } = candidate.groundingMetadata
  
  // 기본 인용 정보 추출
  groundingChunks.forEach((chunk, index) => {
    if (!chunk.web) return
    
    citations.push({
      position: index + 1,
      url: chunk.web.uri,
      title: chunk.web.title,
      domain: new URL(chunk.web.uri).hostname.replace('www.', ''),
      source: 'gemini',
      confidenceScores: [],  // 나중에 채움
      supportedSegments: [],
    })
  })
  
  // 신뢰도 점수 및 지원 세그먼트 매핑
  groundingSupports.forEach((support) => {
    support.groundingChunkIndices.forEach((chunkIndex, i) => {
      const citation = citations[chunkIndex]
      if (!citation) return
      
      // 신뢰도 점수 추가
      citation.confidenceScores.push(support.confidenceScores[i])
      
      // 지원하는 텍스트 세그먼트 추가
      citation.supportedSegments.push({
        text: support.segment.text,
        start: support.segment.startIndex,
        end: support.segment.endIndex,
        confidence: support.confidenceScores[i],
      })
    })
  })
  
  // 평균 신뢰도 계산
  citations.forEach(citation => {
    if (citation.confidenceScores.length > 0) {
      citation.avgConfidence = 
        citation.confidenceScores.reduce((a, b) => a + b, 0) / 
        citation.confidenceScores.length
    }
  })
  
  return citations
}
```

#### Gemini 인용 특성 (GEO 최적화 포인트)
- **E-E-A-T 중시**: 경험, 전문성, 권위, 신뢰성
- **Schema.org 마크업**: 구조화 데이터 절대적 중요
- **dateModified**: 최신성 신호로 중요
- **Information Gain**: 새로운 정보 제공 페이지 선호

---

### 2.4 Claude API (Web Search Tool)

#### API 엔드포인트
```
POST https://api.anthropic.com/v1/messages
```

#### 요청 형식
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    tools: [{
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 5,  // 검색 횟수 제한
      allowed_domains: ['example.com'],  // 선택: 특정 도메인만 허용
      blocked_domains: ['spam.com'],     // 선택: 특정 도메인 차단
    }],
    messages: [
      { role: 'user', content: query }
    ],
  }),
})
```

#### 응답 형식 및 파싱
```typescript
interface ClaudeResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: ContentBlock[]
  stop_reason: string
}

type ContentBlock = 
  | { type: 'text', text: string }
  | { type: 'tool_use', id: string, name: string, input: any }
  | { type: 'web_search_tool_result', content: WebSearchResult[] }

interface WebSearchResult {
  type: 'web_search_result'
  url: string
  title: string
  snippet: string
  encrypted_content?: string
}
```

#### 인용 추출 로직
```typescript
function parseClaudeCitations(response: ClaudeResponse): Citation[] {
  const citations: Citation[] = []
  
  // web_search_tool_result 블록에서 검색 결과 추출
  response.content.forEach(block => {
    if (block.type === 'web_search_tool_result') {
      block.content.forEach((result, index) => {
        if (result.type !== 'web_search_result') return
        
        citations.push({
          position: index + 1,
          url: result.url,
          title: result.title,
          domain: new URL(result.url).hostname.replace('www.', ''),
          snippet: result.snippet,
          source: 'claude',
        })
      })
    }
  })
  
  // 텍스트 블록에서 인용 마커 분석 (선택적)
  const textBlock = response.content.find(b => b.type === 'text')
  if (textBlock && textBlock.type === 'text') {
    // Claude는 자동으로 인용 정보를 포함하므로 추가 파싱 가능
  }
  
  return citations
}
```

---

## 3. 통합 인용 스키마

### 3.1 정규화된 인용 타입

모든 LLM의 인용 데이터를 통합하는 표준 스키마:

```typescript
interface UnifiedCitation {
  // 기본 정보
  id: string                    // UUID
  source: 'perplexity' | 'chatgpt' | 'gemini' | 'claude'
  position: number              // 인용 순서 (1부터 시작)
  
  // URL 정보
  url: string
  cleanUrl: string              // 쿼리 파라미터 제거된 URL
  domain: string                // 도메인만
  
  // 메타데이터
  title: string | null
  snippet: string | null
  publishedDate: string | null
  
  // 분석 데이터
  mentionCount: number          // 답변 내 언급 횟수
  avgConfidence: number | null  // Gemini만 제공 (0-1)
  
  // 텍스트 매핑 (지원하는 LLM만)
  textSpans: TextSpan[]
}

interface TextSpan {
  start: number
  end: number
  text: string
  confidence?: number  // Gemini만
}
```

### 3.2 분석 결과 타입

```typescript
interface AnalysisResult {
  id: string
  query: string
  analyzedAt: string
  
  // 내 도메인/브랜드 정보
  myDomain: string
  myBrand: string
  brandAliases: string[]
  
  // LLM별 결과
  results: {
    perplexity: LLMResult | null
    chatgpt: LLMResult | null
    gemini: LLMResult | null
    claude: LLMResult | null
  }
  
  // 통합 분석
  summary: AnalysisSummary
  competitorAnalysis: CompetitorAnalysis[]
}

interface LLMResult {
  success: boolean
  answer: string
  citations: UnifiedCitation[]
  
  // 내 도메인 분석
  myDomainCited: boolean
  myDomainPositions: number[]    // 인용된 순위들
  myDomainConfidence: number[]   // Gemini만
  
  // 브랜드 언급 분석
  brandMentioned: boolean
  brandMentionContext: string[]  // 언급된 문맥
  
  // 메타
  responseTimeMs: number
  model: string
  error: string | null
}

interface AnalysisSummary {
  // 인용률
  citationRate: number           // 0-100%
  citationRateByLLM: {
    perplexity: number
    chatgpt: number
    gemini: number
    claude: number
  }
  
  // 브랜드 언급률
  brandMentionRate: number
  
  // 경쟁 분석
  avgCitationPosition: number    // 인용 시 평균 순위
  topCompetitors: string[]       // 더 많이 인용된 경쟁사
  
  // Gemini 전용
  avgConfidenceScore: number | null
}
```

---

## 4. 신뢰성 검증 전략

### 4.1 인용 정확성 검증

LLM은 가끔 인용을 "환각"합니다. 검증 로직:

```typescript
async function verifyCitation(citation: UnifiedCitation): Promise<VerificationResult> {
  try {
    // 1. URL 접근 가능 여부 확인
    const response = await fetch(citation.url, {
      method: 'HEAD',
      timeout: 5000,
    })
    
    if (!response.ok) {
      return { valid: false, reason: 'URL_NOT_ACCESSIBLE' }
    }
    
    // 2. 페이지 내용 확인 (선택적)
    const pageContent = await fetchPageContent(citation.url)
    
    // 3. 인용된 내용이 실제 페이지에 있는지 확인
    if (citation.snippet) {
      const similarity = calculateSimilarity(citation.snippet, pageContent)
      if (similarity < 0.5) {
        return { valid: false, reason: 'CONTENT_MISMATCH', similarity }
      }
    }
    
    return { valid: true }
  } catch (error) {
    return { valid: false, reason: 'FETCH_ERROR', error: error.message }
  }
}
```

### 4.2 크로스 플랫폼 일관성 확인

같은 쿼리에 대해 여러 LLM이 같은 소스를 인용하면 신뢰도 상승:

```typescript
function calculateCrossValidation(results: AnalysisResult): CrossValidation {
  const allCitations = [
    ...(results.results.perplexity?.citations || []),
    ...(results.results.chatgpt?.citations || []),
    ...(results.results.gemini?.citations || []),
    ...(results.results.claude?.citations || []),
  ]
  
  // 도메인별 인용 횟수
  const domainCounts: Record<string, number> = {}
  allCitations.forEach(citation => {
    const domain = citation.domain
    domainCounts[domain] = (domainCounts[domain] || 0) + 1
  })
  
  // 2개 이상 LLM이 인용한 도메인
  const crossValidated = Object.entries(domainCounts)
    .filter(([_, count]) => count >= 2)
    .map(([domain, count]) => ({ domain, count }))
  
  return {
    crossValidatedDomains: crossValidated,
    validationScore: crossValidated.length / Object.keys(domainCounts).length,
  }
}
```

---

## 5. 도메인/브랜드 매칭 알고리즘

### 5.1 도메인 매칭

```typescript
function checkDomainMatch(
  citation: UnifiedCitation,
  targetDomain: string
): boolean {
  // 정규화
  const citationDomain = citation.domain.toLowerCase().replace('www.', '')
  const target = targetDomain.toLowerCase().replace('www.', '')
  
  // 정확히 일치
  if (citationDomain === target) return true
  
  // 서브도메인 일치 (blog.example.com === example.com)
  if (citationDomain.endsWith('.' + target)) return true
  
  // 도메인이 서브도메인에 포함 (example.com이 sub.example.com에 포함)
  if (target.endsWith('.' + citationDomain)) return true
  
  return false
}
```

### 5.2 브랜드 언급 감지

```typescript
interface BrandMention {
  found: boolean
  mentions: {
    term: string
    context: string
    position: number
  }[]
}

function findBrandMentions(
  text: string,
  brandName: string,
  aliases: string[] = []
): BrandMention {
  const searchTerms = [brandName, ...aliases].filter(Boolean)
  const mentions: BrandMention['mentions'] = []
  
  searchTerms.forEach(term => {
    // 대소문자 무시 검색
    const regex = new RegExp(escapeRegex(term), 'gi')
    let match
    
    while ((match = regex.exec(text)) !== null) {
      // 전후 50자 문맥 추출
      const start = Math.max(0, match.index - 50)
      const end = Math.min(text.length, match.index + term.length + 50)
      const context = text.substring(start, end)
      
      mentions.push({
        term: match[0],
        context: context,
        position: match.index,
      })
    }
  })
  
  return {
    found: mentions.length > 0,
    mentions,
  }
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

---

## 6. 경쟁사 분석 로직

### 6.1 경쟁사 인용 추출

```typescript
interface CompetitorAnalysis {
  competitor: {
    name: string
    domain: string
    aliases: string[]
  }
  citations: {
    llm: string
    position: number
    url: string
    confidence?: number
  }[]
  citationRate: number     // 몇 개 LLM에서 인용되었는지
  avgPosition: number      // 평균 인용 순위
  brandMentions: number    // 브랜드 언급 횟수
}

function analyzeCompetitors(
  results: AnalysisResult,
  competitors: Competitor[]
): CompetitorAnalysis[] {
  return competitors.map(competitor => {
    const allCitations: CompetitorAnalysis['citations'] = []
    let brandMentionCount = 0
    
    // 각 LLM 결과에서 경쟁사 인용 찾기
    Object.entries(results.results).forEach(([llm, result]) => {
      if (!result?.citations) return
      
      result.citations.forEach(citation => {
        if (checkDomainMatch(citation, competitor.domain)) {
          allCitations.push({
            llm,
            position: citation.position,
            url: citation.url,
            confidence: citation.avgConfidence,
          })
        }
      })
      
      // 브랜드 언급 확인
      const brandMention = findBrandMentions(
        result.answer,
        competitor.name,
        competitor.aliases
      )
      if (brandMention.found) {
        brandMentionCount += brandMention.mentions.length
      }
    })
    
    const citedLLMs = new Set(allCitations.map(c => c.llm))
    const avgPosition = allCitations.length > 0
      ? allCitations.reduce((sum, c) => sum + c.position, 0) / allCitations.length
      : 0
    
    return {
      competitor,
      citations: allCitations,
      citationRate: (citedLLMs.size / 4) * 100,  // 4개 LLM 기준
      avgPosition,
      brandMentions: brandMentionCount,
    }
  })
}
```

---

## 7. Edge Function 최종 구현

### 7.1 통합 분석 플로우

```typescript
// supabase/functions/analyze-query/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // ... CORS 처리 ...
  
  const { query, myDomain, myBrand, brandAliases, competitors } = await req.json()
  
  // 1. 모든 LLM 병렬 호출
  const [perplexityResult, openaiResult, geminiResult, claudeResult] = 
    await Promise.allSettled([
      queryPerplexity(query),
      queryOpenAI(query),
      queryGemini(query),
      queryClaude(query),
    ])
  
  // 2. 결과 파싱 및 정규화
  const results = {
    perplexity: perplexityResult.status === 'fulfilled' 
      ? processPerplexityResult(perplexityResult.value, myDomain, myBrand, brandAliases)
      : null,
    chatgpt: openaiResult.status === 'fulfilled'
      ? processOpenAIResult(openaiResult.value, myDomain, myBrand, brandAliases)
      : null,
    gemini: geminiResult.status === 'fulfilled'
      ? processGeminiResult(geminiResult.value, myDomain, myBrand, brandAliases)
      : null,
    claude: claudeResult.status === 'fulfilled'
      ? processClaudeResult(claudeResult.value, myDomain, myBrand, brandAliases)
      : null,
  }
  
  // 3. 요약 생성
  const summary = generateSummary(results)
  
  // 4. 경쟁사 분석 (옵션)
  const competitorAnalysis = competitors 
    ? analyzeCompetitors({ results }, competitors)
    : []
  
  // 5. 크로스 검증
  const crossValidation = calculateCrossValidation({ results })
  
  // 6. DB 저장
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const { data: analysis, error } = await supabase
    .from('analyses')
    .insert({
      query_text: query,
      my_domain: myDomain,
      my_brand: myBrand,
      results,
      summary,
      competitor_analysis: competitorAnalysis,
      cross_validation: crossValidation,
      status: 'completed',
    })
    .select()
    .single()
  
  return new Response(JSON.stringify(analysis), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

---

## 8. 한계점 및 대응 방안

### 8.1 알려진 한계점

| 한계점 | 영향도 | 대응 방안 |
|--------|--------|----------|
| **인용 환각** | 높음 | URL 접근성 검증 + 크로스 검증 |
| **검색 결과 변동** | 중간 | 동일 쿼리 다회 분석 → 평균 |
| **비용** | 중간 | Perplexity 우선, 필요시 Gemini 추가 |
| **응답 시간** | 낮음 | 병렬 호출 + 타임아웃 설정 |
| **지역화** | 낮음 | user_location 파라미터 활용 |

### 8.2 신뢰도 등급

| 등급 | 조건 | 신뢰도 |
|------|------|--------|
| **A** | 3개 이상 LLM에서 동일 도메인 인용 | 95%+ |
| **B** | 2개 LLM에서 동일 도메인 인용 | 80%+ |
| **C** | 1개 LLM에서 인용 + URL 검증 통과 | 60%+ |
| **D** | 1개 LLM에서 인용 + URL 검증 실패 | 30% 미만 |

### 8.3 권장 분석 전략

1. **기본 분석**: Perplexity + Gemini (가장 풍부한 인용 데이터)
2. **심층 분석**: 4개 LLM 전체 + 크로스 검증
3. **비용 최적화**: Perplexity만 (가장 저렴)
4. **신뢰도 우선**: Gemini (신뢰도 점수 제공)

---

## 9. 구현 우선순위

### Phase 1 (필수)
1. Perplexity API 연동 (가장 풍부한 데이터)
2. 기본 인용 추출 및 정규화
3. 도메인/브랜드 매칭

### Phase 2 (권장)
4. OpenAI Responses API 연동
5. Gemini Search Grounding 연동
6. 크로스 플랫폼 검증

### Phase 3 (고급)
7. Claude 웹 검색 연동
8. 인용 환각 검증
9. 경쟁사 상세 분석
10. 시계열 트렌드 분석

---

## 10. 결론

### 핵심 변경 사항 (기존 설계 대비)

1. **OpenAI**: 정규식 파싱 → `annotations[]` 직접 사용
2. **Perplexity**: `return_citations` → `search_results[]` 사용
3. **Gemini**: 기본 연동 → `groundingMetadata` + 신뢰도 점수 활용
4. **Claude**: 추가 (2025년 5월 출시된 웹 검색 기능)
5. **검증 레이어**: 새로 추가 (인용 환각 방지)

### 예상 신뢰도 (개선 후)

| 항목 | 기존 설계 | 개선 후 |
|------|----------|---------|
| Perplexity 인용 추출 | 70% | 95% |
| OpenAI 인용 추출 | 30% | 90% |
| Gemini 인용 추출 | 60% | 95% |
| Claude 인용 추출 | 0% | 85% |
| **종합 신뢰도** | **40-50%** | **90%+** |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 (기존 설계) |
| 2.0 | 2025-11-28 | 전면 개정 - 2025년 API 업데이트 반영 |