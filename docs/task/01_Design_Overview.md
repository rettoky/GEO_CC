# GEO Analyzer 설계서
## 00. 설계 개요 및 아키텍처

---

## 문서 정보
| 항목 | 내용 |
|------|------|
| 프로젝트명 | GEO Analyzer |
| 버전 | 3.0 |
| 기술 스택 | Next.js 14 + Tailwind CSS + Supabase + Vercel |
| LLM 엔진 | **4개: Perplexity, ChatGPT, Gemini, Claude** |
| 작성일 | 2025-11-27 |
| 최종 수정 | 2025-11-28 |

---

## 1. 시스템 아키텍처

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Vercel                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 14 (App Router)                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │   Pages     │  │ API Routes  │  │  Components │              │   │
│  │  │  (React)    │  │ /api/*      │  │  (shadcn)   │              │   │
│  │  └─────────────┘  └──────┬──────┘  └─────────────┘              │   │
│  └──────────────────────────┼──────────────────────────────────────┘   │
│                             │                                           │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Supabase                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  PostgreSQL │  │    Edge     │  │   Storage   │  │    Auth     │   │
│  │  Database   │  │  Functions  │  │   (Files)   │  │  (Phase 3)  │   │
│  └─────────────┘  └──────┬──────┘  └─────────────┘  └─────────────┘   │
│                          │                                              │
└──────────────────────────┼──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        External APIs (4개 LLM)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │ Perplexity│  │  OpenAI   │  │  Google   │  │ Anthropic │           │
│  │ sonar-pro │  │  gpt-4o   │  │  Gemini   │  │  Claude   │           │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 데이터 흐름 (4개 LLM 병렬 호출)

```
[사용자 쿼리 입력]
       │
       ▼
[Next.js Frontend] ──────────────────────────────────────┐
       │                                                  │
       │ POST /api/analyze                               │
       ▼                                                  │
[Supabase Edge Function: analyze-query]                   │
       │                                                  │
       ├─► [Perplexity API] ──► search_results 반환       │
       ├─► [OpenAI API] ──► annotations 반환              │
       ├─► [Gemini API] ──► groundingMetadata + 신뢰도    │
       └─► [Claude API] ──► web_search_tool_result 반환   │
       │                                                  │
       ▼                                                  │
[통합 인용 스키마(UnifiedCitation) 정규화]                │
       │                                                  │
       ▼                                                  │
[크로스 플랫폼 검증 + 경쟁사 분석]                        │
       │                                                  │
       ▼                                                  │
[Supabase DB 저장]                                        │
       │                                                  │
       ▼                                                  │
[결과 반환] ◄─────────────────────────────────────────────┘
       │
       ▼
[UI 업데이트]
```

---

## 2. 기술 스택 상세

### 2.1 Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 14.x | React 프레임워크, App Router |
| **React** | 18.x | UI 라이브러리 |
| **TypeScript** | 5.x | 타입 안정성 |
| **Tailwind CSS** | 3.x | 스타일링 |
| **shadcn/ui** | latest | UI 컴포넌트 |
| **Recharts** | 2.x | 차트/그래프 |
| **Zustand** | 4.x | 상태 관리 (필요시) |

### 2.2 Backend (Serverless)

| 기술 | 용도 |
|------|------|
| **Next.js API Routes** | 간단한 API 엔드포인트 |
| **Supabase Edge Functions** | LLM API 호출 (긴 실행 시간) |
| **Supabase Client** | DB 직접 접근 |

### 2.3 Database & Storage

| 기술 | 용도 |
|------|------|
| **Supabase PostgreSQL** | 메인 데이터베이스 |
| **Supabase Storage** | 리포트 파일 저장 (Phase 3) |
| **Supabase Auth** | 인증 (Phase 3) |

### 2.4 Deployment

| 기술 | 용도 |
|------|------|
| **Vercel** | Next.js 호스팅 |
| **GitHub** | 소스 코드 관리 |
| **GitHub Actions** | CI/CD (선택) |

---

## 3. 프로젝트 구조

```
geo-analyzer/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # 루트 레이아웃
│   ├── page.tsx                 # 홈페이지 (분석 실행)
│   ├── analysis/
│   │   ├── page.tsx            # 분석 결과 목록
│   │   └── [id]/
│   │       └── page.tsx        # 분석 상세
│   ├── dashboard/
│   │   └── page.tsx            # 대시보드 (Phase 2)
│   ├── projects/
│   │   └── page.tsx            # 프로젝트 관리 (Phase 2)
│   └── api/
│       ├── analyze/
│       │   └── route.ts        # 분석 트리거 API
│       └── analyses/
│           └── route.ts        # 분석 결과 CRUD
│
├── components/
│   ├── ui/                      # shadcn/ui 컴포넌트
│   ├── analysis/
│   │   ├── QueryInput.tsx      # 쿼리 입력 폼
│   │   ├── ResultCard.tsx      # LLM별 결과 카드
│   │   ├── CitationList.tsx    # 인용 목록
│   │   └── AnalysisStatus.tsx  # 분석 진행 상태
│   ├── dashboard/
│   │   ├── MetricCard.tsx      # 지표 카드
│   │   └── CitationChart.tsx   # 인용률 차트
│   └── layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Supabase 클라이언트
│   │   ├── server.ts           # 서버사이드 클라이언트
│   │   └── types.ts            # DB 타입 정의 (UnifiedCitation 포함)
│   ├── llm/
│   │   ├── perplexity.ts       # Perplexity API (search_results)
│   │   ├── openai.ts           # OpenAI Responses API (annotations)
│   │   ├── gemini.ts           # Gemini API (groundingMetadata)
│   │   ├── claude.ts           # Claude API (web_search_20250305)
│   │   └── types.ts            # 통합 인용 스키마 (UnifiedCitation)
│   └── utils/
│       ├── citation-parser.ts      # 인용 파싱 유틸
│       ├── domain-matcher.ts       # 도메인 매칭 유틸
│       ├── brand-matcher.ts        # 브랜드 언급 감지
│       ├── cross-validation.ts     # 크로스 플랫폼 검증
│       └── competitor-analysis.ts  # 경쟁사 분석
│
├── hooks/
│   ├── useAnalysis.ts          # 분석 관련 훅
│   └── useProject.ts           # 프로젝트 관련 훅
│
├── types/
│   └── index.ts                # 전역 타입 정의
│
├── supabase/
│   ├── migrations/             # DB 마이그레이션
│   └── functions/
│       └── analyze-query/      # Edge Function
│           └── index.ts
│
├── public/
├── .env.local                  # 환경 변수
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## 4. 데이터베이스 스키마

### 4.1 Phase 1: 핵심 테이블 (4개 LLM)

```sql
-- analyses: 분석 결과 저장 (4개 LLM)
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    my_domain TEXT,                    -- 분석 대상 도메인
    my_brand TEXT,                     -- 분석 대상 브랜드명
    brand_aliases TEXT[],              -- 브랜드 별칭
    results JSONB NOT NULL DEFAULT '{}', -- 4개 LLM별 결과
    summary JSONB,                     -- 요약 정보
    cross_validation JSONB,            -- 크로스 플랫폼 검증 결과
    competitor_analysis JSONB,         -- 경쟁사 분석 결과
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- results JSONB 구조 (4개 LLM + UnifiedCitation):
-- {
--   "perplexity": {
--     "answer": "string",
--     "citations": [UnifiedCitation],   // search_results 기반
--     "myDomainCited": boolean,
--     "myDomainPositions": number[],
--     "brandMentioned": boolean,
--     "brandMentionContext": string[],
--     "responseTimeMs": number,
--     "model": "sonar-pro",
--     "error": string | null
--   },
--   "chatgpt": { ... },   // annotations 기반
--   "gemini": { ... },    // groundingMetadata + confidenceScores 기반
--   "claude": { ... }     // web_search_tool_result 기반
-- }

-- 인덱스
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_my_domain ON analyses(my_domain);
CREATE INDEX idx_analyses_status ON analyses(status);
```

### 4.2 Phase 2: 확장 테이블

```sql
-- projects: 프로젝트 관리
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    brand_aliases TEXT[] DEFAULT '{}',
    industry TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- queries: 저장된 쿼리
CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT CHECK (type IN ('keyword', 'phrase', 'brand')),
    intent TEXT CHECK (intent IN ('informational', 'commercial', 'transactional', 'navigational')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- competitors: 경쟁사
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    brand_aliases TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- analyses 테이블 확장 (project_id 추가)
ALTER TABLE analyses ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE analyses ADD COLUMN query_id UUID REFERENCES queries(id) ON DELETE SET NULL;
```

### 4.3 Phase 3: 인증 & 고급

```sql
-- users와 연결 (Supabase Auth 사용)
ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- page_analyses: 페이지 구조 분석
CREATE TABLE page_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    scores JSONB NOT NULL,           -- 점수 정보
    issues JSONB DEFAULT '[]',       -- 발견된 문제점
    recommendations JSONB DEFAULT '[]', -- 개선 제안
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (인증된 사용자만 자신의 데이터 접근)
CREATE POLICY "Users can access own projects"
    ON projects FOR ALL
    USING (auth.uid() = user_id);
```

---

## 5. API 설계

### 5.1 Next.js API Routes

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/analyze` | POST | 분석 실행 트리거 |
| `/api/analyses` | GET | 분석 결과 목록 |
| `/api/analyses/[id]` | GET | 분석 결과 상세 |
| `/api/analyses/[id]` | DELETE | 분석 결과 삭제 |

### 5.2 Supabase Edge Functions

| Function | 설명 | 예상 실행 시간 |
|----------|------|---------------|
| `analyze-query` | **4개 LLM 동시 호출** + 크로스 검증 + 결과 저장 | 30-90초 |
| `analyze-page` | 페이지 크롤링 및 구조 분석 (Phase 3) | 10-20초 |

### 5.3 API 요청/응답 예시

```typescript
// POST /api/analyze
// Request
{
  "query": "암보험 추천해줘",
  "myDomain": "meritzfire.com",
  "myBrand": "메리츠화재"
}

// Response
{
  "analysisId": "uuid",
  "status": "processing"
}

// Edge Function 완료 후 DB 저장된 결과
{
  "id": "uuid",
  "query_text": "암보험 추천해줘",
  "results": {
    "chatgpt": {
      "answer": "...",
      "citations": [...],
      "my_domain_cited": true,
      "citation_position": 2
    },
    ...
  },
  "summary": {
    "total_citations": 12,
    "my_domain_cited_count": 2,
    "llms_citing_my_domain": ["chatgpt", "perplexity"]
  }
}
```

---

## 6. 환경 변수

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Edge Functions용

# LLM APIs (Edge Functions에서 사용 - 4개)
PERPLEXITY_API_KEY=pplx-xxx       # sonar-pro 모델
OPENAI_API_KEY=sk-xxx             # gpt-4o + Responses API
GOOGLE_AI_API_KEY=xxx             # gemini-2.0-flash
ANTHROPIC_API_KEY=sk-ant-xxx      # claude-sonnet-4 + web_search

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 7. 개발 Phase 개요

| Phase | 기간 | 핵심 기능 | 설계 문서 |
|-------|------|----------|----------|
| **Phase 1** | 4주 | 쿼리 분석, 결과 표시, 히스토리 | `Phase1_*.md` |
| **Phase 2** | 3주 | 프로젝트 관리, 대시보드, 경쟁사 비교 | `Phase2_*.md` |
| **Phase 3** | 3주 | 페이지 분석, 인증, 최적화 제안 | `Phase3_*.md` |

---

## 다음 문서

- `Phase1_01_Setup.md` - 프로젝트 초기 설정
- `Phase1_02_Database.md` - 데이터베이스 구축
- `Phase1_03_EdgeFunction.md` - Edge Function 개발
- `Phase1_04_Frontend.md` - 프론트엔드 개발
- `PROGRESS_LOG.md` - 작업 진행 로그

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
| 2.0 | 2025-11-28 | 기술 스택 단순화, MVP 범위 재정의 |
| 3.0 | 2025-12-01 | 4개 LLM 지원 (Claude 추가), UnifiedCitation 스키마, 크로스 플랫폼 검증 |
