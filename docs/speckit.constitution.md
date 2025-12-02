# GEO Analyzer Constitution

## Project Identity

**Name**: GEO Analyzer
**Version**: 3.0
**Purpose**: AI 검색 엔진(Perplexity, ChatGPT, Gemini, Claude)에서 콘텐츠 인용 현황을 분석하고 최적화 방안을 제안하는 플랫폼

---

## Core Principles

### 1. 4 LLM Parity (4개 LLM 동등 지원)
- Perplexity, ChatGPT, Gemini, Claude 4개 LLM을 동등하게 지원
- 특정 LLM에 편향되지 않는 공정한 분석 제공
- 각 LLM의 고유한 인용 방식(API 스펙)을 정확하게 반영

### 2. UnifiedCitation Schema (통합 인용 스키마)
- 4개 LLM의 서로 다른 인용 데이터 형식을 단일 스키마로 정규화
- mentionCount, avgConfidence, textSpans 등 공통 필드 유지
- LLM별 고유 필드(Gemini confidenceScores, Perplexity publishedDate 등) 보존

### 3. Real-time & Accurate Analysis
- 실제 LLM API 호출을 통한 실시간 분석
- 크로스 플랫폼 검증으로 인용 신뢰도 확보
- 경쟁사 비교 분석으로 상대적 위치 파악

### 4. User Data Isolation
- RLS(Row Level Security)를 통한 사용자별 데이터 완전 분리
- user_id 기반 프로젝트, 쿼리, 분석 결과 접근 제어

---

## Technical Constraints

### Must Use (필수 기술 스택)
- **Frontend**: Next.js 14 (App Router), TypeScript 5.x, Tailwind CSS 3.x, shadcn/ui
- **Backend**: Supabase Edge Functions (Deno), Supabase PostgreSQL
- **Deployment**: Vercel
- **LLM APIs**:
  - Perplexity (sonar-pro, search_results[])
  - OpenAI (gpt-4o, Responses API, annotations[])
  - Google Gemini (gemini-2.0-flash, groundingMetadata, confidenceScores[])
  - Anthropic Claude (claude-sonnet-4, web_search_20250305)

### Must Not (금지 사항)
- 환경 변수(.env.local, API 키)를 절대 커밋하지 않음
- API 키는 Supabase Secrets에만 저장
- 사용자 데이터를 암호화 없이 저장하지 않음
- 정규식 파싱 대신 API 공식 응답 구조 사용

---

## API Contract (LLM별 인용 추출 방식)

### Perplexity API
- **Model**: sonar-pro
- **Citation Source**: search_results[] (권장), citations[] (fallback)
- **Settings**: search_context_size: 'high'
- **Unique Fields**: date (발행일), snippet (발췌문)

### OpenAI Responses API
- **Model**: gpt-4o
- **Endpoint**: /v1/responses
- **Citation Source**: annotations[] (url_citation)
- **Tool**: web_search_preview
- **Unique Fields**: start_index, end_index (텍스트 위치)

### Gemini API
- **Model**: gemini-2.0-flash
- **Citation Source**: groundingMetadata
- **Tool**: google_search
- **Unique Fields**: confidenceScores[] (신뢰도 점수 - 유일하게 제공)

### Claude API
- **Model**: claude-sonnet-4-20250514
- **Citation Source**: web_search_tool_result
- **Tool**: web_search_20250305
- **Options**: allowed_domains, blocked_domains, max_uses

---

## Quality Standards

### Code Quality
- TypeScript strict mode 사용
- ESLint 에러 0개 유지
- npm run build 성공 필수
- 컴포넌트: PascalCase (예: QueryInput.tsx)
- 훅: camelCase with use prefix (예: useAnalysis.ts)
- 타입: PascalCase (예: Analysis, LLMResult)

### Performance
- LLM 응답 시간: 개별 최대 60초
- 병렬 호출: Promise.allSettled 사용 (부분 실패 허용)
- 페이지 로딩: 2초 이내

### Security
- Supabase Auth 사용 (이메일/비밀번호, Google OAuth)
- RLS 정책 필수 적용
- HTTPS 필수
- XSS, SQL Injection 방지

---

## Data Integrity

### UnifiedCitation 스키마 필드
```typescript
interface UnifiedCitation {
  id: string                    // UUID
  source: LLMType               // 'perplexity' | 'chatgpt' | 'gemini' | 'claude'
  position: number              // 인용 순서 (1부터)
  url: string
  cleanUrl: string              // 쿼리 파라미터 제거
  domain: string
  title: string | null
  snippet: string | null
  publishedDate: string | null  // Perplexity만 제공
  mentionCount: number
  avgConfidence: number | null  // Gemini만 제공
  confidenceScores: number[]
  textSpans: TextSpan[]
}
```

### 크로스 플랫폼 검증 등급
- **A**: 3개+ LLM에서 동일 도메인 인용 → 95%+ 신뢰도
- **B**: 2개 LLM에서 동일 도메인 인용 → 80%+ 신뢰도
- **C**: 1개 LLM에서 인용 + URL 검증 통과 → 60%+ 신뢰도
- **D**: 1개 LLM에서 인용 + URL 검증 실패 → 30% 미만

---

## Behavioral Rules

### Error Handling
- 개별 LLM 실패 시 나머지 결과 정상 반환 (Promise.allSettled)
- 에러 메시지는 사용자 친화적으로 표시
- 실패 로그는 Supabase에 저장

### Rate Limiting
- LLM API 호출 간 적절한 간격 유지
- 동일 쿼리 중복 요청 방지

### Data Retention
- 분석 결과는 무기한 보존 (사용자 삭제 시 제외)
- user_id IS NULL인 레거시 데이터 접근 허용

---

## Development Phases

| Phase | 범위 | 우선순위 |
|-------|------|----------|
| Phase 1 | Core MVP - 쿼리 분석, 4개 LLM 인용 추출, 결과 표시 | Critical |
| Phase 2 | 프로젝트 관리, 대시보드, 경쟁사 비교 | High |
| Phase 3 | 페이지 분석, 인증, 리포트 생성 | Medium |

---

## Non-Negotiables

1. **4개 LLM 동시 지원**: Claude 포함 4개 LLM 누락 불가
2. **UnifiedCitation 스키마**: 모든 인용 데이터는 통합 스키마로 정규화
3. **크로스 플랫폼 검증**: 복수 LLM 인용 시 신뢰도 상향
4. **RLS 보안**: 사용자별 데이터 격리 필수
5. **타입 안전성**: TypeScript strict mode 유지
