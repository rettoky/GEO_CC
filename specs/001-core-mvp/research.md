# Research: GEO Analyzer Core MVP

**Date**: 2025-12-01
**Branch**: 001-core-mvp

## 1. 서버리스 아키텍처 결정

### Decision
Supabase Edge Functions (Deno)를 백엔드로 사용하여 100% 서버리스 아키텍처 구현

### Rationale
- **별도 백엔드 서버 불필요**: Express, Fastify 등의 Node.js 서버 운영 비용 제거
- **자동 스케일링**: 요청에 따라 자동으로 확장/축소
- **콜드 스타트 최소화**: Deno 기반으로 빠른 시작 시간
- **통합 환경**: Supabase PostgreSQL과 동일 플랫폼에서 운영

### Alternatives Considered
| 대안 | 장점 | 기각 사유 |
|------|------|----------|
| Next.js API Routes만 사용 | 프로젝트 단순화 | Vercel 함수 제한 시간(10초)이 LLM 호출(최대 60초)에 부적합 |
| AWS Lambda + API Gateway | 성숙한 생태계 | 별도 인프라 관리 필요, Supabase와 통합 복잡 |
| Express 서버 | 유연성 | 서버 관리 필요, 비용 발생 |

---

## 2. 4개 LLM API 인용 추출 방식

### 2.1 Perplexity API

**Decision**: `search_results[]` 우선 사용, `citations[]`는 fallback

**API 스펙**:
```typescript
// 요청
{
  model: "sonar-pro",
  messages: [...],
  search_context_size: "high"
}

// 응답
{
  choices: [{ message: { content: "..." } }],
  search_results: [
    { url: string, title: string, snippet: string, date?: string }
  ],
  citations: [string] // URL 배열 (fallback)
}
```

**고유 필드**: `publishedDate`, `snippet`

### 2.2 OpenAI Responses API

**Decision**: `/v1/responses` 엔드포인트의 `annotations[]` 사용

**API 스펙**:
```typescript
// 요청
POST /v1/responses
{
  model: "gpt-4o",
  tools: [{ type: "web_search_preview" }],
  input: "..."
}

// 응답
{
  output: [
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: "...",
          annotations: [
            { type: "url_citation", url: string, title: string, start_index: number, end_index: number }
          ]
        }
      ]
    }
  ]
}
```

**고유 필드**: `start_index`, `end_index` (textSpans)

### 2.3 Gemini API

**Decision**: `groundingMetadata`에서 인용 추출, `groundingSupports`에서 신뢰도 점수 추출

**API 스펙**:
```typescript
// 요청
{
  model: "gemini-2.0-flash",
  contents: [...],
  tools: [{ googleSearch: {} }]
}

// 응답
{
  candidates: [{
    content: { parts: [...] },
    groundingMetadata: {
      groundingChunks: [
        { web: { uri: string, title: string } }
      ],
      groundingSupports: [
        { segment: {...}, groundingChunkIndices: number[], confidenceScores: number[] }
      ]
    }
  }]
}
```

**고유 필드**: `confidenceScores[]` (4개 LLM 중 유일하게 신뢰도 점수 제공)

### 2.4 Claude API

**Decision**: `web_search_20250305` 도구 사용, `web_search_tool_result`에서 인용 추출

**API 스펙**:
```typescript
// 요청
{
  model: "claude-sonnet-4-20250514",
  tools: [{
    type: "web_search_20250305",
    max_uses: 5
  }],
  messages: [...]
}

// 응답
{
  content: [
    { type: "tool_use", name: "web_search_20250305", input: {...} },
    {
      type: "web_search_tool_result",
      content: [
        { type: "web_search_result", url: string, title: string, snippet: string }
      ]
    },
    { type: "text", text: "..." }
  ]
}
```

**고유 옵션**: `allowed_domains`, `blocked_domains`, `max_uses`

---

## 3. UnifiedCitation 스키마 설계

### Decision
4개 LLM의 서로 다른 인용 형식을 단일 스키마로 정규화

```typescript
interface TextSpan {
  start: number
  end: number
  text: string
  confidence?: number
}

interface UnifiedCitation {
  id: string                    // UUID (클라이언트 생성)
  source: LLMType               // 'perplexity' | 'chatgpt' | 'gemini' | 'claude'
  position: number              // 인용 순서 (1부터)
  url: string                   // 원본 URL
  cleanUrl: string              // 쿼리 파라미터 제거된 URL
  domain: string                // 도메인만 추출 (www 제거)
  title: string | null          // 페이지 제목
  snippet: string | null        // 발췌문 (Perplexity, Claude)
  publishedDate: string | null  // 발행일 (Perplexity만)
  mentionCount: number          // 답변에서 언급 횟수
  avgConfidence: number | null  // 평균 신뢰도 (Gemini만)
  confidenceScores: number[]    // 개별 신뢰도 (Gemini만)
  textSpans: TextSpan[]         // 텍스트 위치 (OpenAI만)
}
```

### Rationale
- **공통 필드 유지**: 모든 LLM에서 추출 가능한 필드
- **고유 필드 보존**: LLM별 특수 정보 손실 방지
- **확장성**: 새 LLM 추가 시 스키마 변경 최소화

---

## 4. 병렬 호출 및 에러 처리 전략

### Decision
`Promise.allSettled` 사용으로 부분 실패 허용

```typescript
const results = await Promise.allSettled([
  callPerplexity(query),
  callOpenAI(query),
  callGemini(query),
  callClaude(query)
])

// 성공한 결과만 처리, 실패한 LLM은 에러 메시지 포함
```

### Rationale
- **부분 성공**: 1~3개 LLM 실패해도 나머지 결과 제공
- **사용자 경험**: 일부 실패 시에도 분석 결과 확인 가능
- **에러 투명성**: 실패한 LLM과 에러 사유 표시

---

## 5. 데이터베이스 설계 결정

### Decision
`analyses` 단일 테이블에 JSONB로 결과 저장

### Rationale
- **단순성**: Phase 1 MVP에서는 복잡한 정규화 불필요
- **유연성**: LLM별 다른 응답 구조를 JSONB로 수용
- **확장성**: Phase 2에서 `projects`, `queries` 테이블 추가 시 FK 연결

---

## 6. 프론트엔드 상태 관리

### Decision
React Query 대신 Supabase 클라이언트 직접 사용 + useState

### Rationale
- **의존성 최소화**: 추가 라이브러리 없이 Supabase SDK만 사용
- **단순성**: MVP 규모에서 React Query 오버헤드 불필요
- **Phase 2 확장**: 필요 시 TanStack Query 추가 가능

---

## 7. LLM 색상 코드

### Decision
4개 LLM별 고유 색상 지정

| LLM | Color | Hex |
|-----|-------|-----|
| Perplexity | Amber | #f59e0b |
| ChatGPT | Emerald | #10b981 |
| Gemini | Indigo | #6366f1 |
| Claude | Pink | #ec4899 |

### Rationale
- 각 브랜드 아이덴티티와 유사한 색상
- 차트/카드에서 시각적 구분 용이

---

## 8. 미결정 사항 (Phase 2/3으로 이관)

| 항목 | Phase | 이유 |
|------|-------|------|
| 사용자 인증 | Phase 3 | MVP 우선 |
| RLS 정책 | Phase 3 | 인증 필요 |
| 프로젝트/경쟁사 관리 | Phase 2 | Core 기능 후 |
| 대시보드/차트 | Phase 2 | Core 기능 후 |
| 리포트 생성 | Phase 3 | 고급 기능 |
