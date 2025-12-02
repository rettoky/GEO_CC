# Implementation Plan: GEO Analyzer Core MVP

**Branch**: `001-core-mvp` | **Date**: 2025-12-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-core-mvp/spec.md`

## Summary

GEO Analyzer Core MVP는 4개 AI 검색 엔진(Perplexity, ChatGPT, Gemini, Claude)에서
사용자 쿼리에 대한 인용 현황을 실시간 분석하는 플랫폼입니다.

**핵심 기능**:
- 쿼리 입력 및 4개 LLM 병렬 분석
- UnifiedCitation 스키마로 인용 데이터 정규화
- 분석 결과 표시 및 이력 관리

**기술 접근**: 100% 서버리스 아키텍처 (Next.js + Supabase Edge Functions)

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 14 (App Router), Tailwind CSS 3.x, shadcn/ui, @supabase/supabase-js, @supabase/ssr
**Storage**: Supabase PostgreSQL (관리형, 서버리스)
**Backend**: Supabase Edge Functions (Deno) - **별도 백엔드 서버 없음**
**Testing**: Vitest (단위 테스트), Playwright (E2E)
**Target Platform**: Web (모던 브라우저), Vercel 배포
**Project Type**: Web application (서버리스 풀스택)
**Performance Goals**: 페이지 로딩 2초 이내, LLM 응답 60초 이내
**Constraints**: 4개 LLM 동시 호출, 부분 실패 허용 (Promise.allSettled)
**Scale/Scope**: 초기 100명 미만 동시 사용자, Phase 1 MVP

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: 4 LLM Parity ✅
- Perplexity, ChatGPT, Gemini, Claude 4개 LLM 동등 지원
- 각 LLM별 API 스펙에 맞는 인용 추출 구현
- UI에서 4개 LLM 결과를 동등하게 표시

### Principle II: UnifiedCitation Schema ✅
- 4개 LLM의 인용 데이터를 단일 스키마로 정규화
- LLM별 고유 필드 보존 (confidenceScores, publishedDate 등)

### Principle III: Real-time & Accurate Analysis ✅
- 실시간 LLM API 호출 (캐시 없음)
- 병렬 호출로 응답 시간 최적화

### Principle IV: User Data Isolation ⚠️
- Phase 1 MVP에서는 인증 미구현 (Phase 3 범위)
- RLS 정책은 Phase 3에서 적용 예정
- **정당화**: MVP 우선 출시 후 인증 추가

### Technical Constraints ✅
- Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui 사용
- Supabase Edge Functions (Deno) 사용 - 별도 백엔드 서버 없음
- API 키는 Supabase Secrets에만 저장
- .env.local은 .gitignore에 포함

### Quality Standards ✅
- TypeScript strict mode 활성화
- ESLint 설정 및 에러 0개 유지
- 컴포넌트 PascalCase, 훅 camelCase 명명 규칙

## Project Structure

### Documentation (this feature)

```text
specs/001-core-mvp/
├── plan.md              # 이 파일
├── spec.md              # 기능 명세서
├── research.md          # Phase 0 리서치 결과
├── data-model.md        # Phase 1 데이터 모델
├── quickstart.md        # Phase 1 빠른 시작 가이드
├── contracts/           # Phase 1 API 계약
│   └── edge-functions.md
└── checklists/
    └── requirements.md  # 명세서 품질 체크리스트
```

### Source Code (repository root)

```text
geo-analyzer/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 메인 페이지 (쿼리 입력)
│   ├── analysis/
│   │   ├── page.tsx              # 분석 이력 목록
│   │   └── [id]/page.tsx         # 분석 상세 페이지
│   └── api/                      # API Routes (필요시)
├── components/
│   ├── ui/                       # shadcn/ui 컴포넌트
│   ├── layout/
│   │   └── Header.tsx            # 헤더 네비게이션
│   └── analysis/
│       ├── QueryInput.tsx        # 쿼리 입력 폼
│       ├── LLMResultCard.tsx     # LLM 결과 카드 (4개)
│       └── AnalysisSummary.tsx   # 분석 요약
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 브라우저 클라이언트
│   │   ├── server.ts             # 서버 클라이언트
│   │   ├── types.ts              # DB 타입 정의
│   │   └── queries.ts            # 데이터 액세스 함수
│   └── utils/
│       └── domain-matcher.ts     # 도메인 매칭 유틸
├── hooks/
│   └── useAnalysis.ts            # 분석 훅
├── types/
│   └── index.ts                  # 공통 타입 정의
└── supabase/
    └── functions/
        └── analyze-query/        # Edge Function
            ├── index.ts          # 메인 함수
            └── llm/
                ├── types.ts      # LLM 공통 타입
                ├── perplexity.ts # Perplexity API
                ├── openai.ts     # OpenAI Responses API
                ├── gemini.ts     # Gemini API
                └── claude.ts     # Claude API
```

**Structure Decision**: 서버리스 풀스택 웹 애플리케이션. Next.js 14 App Router를 프론트엔드로, Supabase Edge Functions를 백엔드로 사용. 별도의 Express나 Node.js 서버 없이 완전한 서버리스 아키텍처.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Phase 1에서 RLS 미적용 | MVP 우선 출시 필요 | 인증 시스템 구현 시간이 MVP 출시를 지연시킴. Phase 3에서 반드시 적용 |
