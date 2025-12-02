# Phase 1 설계서
## 03. Edge Function 개발 (LLM API 호출)

---

## Phase 정보
| 항목 | 내용 |
|------|------|
| Phase | 1 - Core MVP |
| 문서 | 03/04 |
| 예상 기간 | 7-10일 |
| 선행 작업 | Phase1_02_Database 완료 |
| 참고 문서 | CORE_LLM_Citation_Methodology.md |

---

## 1. 개요

### 1.1 목표
- Supabase Edge Function으로 LLM API 호출 구현
- **4개 LLM 병렬 호출**: Perplexity, ChatGPT (OpenAI), Gemini, Claude
- 2025년 최신 API 스펙에 맞춘 인용 추출
- 통합 인용 스키마를 사용한 정규화
- 도메인/브랜드 매칭 및 경쟁사 분석 로직 구현

### 1.2 LLM별 API 현황 (2025년 기준)

| LLM | API 방식 | 인용 API | 신뢰도 점수 | 텍스트 매핑 | 비용 (1,000건) |
|-----|---------|---------|------------|------------|---------------|
| Perplexity | `search_results[]` | ✅ | ❌ | ❌ | ~$5 |
| OpenAI | Responses API `annotations[]` | ✅ | ❌ | ✅ | ~$30 |
| Gemini | `groundingMetadata` | ✅ | ✅ | ✅ | ~$35 |
| Claude | Web Search Tool | ✅ | ❌ | ✅ | ~$10 |

### 1.3 산출물
- [ ] Edge Function: `analyze-query`
- [ ] LLM별 API 래퍼 함수 (4개)
- [ ] 통합 인용 파싱 유틸리티
- [ ] 도메인/브랜드 매칭 유틸리티
- [ ] 경쟁사 분석 유틸리티
- [ ] 크로스 플랫폼 검증 로직
- [ ] 에러 핸들링 및 재시도 로직

---

## 2. 아키텍처

### 2.1 Edge Function 흐름

```
[클라이언트 요청]
       │
       ▼
[analyze-query Edge Function]
       │
       ├─► 1. 요청 검증
       │
       ├─► 2. DB에 분석 레코드 생성 (status: processing)
       │
       ├─► 3. LLM 병렬 호출 (Promise.allSettled)
       │    ├─► Perplexity API (sonar-pro + search_results)
       │    ├─► OpenAI Responses API (annotations)
       │    ├─► Gemini API (groundingMetadata + confidenceScores)
       │    └─► Claude API (web_search_20250305)
       │
       ├─► 4. 결과 파싱 및 통합 인용 스키마 정규화
       │
       ├─► 5. 도메인/브랜드 매칭
       │
       ├─► 6. 경쟁사 분석 (옵션)
       │
       ├─► 7. 크로스 플랫폼 검증
       │
       ├─► 8. 요약 정보 생성
       │
       ├─► 9. DB 업데이트 (status: completed)
       │
       └─► 10. 결과 반환
```

### 2.2 파일 구조

```
supabase/
└── functions/
    └── analyze-query/
        ├── index.ts              # 메인 핸들러
        ├── llm/
        │   ├── perplexity.ts     # Perplexity API (search_results)
        │   ├── openai.ts         # OpenAI Responses API (annotations)
        │   ├── gemini.ts         # Gemini API (groundingMetadata)
        │   ├── claude.ts         # Claude API (web_search tool)
        │   └── types.ts          # 공통 타입 + UnifiedCitation
        ├── utils/
        │   ├── citation-parser.ts    # 통합 인용 파싱
        │   ├── domain-matcher.ts     # 도메인 매칭
        │   ├── brand-matcher.ts      # 브랜드 언급 감지
        │   ├── competitor-analysis.ts # 경쟁사 분석
        │   ├── cross-validation.ts   # 크로스 플랫폼 검증
        │   └── summary.ts            # 요약 생성
        └── deno.json             # Deno 설정
```

---

## 3. 작업 상세

### Task 1.3.1: Supabase CLI 설정

#### 작업 내용

```bash
# Supabase CLI 설치 (macOS)
brew install supabase/tap/supabase

# 또는 npm으로 설치
npm install -g supabase

# 프로젝트 루트에서 초기화
supabase init

# Supabase 프로젝트 연결
supabase login
supabase link --project-ref [YOUR_PROJECT_REF]

# Edge Functions 디렉토리 생성
supabase functions new analyze-query
```

#### 체크리스트
- [ ] Supabase CLI 설치 완료
- [ ] `supabase init` 실행 완료
- [ ] 프로젝트 연결 완료
- [ ] analyze-query 함수 생성

---

### Task 1.3.2: 환경 변수 설정

#### 작업 내용

Supabase Dashboard > Project Settings > Edge Functions > Secrets:

```env
PERPLEXITY_API_KEY=pplx-xxx
OPENAI_API_KEY=sk-xxx
GOOGLE_AI_API_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

로컬 개발용 `.env` 파일 (supabase/functions/.env):
```env
# LLM API Keys
PERPLEXITY_API_KEY=pplx-xxx
OPENAI_API_KEY=sk-xxx
GOOGLE_AI_API_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

#### 체크리스트
- [ ] Supabase Dashboard에 4개 LLM API Key Secrets 등록
- [ ] 로컬 .env 파일 생성
- [ ] .gitignore에 supabase/functions/.env 추가

---

### Task 1.3.3: 공통 타입 정의 (통합 인용 스키마)

#### 작업 내용

**supabase/functions/analyze-query/llm/types.ts**:

```typescript
// ============================================
// 통합 인용 스키마 (UnifiedCitation)
// ============================================

// 텍스트 위치 매핑 (OpenAI, Gemini 지원)
export interface TextSpan {
  start: number
  end: number
  text: string
  confidence?: number  // Gemini만 제공
}

// 정규화된 인용 타입 - 모든 LLM 공통
export interface UnifiedCitation {
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
  publishedDate: string | null  // Perplexity만 제공

  // 분석 데이터
  mentionCount: number          // 답변 내 언급 횟수
  avgConfidence: number | null  // Gemini만 제공 (0-1)
  confidenceScores: number[]    // Gemini: 각 세그먼트별 신뢰도

  // 텍스트 매핑 (OpenAI, Gemini 지원)
  textSpans: TextSpan[]
}

// ============================================
// LLM 응답 타입
// ============================================

// 기본 LLM 응답
export interface LLMResponse {
  success: boolean
  answer: string
  citations: UnifiedCitation[]
  model: string
  responseTimeMs: number
  error?: string
}

// 분석 요청
export interface AnalyzeRequest {
  query: string
  myDomain?: string
  myBrand?: string
  brandAliases?: string[]
  competitors?: Competitor[]
}

// 경쟁사 정보
export interface Competitor {
  name: string
  domain: string
  aliases: string[]
}

// ============================================
// 처리된 결과 타입
// ============================================

// LLM별 처리된 결과
export interface ProcessedLLMResult {
  success: boolean
  answer: string
  citations: UnifiedCitation[]

  // 내 도메인 분석
  myDomainCited: boolean
  myDomainPositions: number[]    // 인용된 순위들
  myDomainConfidence: number[]   // Gemini만 - 신뢰도 점수

  // 브랜드 언급 분석
  brandMentioned: boolean
  brandMentionContext: string[]  // 언급된 문맥들

  // 메타
  responseTimeMs: number
  model: string
  error: string | null
}

// 전체 분석 결과 (4개 LLM)
export interface AnalysisResult {
  perplexity: ProcessedLLMResult | null
  chatgpt: ProcessedLLMResult | null
  gemini: ProcessedLLMResult | null
  claude: ProcessedLLMResult | null
}

// ============================================
// 분석 요약 및 검증 타입
// ============================================

// 분석 요약
export interface AnalysisSummary {
  // 기본 통계
  totalLlms: number              // 4
  successfulLlms: number
  failedLlms: number

  // 인용률
  citationRate: number           // 0-100%
  citationRateByLLM: {
    perplexity: number
    chatgpt: number
    gemini: number
    claude: number
  }

  // 내 도메인 분석
  myDomainCitedCount: number
  myDomainCitedBy: string[]
  avgCitationPosition: number    // 인용 시 평균 순위

  // 브랜드 언급
  brandMentionRate: number
  brandMentionedCount: number
  brandMentionedBy: string[]

  // 전체 인용 통계
  totalCitations: number
  uniqueDomainsCited: number

  // Gemini 전용
  avgConfidenceScore: number | null

  // 응답 시간
  avgResponseTimeMs: number
}

// 크로스 플랫폼 검증 결과
export interface CrossValidation {
  crossValidatedDomains: {
    domain: string
    count: number           // 몇 개 LLM에서 인용되었는지
  }[]
  validationScore: number   // 0-1 (높을수록 신뢰도 높음)
}

// 경쟁사 분석 결과
export interface CompetitorAnalysis {
  competitor: Competitor
  citations: {
    llm: string
    position: number
    url: string
    confidence?: number
  }[]
  citationRate: number      // 몇 개 LLM에서 인용되었는지 (%)
  avgPosition: number       // 평균 인용 순위
  brandMentions: number     // 브랜드 언급 횟수
}
```

#### 체크리스트
- [ ] types.ts 파일 생성 완료
- [ ] UnifiedCitation 통합 인용 스키마 정의
- [ ] 4개 LLM 지원 타입 정의
- [ ] CrossValidation, CompetitorAnalysis 타입 정의

---

### Task 1.3.4: OpenAI API 구현 (Responses API + annotations)

#### 핵심 변경 사항 (기존 Chat Completions → Responses API)
- **새 엔드포인트**: `/v1/responses` (기존 `/v1/chat/completions` 대신)
- **웹 검색 도구**: `web_search_preview` 사용
- **인용 추출**: `annotations[]` 배열에서 직접 추출 (정규식 파싱 불필요!)
- **텍스트 매핑**: `start_index`, `end_index`로 정확한 위치 제공

#### 작업 내용

**supabase/functions/analyze-query/llm/openai.ts**:

```typescript
import { UnifiedCitation, LLMResponse, TextSpan } from './types.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// OpenAI Responses API 응답 타입
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

export async function queryOpenAI(query: string): Promise<LLMResponse> {
  const startTime = Date.now()

  try {
    // ✅ Responses API 사용 (2025년 권장)
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
        tool_choice: { type: 'web_search_preview' },  // 강제 웹 검색
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data: OpenAISearchResponse = await response.json()
    const responseTimeMs = Date.now() - startTime

    // 응답에서 텍스트 및 annotations 추출
    const output = data.output[0]
    if (!output || output.type !== 'message') {
      throw new Error('Invalid response format')
    }

    const content = output.content[0]
    if (!content || content.type !== 'output_text') {
      throw new Error('Invalid content format')
    }

    const answer = content.text
    const annotations = content.annotations || []

    // ✅ annotations에서 직접 인용 추출 (정규식 파싱 불필요!)
    const citations = parseOpenAICitations(annotations, answer)

    return {
      success: true,
      answer,
      citations,
      model: 'gpt-4o',
      responseTimeMs,
    }
  } catch (error) {
    return {
      success: false,
      answer: '',
      citations: [],
      model: 'gpt-4o',
      responseTimeMs: Date.now() - startTime,
      error: error.message,
    }
  }
}

// OpenAI annotations에서 인용 추출 (정규화)
function parseOpenAICitations(
  annotations: Annotation[],
  text: string
): UnifiedCitation[] {
  const citations: UnifiedCitation[] = []
  const seenUrls = new Map<string, UnifiedCitation>()

  annotations.forEach((annotation) => {
    if (annotation.type !== 'url_citation') return

    // URL 정규화 (쿼리 파라미터 제거)
    const cleanUrl = annotation.url.split('?')[0]

    // 이미 있는 URL이면 언급 횟수만 증가
    if (seenUrls.has(cleanUrl)) {
      const existing = seenUrls.get(cleanUrl)!
      existing.mentionCount += 1
      existing.textSpans.push({
        start: annotation.start_index,
        end: annotation.end_index,
        text: text.substring(annotation.start_index, annotation.end_index),
      })
      return
    }

    // 새 인용 추가
    const citation: UnifiedCitation = {
      id: crypto.randomUUID(),
      source: 'chatgpt',
      position: citations.length + 1,
      url: annotation.url,
      cleanUrl,
      domain: extractDomain(annotation.url),
      title: annotation.title,
      snippet: null,
      publishedDate: null,
      mentionCount: 1,
      avgConfidence: null,  // OpenAI는 신뢰도 점수 미제공
      confidenceScores: [],
      textSpans: [{
        start: annotation.start_index,
        end: annotation.end_index,
        text: text.substring(annotation.start_index, annotation.end_index),
      }],
    }

    citations.push(citation)
    seenUrls.set(cleanUrl, citation)
  })

  return citations
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return ''
  }
}
```

#### 대안: Chat Completions API (Search Models)

Responses API 대신 기존 Chat Completions 구조를 선호하는 경우:

```typescript
// 대안 구현 (gpt-4o-search-preview 모델 사용)
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-search-preview',  // 또는 gpt-4o-mini-search-preview
    messages: [{ role: 'user', content: query }],
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

#### OpenAI 인용 특성 (GEO 최적화 포인트)
- **선택적 인용**: 구글 SERP와 15% 미만 중복
- **맥락 기반 소스 선택**: 쿼리 의도에 맞는 소스 우선
- **E-E-A-T 신호 반영**: 저자 정보 중시

#### 체크리스트
- [ ] openai.ts 파일 생성 완료
- [ ] Responses API 호출 로직 구현
- [ ] annotations 기반 인용 파싱 구현
- [ ] textSpans (start_index, end_index) 매핑 구현

---

### Task 1.3.5: Gemini API 구현 (groundingMetadata + confidenceScores)

#### 핵심 변경 사항
- **모델**: `gemini-2.0-flash` (최신 모델)
- **도구**: `google_search` (Gemini 2.0+)
- **핵심 기능**: `confidenceScores[]` - **유일하게 신뢰도 점수를 제공하는 LLM!**
- **텍스트 매핑**: `groundingSupports.segment`로 정확한 위치 제공

#### 작업 내용

**supabase/functions/analyze-query/llm/gemini.ts**:

```typescript
import { UnifiedCitation, LLMResponse, TextSpan } from './types.ts'

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')

// Gemini 응답 타입
interface GeminiResponse {
  candidates: [{
    content: {
      parts: [{ text: string }]
      role: string
    }
    groundingMetadata?: GroundingMetadata
  }]
}

interface GroundingMetadata {
  groundingChunks: GroundingChunk[]
  groundingSupports: GroundingSupport[]
  webSearchQueries: string[]
  searchEntryPoint?: {
    renderedContent: string
  }
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
  confidenceScores: number[]  // ⭐ 핵심: 신뢰도 점수! (0-1)
}

export async function queryGemini(query: string): Promise<LLMResponse> {
  const startTime = Date.now()

  try {
    // ✅ Gemini 2.0 API with Google Search
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
            google_search: {}  // Gemini 2.0+ 방식
          }],
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${error}`)
    }

    const data: GeminiResponse = await response.json()
    const responseTimeMs = Date.now() - startTime

    // 응답 텍스트 추출
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // ✅ groundingMetadata에서 인용 + 신뢰도 점수 추출
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata
    const citations = parseGeminiCitations(groundingMetadata)

    return {
      success: true,
      answer,
      citations,
      model: 'gemini-2.0-flash',
      responseTimeMs,
    }
  } catch (error) {
    return {
      success: false,
      answer: '',
      citations: [],
      model: 'gemini-2.0-flash',
      responseTimeMs: Date.now() - startTime,
      error: error.message,
    }
  }
}

// Gemini groundingMetadata에서 인용 + 신뢰도 점수 추출
function parseGeminiCitations(
  groundingMetadata?: GroundingMetadata
): UnifiedCitation[] {
  const citations: UnifiedCitation[] = []

  if (!groundingMetadata) return citations

  const { groundingChunks, groundingSupports } = groundingMetadata

  // 1단계: groundingChunks에서 기본 인용 정보 추출
  groundingChunks?.forEach((chunk, index) => {
    if (!chunk.web) return

    citations.push({
      id: crypto.randomUUID(),
      source: 'gemini',
      position: index + 1,
      url: chunk.web.uri,
      cleanUrl: chunk.web.uri.split('?')[0],
      domain: extractDomain(chunk.web.uri),
      title: chunk.web.title,
      snippet: null,
      publishedDate: null,
      mentionCount: 0,           // 나중에 채움
      avgConfidence: null,       // 나중에 계산
      confidenceScores: [],      // 나중에 채움
      textSpans: [],             // 나중에 채움
    })
  })

  // 2단계: groundingSupports에서 신뢰도 점수 및 텍스트 매핑 추출 ⭐
  groundingSupports?.forEach((support) => {
    support.groundingChunkIndices.forEach((chunkIndex, i) => {
      const citation = citations[chunkIndex]
      if (!citation) return

      // 신뢰도 점수 추가
      const confidence = support.confidenceScores[i]
      citation.confidenceScores.push(confidence)
      citation.mentionCount += 1

      // 지원하는 텍스트 세그먼트 추가
      citation.textSpans.push({
        start: support.segment.startIndex,
        end: support.segment.endIndex,
        text: support.segment.text,
        confidence,  // ⭐ Gemini만 제공하는 신뢰도!
      })
    })
  })

  // 3단계: 평균 신뢰도 계산
  citations.forEach(citation => {
    if (citation.confidenceScores.length > 0) {
      citation.avgConfidence =
        citation.confidenceScores.reduce((a, b) => a + b, 0) /
        citation.confidenceScores.length
    }
  })

  return citations
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return ''
  }
}
```

#### 대안: Gemini 1.5 사용 시

```typescript
// Gemini 1.5 모델 사용 시 다른 도구 설정
tools: [{
  google_search_retrieval: {
    dynamic_retrieval_config: {
      mode: 'MODE_DYNAMIC',
      dynamicThreshold: 0.3
    }
  }
}]
```

#### Gemini 인용 특성 (GEO 최적화 포인트)
- **E-E-A-T 중시**: 경험, 전문성, 권위, 신뢰성
- **Schema.org 마크업**: 구조화 데이터 절대적 중요
- **dateModified**: 최신성 신호로 중요
- **Information Gain**: 새로운 정보 제공 페이지 선호
- **신뢰도 점수**: 0.7 이상이면 높은 신뢰도

#### 체크리스트
- [ ] gemini.ts 파일 생성 완료
- [ ] Gemini 2.0 API 호출 로직 구현
- [ ] groundingChunks 파싱 구현
- [ ] groundingSupports에서 confidenceScores 추출 구현 ⭐
- [ ] 평균 신뢰도 계산 로직 구현

---

### Task 1.3.6: Perplexity API 구현 (search_results + search_context_size)

#### 핵심 변경 사항
- **모델**: `sonar-pro` (2배 더 많은 인용 반환)
- **인용 소스**: `search_results[]` 우선 사용 (deprecated `citations[]` fallback)
- **검색 컨텍스트**: `search_context_size: 'high'` 설정
- **추가 데이터**: `date` (발행일), `snippet` (발췌문) 포함

#### 작업 내용

**supabase/functions/analyze-query/llm/perplexity.ts**:

```typescript
import { UnifiedCitation, LLMResponse } from './types.ts'

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')

// Perplexity 응답 타입
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
  citations: string[]           // deprecated but still works
  search_results: SearchResult[]  // ✅ 권장: 더 풍부한 메타데이터
}

interface SearchResult {
  title: string
  url: string
  date?: string    // 발행일
  snippet?: string // 발췌문
}

export async function queryPerplexity(query: string): Promise<LLMResponse> {
  const startTime = Date.now()

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',  // ✅ sonar-pro가 2배 더 많은 인용 반환
        messages: [
          { role: 'user', content: query }
        ],
        search_context_size: 'high',  // ✅ low/medium/high
        return_related_questions: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Perplexity API error: ${response.status} - ${error}`)
    }

    const data: PerplexityResponse = await response.json()
    const responseTimeMs = Date.now() - startTime

    const answer = data.choices?.[0]?.message?.content || ''

    // ✅ search_results 우선 사용, citations fallback
    const citations = parsePerplexityCitations(data, answer)

    return {
      success: true,
      answer,
      citations,
      model: data.model || 'sonar-pro',
      responseTimeMs,
    }
  } catch (error) {
    return {
      success: false,
      answer: '',
      citations: [],
      model: 'sonar-pro',
      responseTimeMs: Date.now() - startTime,
      error: error.message,
    }
  }
}

// Perplexity 인용 추출 (search_results 우선)
function parsePerplexityCitations(
  response: PerplexityResponse,
  content: string
): UnifiedCitation[] {
  const citations: UnifiedCitation[] = []

  // ✅ search_results 우선 사용 (더 풍부한 데이터)
  if (response.search_results && response.search_results.length > 0) {
    response.search_results.forEach((result, index) => {
      citations.push({
        id: crypto.randomUUID(),
        source: 'perplexity',
        position: index + 1,
        url: result.url,
        cleanUrl: result.url.split('?')[0],
        domain: extractDomain(result.url),
        title: result.title,
        snippet: result.snippet || null,
        publishedDate: result.date || null,  // ✅ Perplexity만 제공
        mentionCount: 0,  // 나중에 계산
        avgConfidence: null,  // Perplexity는 신뢰도 미제공
        confidenceScores: [],
        textSpans: [],  // Perplexity는 텍스트 매핑 미제공
      })
    })
  }
  // fallback: citations 배열 사용 (deprecated)
  else if (response.citations && response.citations.length > 0) {
    response.citations.forEach((url, index) => {
      citations.push({
        id: crypto.randomUUID(),
        source: 'perplexity',
        position: index + 1,
        url: url,
        cleanUrl: url.split('?')[0],
        domain: extractDomain(url),
        title: null,  // citations 배열에는 제목 없음
        snippet: null,
        publishedDate: null,
        mentionCount: 0,
        avgConfidence: null,
        confidenceScores: [],
        textSpans: [],
      })
    })
  }

  // 응답 텍스트에서 인용 번호 [1], [2] 등 카운트
  const citationPattern = /\[(\d+)\]/g
  let match

  while ((match = citationPattern.exec(content)) !== null) {
    const citationIndex = parseInt(match[1]) - 1
    if (citations[citationIndex]) {
      citations[citationIndex].mentionCount += 1
    }
  }

  return citations
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return ''
  }
}
```

#### Perplexity 인용 특성 (GEO 최적화 포인트)
- **FAQ Schema 페이지**: 인용 확률 41% (일반 페이지 24%)
- **BLUF 구조**: 상단 80토큰 이내 직접 답변 선호
- **페이지 로딩 속도**: 2초 이하 권장
- **최신성**: 시간 감쇠 메커니즘 적용

#### 체크리스트
- [ ] perplexity.ts 파일 생성 완료
- [ ] sonar-pro 모델 + search_context_size 설정
- [ ] search_results[] 기반 인용 파싱 구현
- [ ] citations[] fallback 구현
- [ ] mentionCount 계산 로직 구현

---

### Task 1.3.7: Claude API 구현 (web_search_20250305)

#### 핵심 변경 사항 (신규 추가)
- **도구**: `web_search_20250305` (2025년 5월 출시)
- **모델**: `claude-sonnet-4-20250514`
- **인용 추출**: `web_search_tool_result` 블록에서 추출
- **도메인 필터링**: `allowed_domains`, `blocked_domains` 지원

#### 작업 내용

**supabase/functions/analyze-query/llm/claude.ts**:

```typescript
import { UnifiedCitation, LLMResponse } from './types.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

// Claude 응답 타입
interface ClaudeResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: ContentBlock[]
  stop_reason: string
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'web_search_tool_result'; content: WebSearchResult[] }

interface WebSearchResult {
  type: 'web_search_result'
  url: string
  title: string
  snippet: string
  encrypted_content?: string
}

export async function queryClaude(query: string): Promise<LLMResponse> {
  const startTime = Date.now()

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY!,
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
          // 선택: 특정 도메인 필터링
          // allowed_domains: ['example.com'],
          // blocked_domains: ['spam.com'],
        }],
        messages: [
          { role: 'user', content: query }
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude API error: ${response.status} - ${error}`)
    }

    const data: ClaudeResponse = await response.json()
    const responseTimeMs = Date.now() - startTime

    // 응답 텍스트 추출
    const textBlock = data.content.find(b => b.type === 'text')
    const answer = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    // web_search_tool_result에서 인용 추출
    const citations = parseClaudeCitations(data)

    return {
      success: true,
      answer,
      citations,
      model: 'claude-sonnet-4-20250514',
      responseTimeMs,
    }
  } catch (error) {
    return {
      success: false,
      answer: '',
      citations: [],
      model: 'claude-sonnet-4-20250514',
      responseTimeMs: Date.now() - startTime,
      error: error.message,
    }
  }
}

// Claude web_search_tool_result에서 인용 추출
function parseClaudeCitations(response: ClaudeResponse): UnifiedCitation[] {
  const citations: UnifiedCitation[] = []

  response.content.forEach(block => {
    if (block.type === 'web_search_tool_result') {
      block.content.forEach((result, index) => {
        if (result.type !== 'web_search_result') return

        citations.push({
          id: crypto.randomUUID(),
          source: 'claude',
          position: index + 1,
          url: result.url,
          cleanUrl: result.url.split('?')[0],
          domain: extractDomain(result.url),
          title: result.title,
          snippet: result.snippet,
          publishedDate: null,
          mentionCount: 1,  // Claude는 검색 결과를 답변에 포함
          avgConfidence: null,  // Claude는 신뢰도 미제공
          confidenceScores: [],
          textSpans: [],  // Claude는 정확한 텍스트 매핑 미제공
        })
      })
    }
  })

  return citations
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return ''
  }
}
```

#### Claude 인용 특성 (GEO 최적화 포인트)
- **도메인 필터링**: `allowed_domains`로 특정 도메인만 검색 가능
- **검색 횟수 제한**: `max_uses`로 비용 제어
- **웹 검색 강제**: 도구 사용 시 자동으로 웹 검색 수행

#### 체크리스트
- [ ] claude.ts 파일 생성 완료
- [ ] web_search_20250305 도구 호출 구현
- [ ] web_search_tool_result 파싱 구현
- [ ] 인용 정규화 구현

---

### Task 1.3.8: 유틸리티 함수 구현 (개선)

#### 작업 내용

**supabase/functions/analyze-query/utils/domain-matcher.ts**:

```typescript
import { Citation, ProcessedLLMResult, LLMResponse } from '../llm/types.ts'

/**
 * 도메인 정규화
 */
export function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\/$/, '')
}

/**
 * 두 도메인이 같은지 확인 (서브도메인 포함)
 */
export function domainsMatch(domain1: string, domain2: string): boolean {
  const d1 = normalizeDomain(domain1)
  const d2 = normalizeDomain(domain2)
  
  // 정확히 일치
  if (d1 === d2) return true
  
  // 서브도메인 매칭 (예: blog.example.com과 example.com)
  if (d1.endsWith('.' + d2) || d2.endsWith('.' + d1)) return true
  
  return false
}

/**
 * 브랜드 언급 확인
 */
export function findBrandMention(
  text: string, 
  brandName: string, 
  aliases: string[] = []
): { mentioned: boolean; context: string | null } {
  const searchTerms = [brandName, ...aliases].filter(Boolean)
  
  for (const term of searchTerms) {
    const regex = new RegExp(term, 'gi')
    const match = regex.exec(text)
    
    if (match) {
      // 언급된 부분의 앞뒤 문맥 추출 (최대 100자)
      const start = Math.max(0, match.index - 50)
      const end = Math.min(text.length, match.index + term.length + 50)
      const context = text.substring(start, end)
      
      return {
        mentioned: true,
        context: `...${context}...`
      }
    }
  }
  
  return { mentioned: false, context: null }
}

/**
 * LLM 응답을 처리된 결과로 변환
 */
export function processLLMResult(
  response: LLMResponse,
  myDomain?: string,
  myBrand?: string,
  brandAliases?: string[]
): ProcessedLLMResult {
  // 내 도메인 인용 확인
  let myDomainCited = false
  const myDomainPositions: number[] = []
  
  if (myDomain) {
    response.citations.forEach(citation => {
      if (domainsMatch(citation.domain, myDomain)) {
        myDomainCited = true
        myDomainPositions.push(citation.position)
      }
    })
  }
  
  // 브랜드 언급 확인
  const brandMention = myBrand 
    ? findBrandMention(response.answer, myBrand, brandAliases)
    : { mentioned: false, context: null }
  
  return {
    success: response.success,
    answer: response.answer,
    citations: response.citations,
    myDomainCited,
    myDomainPositions,
    brandMentioned: brandMention.mentioned,
    brandMentionContext: brandMention.context,
    responseTimeMs: response.responseTimeMs,
    model: response.model,
    error: response.error || null,
  }
}
```

**supabase/functions/analyze-query/utils/summary.ts**:

```typescript
import { AnalysisResult, AnalysisSummary, ProcessedLLMResult } from '../llm/types.ts'

/**
 * 분석 결과 요약 생성
 */
export function generateSummary(results: AnalysisResult): AnalysisSummary {
  const llmResults = Object.entries(results) as [string, ProcessedLLMResult][]
  
  const totalLlms = llmResults.length
  const successfulLlms = llmResults.filter(([_, r]) => r.success).length
  const failedLlms = totalLlms - successfulLlms
  
  const myDomainCitedBy = llmResults
    .filter(([_, r]) => r.myDomainCited)
    .map(([name]) => name)
  
  const brandMentionedBy = llmResults
    .filter(([_, r]) => r.brandMentioned)
    .map(([name]) => name)
  
  const allCitations = llmResults.flatMap(([_, r]) => r.citations)
  const uniqueDomains = new Set(allCitations.map(c => c.domain))
  
  const responseTimes = llmResults
    .filter(([_, r]) => r.success)
    .map(([_, r]) => r.responseTimeMs)
  
  const avgResponseTimeMs = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0
  
  return {
    totalLlms,
    successfulLlms,
    failedLlms,
    myDomainCitedCount: myDomainCitedBy.length,
    myDomainCitedBy,
    brandMentionedCount: brandMentionedBy.length,
    brandMentionedBy,
    totalCitations: allCitations.length,
    uniqueDomainsCited: uniqueDomains.size,
    avgResponseTimeMs,
  }
}
```

#### 체크리스트
- [ ] domain-matcher.ts 생성 완료
- [ ] summary.ts 생성 완료

---

### Task 1.3.9: 메인 Edge Function 구현 (4개 LLM + 크로스 검증)

#### 작업 내용

**supabase/functions/analyze-query/index.ts**:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ✅ 4개 LLM 모듈 임포트
import { queryPerplexity } from './llm/perplexity.ts'
import { queryOpenAI } from './llm/openai.ts'
import { queryGemini } from './llm/gemini.ts'
import { queryClaude } from './llm/claude.ts'

import { processLLMResult } from './utils/domain-matcher.ts'
import { generateSummary } from './utils/summary.ts'
import { calculateCrossValidation } from './utils/cross-validation.ts'
import { analyzeCompetitors } from './utils/competitor-analysis.ts'
import type { AnalyzeRequest, AnalysisResult } from './llm/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 요청 파싱
    const body: AnalyzeRequest = await req.json()
    const { query, myDomain, myBrand, brandAliases, competitors } = body

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 분석 레코드 생성
    const { data: analysis, error: insertError } = await supabase
      .from('analyses')
      .insert({
        query_text: query,
        my_domain: myDomain || null,
        my_brand: myBrand || null,
        brand_aliases: brandAliases || null,
        status: 'processing',
        results: {},
      })
      .select()
      .single()
    
    if (insertError) {
      throw new Error(`Failed to create analysis: ${insertError.message}`)
    }
    
    const analysisId = analysis.id
    
    // ✅ 4개 LLM 병렬 호출
    console.log(`[${analysisId}] Starting 4 LLM queries for: ${query}`)

    const [perplexityRes, openaiRes, geminiRes, claudeRes] = await Promise.allSettled([
      queryPerplexity(query),
      queryOpenAI(query),
      queryGemini(query),
      queryClaude(query),
    ])

    // 결과 처리 헬퍼 함수
    const processResult = (
      response: PromiseSettledResult<any>,
      defaultModel: string
    ) => {
      if (response.status === 'fulfilled') {
        return processLLMResult(response.value, myDomain, myBrand, brandAliases)
      }
      return {
        success: false,
        answer: '',
        citations: [],
        myDomainCited: false,
        myDomainPositions: [],
        myDomainConfidence: [],
        brandMentioned: false,
        brandMentionContext: [],
        responseTimeMs: 0,
        model: defaultModel,
        error: response.reason?.message || 'Unknown error',
      }
    }

    // 4개 LLM 결과 정규화
    const results: AnalysisResult = {
      perplexity: processResult(perplexityRes, 'sonar-pro'),
      chatgpt: processResult(openaiRes, 'gpt-4o'),
      gemini: processResult(geminiRes, 'gemini-2.0-flash'),
      claude: processResult(claudeRes, 'claude-sonnet-4-20250514'),
    }

    // 요약 생성
    const summary = generateSummary(results)

    // ✅ 크로스 플랫폼 검증
    const crossValidation = calculateCrossValidation(results)

    // ✅ 경쟁사 분석 (옵션)
    const competitorAnalysis = competitors
      ? analyzeCompetitors(results, competitors)
      : []

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        results,
        summary,
        cross_validation: crossValidation,
        competitor_analysis: competitorAnalysis,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', analysisId)

    if (updateError) {
      console.error(`[${analysisId}] Failed to update:`, updateError)
    }

    console.log(`[${analysisId}] Completed. Summary:`, summary)

    return new Response(
      JSON.stringify({
        id: analysisId,
        status: 'completed',
        results,
        summary,
        crossValidation,
        competitorAnalysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
```

#### 체크리스트
- [ ] index.ts 생성 완료
- [ ] CORS 설정 완료
- [ ] 요청 검증 로직 구현
- [ ] ✅ 4개 LLM 병렬 호출 구현
- [ ] ✅ 크로스 플랫폼 검증 추가
- [ ] ✅ 경쟁사 분석 추가
- [ ] DB 저장 구현
- [ ] 에러 핸들링 구현

---

### Task 1.3.10: 배포 및 테스트

#### 작업 내용

```bash
# 로컬 테스트
supabase functions serve analyze-query --env-file supabase/functions/.env

# 다른 터미널에서 테스트
curl -X POST http://localhost:54321/functions/v1/analyze-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "암보험 추천해줘",
    "myDomain": "meritzfire.com",
    "myBrand": "메리츠화재",
    "brandAliases": ["메리츠", "Meritz"]
  }'

# 배포
supabase functions deploy analyze-query

# 배포된 함수 테스트
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/analyze-query \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "암보험 추천해줘",
    "myDomain": "meritzfire.com",
    "myBrand": "메리츠화재"
  }'
```

#### 체크리스트
- [ ] 로컬 테스트 성공
- [ ] 배포 성공
- [ ] 프로덕션 테스트 성공
- [ ] DB에 결과 저장 확인

---

## 4. 트러블슈팅

### 자주 발생하는 문제

| 문제 | 원인 | 해결 방법 |
|------|------|----------|
| `Deno.env.get undefined` | 환경변수 미설정 | 4개 API Key Secrets 등록 확인 |
| `CORS error` | corsHeaders 누락 | OPTIONS 핸들러 확인 |
| `timeout` | LLM 응답 지연 | Promise.allSettled 사용 (실패해도 계속) |
| `DB insert failed` | 권한 문제 | SERVICE_ROLE_KEY 사용 확인 |
| `annotations undefined` | OpenAI API 버전 | Responses API 사용 확인 |
| `groundingMetadata null` | Gemini 검색 미실행 | `google_search` 도구 설정 확인 |
| `web_search_tool_result empty` | Claude 검색 실패 | API Key 권한/모델 확인 |

### LLM별 에러 처리 전략

```typescript
// 개별 LLM 실패해도 나머지는 정상 반환
const [perplexityRes, openaiRes, geminiRes, claudeRes] =
  await Promise.allSettled([...])

// 실패한 LLM은 에러 정보와 함께 null이 아닌 에러 객체 반환
// → 프론트엔드에서 부분 결과 표시 가능
```

---

## 5. 신뢰도 등급 기준

| 등급 | 조건 | 신뢰도 |
|------|------|--------|
| **A** | 3개 이상 LLM에서 동일 도메인 인용 | 95%+ |
| **B** | 2개 LLM에서 동일 도메인 인용 | 80%+ |
| **C** | 1개 LLM에서 인용 + URL 검증 통과 | 60%+ |
| **D** | 1개 LLM에서 인용 + URL 검증 실패 | 30% 미만 |

---

## 6. 다음 단계

이 문서 완료 후 진행:
- **Phase1_04_Frontend.md**: 프론트엔드 UI 개발

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
| 2.0 | 2025-11-28 | **CORE_LLM_Citation_Methodology.md 반영** |
|     |            | - Claude API 추가 (4번째 LLM) |
|     |            | - OpenAI → Responses API + annotations 변경 |
|     |            | - Gemini → confidenceScores 추출 추가 |
|     |            | - Perplexity → search_results[] 사용 |
|     |            | - UnifiedCitation 통합 인용 스키마 적용 |
|     |            | - 크로스 플랫폼 검증 로직 추가 |
|     |            | - 경쟁사 분석 로직 추가 |
