# Tasks: GEO Analyzer Core MVP

**Input**: Design documents from `/specs/001-core-mvp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/edge-functions.md

**Tests**: 테스트 작업은 명시적 요청 시에만 포함됨 (현재 미포함)

**Organization**: User Story 단위로 그룹화하여 독립적 구현 및 테스트 가능

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 해당 User Story (US1, US2, US3)
- 모든 작업에 정확한 파일 경로 포함

## Path Conventions

- **Frontend**: `app/`, `components/`, `lib/`, `hooks/`, `types/`
- **Backend (Edge Function)**: `supabase/functions/analyze-query/`
- **Database**: Supabase Dashboard SQL Editor

---

## Phase 1: Setup (프로젝트 초기화)

**Purpose**: Next.js 프로젝트 생성 및 기본 설정

- [x] T001 Next.js 14 프로젝트 생성 (npx create-next-app@latest geo-analyzer --typescript --tailwind --eslint --app --src-dir=false)
- [ ] T002 프로젝트 의존성 설치 (@supabase/supabase-js, @supabase/ssr, lucide-react, clsx, tailwind-merge, zod, date-fns)
- [ ] T003 [P] shadcn/ui 초기화 및 기본 컴포넌트 설치 (button, input, card, badge, skeleton, toast)
- [ ] T004 [P] TypeScript strict mode 및 ESLint 설정 확인 in tsconfig.json
- [ ] T005 [P] .env.local 파일 생성 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] T006 [P] .gitignore에 .env.local 추가 확인

---

## Phase 2: Foundational (공통 인프라)

**Purpose**: 모든 User Story가 의존하는 핵심 인프라

**⚠️ CRITICAL**: 이 Phase 완료 전까지 User Story 작업 불가

### Database Setup

- [ ] T007 Supabase 프로젝트 생성 및 리전 설정 (ap-northeast-2)
- [ ] T008 analyses 테이블 생성 (SQL from data-model.md) in Supabase Dashboard
- [ ] T009 인덱스 및 트리거 생성 (idx_analyses_created_at, idx_analyses_status, update_updated_at_column)

### Supabase Client Setup

- [ ] T010 [P] Supabase 브라우저 클라이언트 생성 in lib/supabase/client.ts
- [ ] T011 [P] Supabase 서버 클라이언트 생성 in lib/supabase/server.ts
- [ ] T012 [P] DB 타입 정의 (Database, Tables, Analysis) in lib/supabase/types.ts

### Type Definitions

- [ ] T013 [P] 공통 타입 정의 (LLMType, UnifiedCitation, TextSpan) in types/index.ts
- [ ] T014 [P] LLMResult, AnalysisResults, AnalysisSummary 타입 정의 in types/index.ts
- [ ] T015 [P] CrossValidation, AnalyzeRequest, AnalyzeResponse 타입 정의 in types/index.ts

### Edge Function Setup

- [ ] T016 Supabase CLI 설치 및 프로젝트 연결 (supabase init, supabase link)
- [ ] T017 [P] API 키를 Supabase Secrets에 등록 (PERPLEXITY_API_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY, ANTHROPIC_API_KEY)
- [ ] T018 analyze-query Edge Function 생성 (supabase functions new analyze-query)
- [ ] T019 [P] Edge Function 공통 타입 정의 in supabase/functions/analyze-query/llm/types.ts
- [ ] T020 [P] CORS 헤더 설정 in supabase/functions/analyze-query/index.ts

### Layout & Navigation

- [ ] T021 [P] 루트 레이아웃 설정 (폰트, 메타데이터) in app/layout.tsx
- [ ] T022 [P] 헤더 네비게이션 컴포넌트 생성 in components/layout/Header.tsx
- [ ] T023 [P] 도메인 매칭 유틸리티 함수 생성 in lib/utils/domain-matcher.ts

**Checkpoint**: Foundation ready - User Story 구현 시작 가능

---

## Phase 3: User Story 1 - 쿼리 분석 및 인용 결과 확인 (Priority: P1) 🎯 MVP

**Goal**: 4개 LLM에 쿼리를 전송하고 인용 데이터를 추출하여 결과 표시

**Independent Test**: 쿼리 입력 후 4개 LLM 분석 결과 카드와 요약 정보 확인

### Edge Function - LLM API 통합

- [ ] T024 [P] [US1] Perplexity API 호출 함수 구현 in supabase/functions/analyze-query/llm/perplexity.ts
- [ ] T025 [P] [US1] OpenAI Responses API 호출 함수 구현 in supabase/functions/analyze-query/llm/openai.ts
- [ ] T026 [P] [US1] Gemini API 호출 함수 구현 in supabase/functions/analyze-query/llm/gemini.ts
- [ ] T027 [P] [US1] Claude API 호출 함수 구현 in supabase/functions/analyze-query/llm/claude.ts
- [ ] T028 [US1] 4개 LLM 병렬 호출 및 Promise.allSettled 처리 in supabase/functions/analyze-query/index.ts
- [ ] T029 [US1] UnifiedCitation 정규화 함수 구현 (4개 LLM별 변환) in supabase/functions/analyze-query/index.ts
- [ ] T030 [US1] AnalysisSummary 생성 함수 구현 in supabase/functions/analyze-query/index.ts
- [ ] T031 [US1] 분석 결과 DB 저장 로직 구현 in supabase/functions/analyze-query/index.ts
- [ ] T032 [US1] Edge Function 배포 (supabase functions deploy analyze-query)

### Frontend - 쿼리 입력 UI

- [ ] T033 [P] [US1] 쿼리 입력 폼 컴포넌트 생성 (query, domain, brand 입력) in components/analysis/QueryInput.tsx
- [ ] T034 [P] [US1] 입력 유효성 검증 (Zod 스키마) in components/analysis/QueryInput.tsx
- [ ] T035 [P] [US1] 로딩 상태 스켈레톤 컴포넌트 생성 in components/analysis/LoadingSkeleton.tsx

### Frontend - 결과 표시 UI

- [ ] T036 [P] [US1] LLM 결과 카드 컴포넌트 생성 (모델명, 응답시간, 인용수, 답변) in components/analysis/LLMResultCard.tsx
- [ ] T037 [P] [US1] 인용 목록 컴포넌트 생성 (URL, 도메인, 제목, 발췌문) in components/analysis/CitationList.tsx
- [ ] T038 [P] [US1] 분석 요약 컴포넌트 생성 (전체 인용률, 브랜드 멘션율) in components/analysis/AnalysisSummary.tsx
- [ ] T039 [P] [US1] 에러 메시지 컴포넌트 생성 in components/analysis/ErrorMessage.tsx

### Frontend - 메인 페이지 통합

- [ ] T040 [US1] 분석 요청 훅 생성 (Edge Function 호출) in hooks/useAnalysis.ts
- [ ] T041 [US1] 메인 페이지 구현 (쿼리 입력 → 분석 → 결과 표시) in app/page.tsx
- [ ] T042 [US1] 부분 실패 처리 UI (성공 LLM 결과 표시, 실패 LLM 에러 표시)
- [ ] T043 [US1] 타겟 도메인 인용 시 강조 표시 로직 추가

**Checkpoint**: User Story 1 완료 - MVP 검증 가능

---

## Phase 4: User Story 2 - 분석 결과 상세 확인 (Priority: P2)

**Goal**: 분석 상세 페이지에서 각 LLM별 전체 인용 목록과 메타데이터 확인

**Independent Test**: 분석 상세 페이지에서 4개 LLM 탭 전환 및 상세 인용 정보 확인

### Data Access

- [ ] T044 [P] [US2] 분석 조회 함수 생성 (getAnalysisById) in lib/supabase/queries.ts

### Frontend - 상세 페이지 UI

- [ ] T045 [P] [US2] LLM 탭 네비게이션 컴포넌트 생성 in components/analysis/LLMTabs.tsx
- [ ] T046 [P] [US2] 상세 인용 카드 컴포넌트 생성 (URL, 도메인, 제목, 발췌문, 신뢰도) in components/analysis/CitationDetailCard.tsx
- [ ] T047 [P] [US2] Gemini 신뢰도 점수 뱃지 컴포넌트 생성 in components/analysis/ConfidenceBadge.tsx
- [ ] T048 [P] [US2] 답변 전문 표시 컴포넌트 생성 in components/analysis/AnswerView.tsx

### Frontend - 상세 페이지 통합

- [ ] T049 [US2] 분석 상세 페이지 구현 in app/analysis/[id]/page.tsx
- [ ] T050 [US2] 타겟 도메인 인용 강조 표시 in app/analysis/[id]/page.tsx
- [ ] T051 [US2] 메인 페이지에서 상세 페이지로 네비게이션 연결

**Checkpoint**: User Story 2 완료 - 상세 확인 기능 검증 가능

---

## Phase 5: User Story 3 - 분석 이력 관리 (Priority: P3)

**Goal**: 분석 이력 페이지에서 과거 분석 목록 조회 및 상세 페이지 이동

**Independent Test**: 분석 이력 페이지에서 과거 분석 목록 확인 및 클릭하여 상세 이동

### Data Access

- [ ] T052 [P] [US3] 분석 목록 조회 함수 생성 (getAnalysisList) in lib/supabase/queries.ts
- [ ] T053 [P] [US3] 분석 삭제 함수 생성 (deleteAnalysis) in lib/supabase/queries.ts

### Frontend - 이력 페이지 UI

- [ ] T054 [P] [US3] 분석 목록 아이템 컴포넌트 생성 in components/analysis/AnalysisListItem.tsx
- [ ] T055 [P] [US3] 빈 상태 컴포넌트 생성 in components/analysis/EmptyState.tsx
- [ ] T056 [P] [US3] 무한 스크롤 로직 구현 in hooks/useInfiniteAnalyses.ts

### Frontend - 이력 페이지 통합

- [ ] T057 [US3] 분석 이력 페이지 구현 in app/analysis/page.tsx
- [ ] T058 [US3] 분석 목록에서 상세 페이지로 네비게이션 연결
- [ ] T059 [US3] 분석 삭제 기능 구현 (선택적)

**Checkpoint**: User Story 3 완료 - 이력 관리 기능 검증 가능

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 전체 기능 개선 및 마무리

- [ ] T060 [P] 반응형 UI 적용 (모바일/태블릿/데스크톱)
- [ ] T061 [P] 다크 모드 지원 (선택적)
- [ ] T062 [P] 로딩 상태 및 에러 처리 일관성 확인
- [ ] T063 에러 로그 저장 로직 검증
- [ ] T064 quickstart.md 기반 전체 플로우 수동 테스트
- [ ] T065 npm run build 성공 확인
- [ ] T066 Vercel 배포 및 환경 변수 설정

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존성 없음 - 즉시 시작 가능
- **Phase 2 (Foundational)**: Phase 1 완료 필요 - **모든 User Story 블로킹**
- **Phase 3 (US1)**: Phase 2 완료 필요 - MVP
- **Phase 4 (US2)**: Phase 2 완료 필요 - US1과 독립적으로 개발 가능
- **Phase 5 (US3)**: Phase 2 완료 필요 - US1, US2와 독립적으로 개발 가능
- **Phase 6 (Polish)**: 모든 User Story 완료 후

### User Story Dependencies

- **User Story 1 (P1)**: Phase 2 완료 후 시작 - 다른 Story 의존 없음
- **User Story 2 (P2)**: Phase 2 완료 후 시작 - US1의 분석 결과 필요하지만 독립 개발 가능
- **User Story 3 (P3)**: Phase 2 완료 후 시작 - US1의 분석 결과 필요하지만 독립 개발 가능

### Within Each User Story

1. Edge Function (백엔드) → 프론트엔드 컴포넌트 → 페이지 통합
2. 데이터 모델 → 서비스 → UI
3. 병렬 작업([P]) 먼저 실행 → 순차 작업 실행

### Parallel Opportunities

```text
Phase 2에서 병렬 실행 가능:
- T010, T011, T012 (Supabase 클라이언트)
- T013, T014, T015 (타입 정의)
- T019, T020, T21, T22, T23 (Edge Function 설정, 레이아웃)

Phase 3 (US1)에서 병렬 실행 가능:
- T024, T025, T026, T027 (4개 LLM API 함수)
- T033, T034, T035 (쿼리 입력 UI)
- T036, T037, T038, T039 (결과 표시 UI)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료 **(CRITICAL)**
3. Phase 3: User Story 1 완료
4. **STOP and VALIDATE**: 쿼리 분석 및 결과 표시 테스트
5. 배포/데모 준비 완료

### Incremental Delivery

1. Setup + Foundational → 기반 완료
2. User Story 1 → 테스트 → 배포/데모 **(MVP!)**
3. User Story 2 → 테스트 → 배포/데모
4. User Story 3 → 테스트 → 배포/데모
5. 각 Story가 이전 Story를 손상시키지 않고 가치 추가

### Parallel Team Strategy

팀 개발 시:

1. 팀 전체가 Setup + Foundational 완료
2. Foundational 완료 후:
   - 개발자 A: User Story 1 (Edge Function 중심)
   - 개발자 B: User Story 2 (상세 페이지 UI)
   - 개발자 C: User Story 3 (이력 페이지 UI)
3. 각 Story 독립적으로 완료 및 통합

---

## Notes

- [P] 작업 = 다른 파일, 의존성 없음
- [Story] 라벨로 추적성 확보
- 각 User Story는 독립적으로 완료 및 테스트 가능
- 작업 또는 논리적 그룹 완료 후 커밋
- 체크포인트에서 Story 독립 검증 가능
- 피해야 할 것: 모호한 작업, 동일 파일 충돌, Story 간 의존성
