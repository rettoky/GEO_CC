# API Contract: Edge Functions

**Date**: 2025-12-01
**Branch**: 001-core-mvp

## Overview

Supabase Edge Functions (Deno)를 사용한 서버리스 API 계약.
별도의 백엔드 서버 없이 Edge Function이 모든 비즈니스 로직을 처리.

---

## 1. analyze-query

4개 LLM에 쿼리를 전송하고 인용 데이터를 추출하는 핵심 함수.

### Endpoint

```
POST https://<project-ref>.supabase.co/functions/v1/analyze-query
```

### Request

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <anon-key>
```

**Body**:
```typescript
interface AnalyzeRequest {
  query: string           // 검색 쿼리 (필수)
  domain?: string         // 타겟 도메인
  brand?: string          // 브랜드명
  brandAliases?: string[] // 브랜드 별칭
  competitors?: Competitor[] // 경쟁사 목록 (Phase 2)
}

interface Competitor {
  name: string
  domain: string
}
```

**Example**:
```json
{
  "query": "한국에서 가장 좋은 커피 원두는?",
  "domain": "coffeebean.co.kr",
  "brand": "커피빈",
  "brandAliases": ["Coffee Bean", "커피 빈"]
}
```

### Response

**Success (200)**:
```typescript
interface AnalyzeResponse {
  id: string                    // Analysis UUID
  status: 'completed' | 'failed'
  results: {
    perplexity: LLMResult | null
    chatgpt: LLMResult | null
    gemini: LLMResult | null
    claude: LLMResult | null
  }
  summary: AnalysisSummary
  crossValidation: CrossValidation
  competitorAnalysis?: CompetitorAnalysis
  createdAt: string
  completedAt: string
}

interface LLMResult {
  success: boolean
  model: string
  answer: string
  citations: UnifiedCitation[]
  responseTime: number
  error?: string
}
```

**Error (400 - Bad Request)**:
```json
{
  "error": "Missing required field: query",
  "code": "VALIDATION_ERROR"
}
```

**Error (500 - Internal Server Error)**:
```json
{
  "error": "All LLM requests failed",
  "code": "ALL_LLM_FAILED",
  "details": {
    "perplexity": "API key invalid",
    "chatgpt": "Rate limit exceeded",
    "gemini": "Service unavailable",
    "claude": "Timeout"
  }
}
```

### Timeout

- 전체 함수 실행: 최대 120초
- 개별 LLM 호출: 최대 60초

### Rate Limiting

- Supabase 기본 제한 적용
- 추가 제한은 Phase 2에서 구현 예정

---

## 2. Internal LLM API Calls

Edge Function 내부에서 호출되는 LLM API 규격.

### 2.1 Perplexity API

```typescript
// POST https://api.perplexity.ai/chat/completions
interface PerplexityRequest {
  model: 'sonar-pro'
  messages: Array<{
    role: 'system' | 'user'
    content: string
  }>
  search_context_size: 'low' | 'medium' | 'high'
}

interface PerplexityResponse {
  choices: Array<{
    message: { content: string }
  }>
  search_results?: Array<{
    url: string
    title: string
    snippet: string
    date?: string
  }>
  citations?: string[]
}
```

### 2.2 OpenAI Responses API

```typescript
// POST https://api.openai.com/v1/responses
interface OpenAIRequest {
  model: 'gpt-4o'
  tools: Array<{ type: 'web_search_preview' }>
  input: string
}

interface OpenAIResponse {
  output: Array<{
    type: 'message'
    content: Array<{
      type: 'output_text'
      text: string
      annotations: Array<{
        type: 'url_citation'
        url: string
        title: string
        start_index: number
        end_index: number
      }>
    }>
  }>
}
```

### 2.3 Gemini API

```typescript
// POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
interface GeminiRequest {
  contents: Array<{
    role: 'user'
    parts: Array<{ text: string }>
  }>
  tools: Array<{ googleSearch: {} }>
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>
    }
    groundingMetadata?: {
      groundingChunks: Array<{
        web: { uri: string; title: string }
      }>
      groundingSupports: Array<{
        segment: { startIndex: number; endIndex: number; text: string }
        groundingChunkIndices: number[]
        confidenceScores: number[]
      }>
    }
  }>
}
```

### 2.4 Claude API

```typescript
// POST https://api.anthropic.com/v1/messages
interface ClaudeRequest {
  model: 'claude-sonnet-4-20250514'
  max_tokens: 4096
  tools: Array<{
    type: 'web_search_20250305'
    max_uses?: number
  }>
  messages: Array<{
    role: 'user'
    content: string
  }>
}

interface ClaudeResponse {
  content: Array<
    | { type: 'text'; text: string }
    | {
        type: 'web_search_tool_result'
        content: Array<{
          type: 'web_search_result'
          url: string
          title: string
          snippet: string
        }>
      }
  >
}
```

---

## 3. Supabase Client Operations

프론트엔드에서 Supabase 클라이언트를 통해 직접 호출하는 작업.

### 3.1 Create Analysis

```typescript
// Edge Function을 통해 자동 생성됨
// 직접 삽입은 권장하지 않음
```

### 3.2 Get Analysis by ID

```typescript
const { data, error } = await supabase
  .from('analyses')
  .select('*')
  .eq('id', analysisId)
  .single()
```

### 3.3 Get Analysis List

```typescript
const { data, error } = await supabase
  .from('analyses')
  .select('id, query_text, status, summary, created_at')
  .order('created_at', { ascending: false })
  .limit(20)
```

### 3.4 Delete Analysis

```typescript
const { error } = await supabase
  .from('analyses')
  .delete()
  .eq('id', analysisId)
```

---

## 4. Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 400 | 요청 데이터 검증 실패 |
| UNAUTHORIZED | 401 | 인증 실패 |
| NOT_FOUND | 404 | 리소스 없음 |
| ALL_LLM_FAILED | 500 | 모든 LLM 호출 실패 |
| PARTIAL_FAILURE | 200 | 일부 LLM 실패 (결과에 포함) |
| TIMEOUT | 504 | 시간 초과 |

---

## 5. CORS Configuration

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
```

---

## 6. Environment Variables (Secrets)

Edge Function에서 사용하는 환경 변수 (Supabase Secrets에 저장):

| Variable | Description |
|----------|-------------|
| PERPLEXITY_API_KEY | Perplexity API 키 |
| OPENAI_API_KEY | OpenAI API 키 |
| GOOGLE_AI_API_KEY | Google AI API 키 |
| ANTHROPIC_API_KEY | Anthropic API 키 |
| SUPABASE_URL | Supabase 프로젝트 URL |
| SUPABASE_SERVICE_ROLE_KEY | 서비스 롤 키 (DB 쓰기용) |
