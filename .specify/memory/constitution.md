<!--
=============================================================================
SYNC IMPACT REPORT
=============================================================================
Version Change: (new) 1.0.0
Source Document: docs/speckit.constitution.md

Added Sections:
- Core Principles (4 principles)
- Technical Constraints
- API Contract
- Quality Standards
- Data Integrity
- Behavioral Rules
- Development Phases
- Non-Negotiables
- Governance

Templates Requiring Updates:
- .specify/templates/plan-template.md: ✅ No updates needed (generic template)
- .specify/templates/spec-template.md: ✅ No updates needed (generic template)
- .specify/templates/tasks-template.md: ✅ No updates needed (generic template)
- .specify/templates/commands/*.md: ✅ No command files found

Follow-up TODOs: None
=============================================================================
-->

# GEO Analyzer Constitution

## Core Principles

### I. 4 LLM Parity (4개 LLM 동등 지원)

- Perplexity, ChatGPT, Gemini, Claude 4개 LLM을 동등하게 지원
- 특정 LLM에 편향되지 않는 공정한 분석 제공
- 각 LLM의 고유한 인용 방식(API 스펙)을 정확하게 반영

**Rationale**: 사용자가 여러 AI 검색 엔진의 인용 현황을 비교 분석할 때, 모든 플랫폼이 동등하게 취급되어야 신뢰할 수 있는 결과를 얻을 수 있음.

### II. UnifiedCitation Schema (통합 인용 스키마)

- 4개 LLM의 서로 다른 인용 데이터 형식을 단일 스키마로 정규화
- mentionCount, avgConfidence, textSpans 등 공통 필드 유지
- LLM별 고유 필드(Gemini confidenceScores, Perplexity publishedDate 등) 보존

**Rationale**: 일관된 데이터 구조를 통해 크로스 플랫폼 비교 분석과 집계가 가능해지며, 코드 복잡성을 줄이고 유지보수성을 높임.

### III. Real-time & Accurate Analysis

- 실제 LLM API 호출을 통한 실시간 분석
- 크로스 플랫폼 검증으로 인용 신뢰도 확보
- 경쟁사 비교 분석으로 상대적 위치 파악

**Rationale**: 캐시되거나 추정된 데이터가 아닌 실시간 데이터를 기반으로 해야 사용자가 현재 상태를 정확하게 파악하고 최적화 전략을 수립할 수 있음.

### IV. User Data Isolation

- RLS(Row Level Security)를 통한 사용자별 데이터 완전 분리
- user_id 기반 프로젝트, 쿼리, 분석 결과 접근 제어

**Rationale**: 보안과 프라이버시는 필수 요구사항이며, 사용자 데이터가 다른 사용자에게 노출되어서는 안 됨.

## Technical Constraints

### Must Use (필수 기술 스택)

| Category | Technology |
|----------|------------|
| Frontend | Next.js 14 (App Router), TypeScript 5.x, Tailwind CSS 3.x, shadcn/ui |
| Backend | Supabase Edge Functions (Deno), Supabase PostgreSQL |
| Deployment | Vercel |
| LLM APIs | Perplexity (sonar-pro), OpenAI (gpt-4o Responses API), Google Gemini (gemini-2.0-flash), Anthropic Claude (claude-sonnet-4) |

### Must Not (금지 사항)

- 환경 변수(.env.local, API 키)를 절대 커밋하지 않음
- API 키는 Supabase Secrets에만 저장
- 사용자 데이터를 암호화 없이 저장하지 않음
- 정규식 파싱 대신 API 공식 응답 구조 사용

## API Contract

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

| Grade | Condition | Reliability |
|-------|-----------|-------------|
| A | 3개+ LLM에서 동일 도메인 인용 | 95%+ 신뢰도 |
| B | 2개 LLM에서 동일 도메인 인용 | 80%+ 신뢰도 |
| C | 1개 LLM에서 인용 + URL 검증 통과 | 60%+ 신뢰도 |
| D | 1개 LLM에서 인용 + URL 검증 실패 | 30% 미만 |

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

## Development Phases

| Phase | Scope | Priority |
|-------|-------|----------|
| Phase 1 | Core MVP - 쿼리 분석, 4개 LLM 인용 추출, 결과 표시 | Critical |
| Phase 2 | 프로젝트 관리, 대시보드, 경쟁사 비교 | High |
| Phase 3 | 페이지 분석, 인증, 리포트 생성 | Medium |

## Non-Negotiables

1. **4개 LLM 동시 지원**: Claude 포함 4개 LLM 누락 불가
2. **UnifiedCitation 스키마**: 모든 인용 데이터는 통합 스키마로 정규화
3. **크로스 플랫폼 검증**: 복수 LLM 인용 시 신뢰도 상향
4. **RLS 보안**: 사용자별 데이터 격리 필수
5. **타입 안전성**: TypeScript strict mode 유지

## Governance

### Amendment Procedure

1. 헌법 변경 제안 시 변경 사유와 영향 범위를 명시해야 함
2. 변경 사항은 문서화되어야 하며, 마이그레이션 계획이 필요한 경우 포함되어야 함
3. Non-Negotiables 항목 변경 시 반드시 팀 전체 동의 필요

### Versioning Policy

- **MAJOR**: 핵심 원칙 제거/재정의, 이전 버전과 호환되지 않는 변경
- **MINOR**: 새 원칙/섹션 추가, 기존 지침의 실질적 확장
- **PATCH**: 명확화, 문구 수정, 오타 수정, 비의미론적 개선

### Compliance Review

- 모든 PR/리뷰에서 헌법 준수 여부 확인 필수
- 복잡성 추가 시 반드시 정당화 필요
- 런타임 개발 가이던스는 별도 문서 참조

**Version**: 1.0.0 | **Ratified**: 2025-12-01 | **Last Amended**: 2025-12-01
