# Data Model: GEO Analyzer Core MVP

**Date**: 2025-12-01
**Branch**: 001-core-mvp

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          analyses                                │
├─────────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                                    │
│ query_text: TEXT                                                 │
│ my_domain: TEXT                                                  │
│ my_brand: TEXT                                                   │
│ brand_aliases: TEXT[]                                            │
│ results: JSONB (AnalysisResults)                                 │
│ summary: JSONB (AnalysisSummary)                                 │
│ cross_validation: JSONB                                          │
│ competitor_analysis: JSONB                                       │
│ status: TEXT                                                     │
│ error_message: TEXT                                              │
│ created_at: TIMESTAMPTZ                                          │
│ updated_at: TIMESTAMPTZ                                          │
│ completed_at: TIMESTAMPTZ                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Entity Definitions

### 1. Analysis (분석)

분석 세션을 나타내는 핵심 엔티티. 단일 쿼리에 대한 4개 LLM 분석 결과를 저장.

**Attributes**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | UUID | No | Primary key, auto-generated |
| query_text | TEXT | No | 사용자가 입력한 검색 쿼리 |
| my_domain | TEXT | Yes | 타겟 도메인 (예: example.com) |
| my_brand | TEXT | Yes | 브랜드명 |
| brand_aliases | TEXT[] | Yes | 브랜드 별칭 배열 |
| results | JSONB | No | 4개 LLM 분석 결과 (AnalysisResults) |
| summary | JSONB | Yes | 분석 요약 (AnalysisSummary) |
| cross_validation | JSONB | Yes | 크로스 플랫폼 검증 결과 |
| competitor_analysis | JSONB | Yes | 경쟁사 분석 결과 |
| status | TEXT | No | 'pending' \| 'processing' \| 'completed' \| 'failed' |
| error_message | TEXT | Yes | 에러 발생 시 메시지 |
| created_at | TIMESTAMPTZ | No | 생성 시간 |
| updated_at | TIMESTAMPTZ | No | 수정 시간 |
| completed_at | TIMESTAMPTZ | Yes | 완료 시간 |

**Indexes**:
- `idx_analyses_created_at` on `created_at DESC`
- `idx_analyses_status` on `status`
- `idx_analyses_my_domain` on `my_domain`

### 2. AnalysisResults (JSONB)

4개 LLM의 분석 결과를 담는 구조.

```typescript
interface AnalysisResults {
  perplexity: LLMResult | null
  chatgpt: LLMResult | null
  gemini: LLMResult | null
  claude: LLMResult | null
}
```

### 3. LLMResult

개별 LLM의 분석 결과.

```typescript
interface LLMResult {
  success: boolean
  model: string                    // 사용된 모델명
  answer: string                   // LLM 답변 원문
  citations: UnifiedCitation[]     // 정규화된 인용 목록
  responseTime: number             // 응답 시간 (ms)
  error?: string                   // 실패 시 에러 메시지
  timestamp: string                // ISO 8601 형식
}
```

### 4. UnifiedCitation (통합 인용)

4개 LLM의 인용 데이터를 정규화한 스키마.

```typescript
type LLMType = 'perplexity' | 'chatgpt' | 'gemini' | 'claude'

interface TextSpan {
  start: number
  end: number
  text: string
  confidence?: number
}

interface UnifiedCitation {
  id: string                    // UUID
  source: LLMType               // 출처 LLM
  position: number              // 인용 순서 (1부터)
  url: string                   // 원본 URL
  cleanUrl: string              // 쿼리 파라미터 제거
  domain: string                // 도메인 (www 제거)
  title: string | null          // 페이지 제목
  snippet: string | null        // 발췌문
  publishedDate: string | null  // 발행일 (Perplexity)
  mentionCount: number          // 답변 내 언급 횟수
  avgConfidence: number | null  // 평균 신뢰도 (Gemini)
  confidenceScores: number[]    // 신뢰도 배열 (Gemini)
  textSpans: TextSpan[]         // 텍스트 위치 (OpenAI)
}
```

### 5. AnalysisSummary

분석 결과 요약 정보.

```typescript
interface AnalysisSummary {
  totalCitations: number          // 전체 인용 수
  uniqueDomains: number           // 고유 도메인 수
  myDomainCited: boolean          // 타겟 도메인 인용 여부
  myDomainCitationCount: number   // 타겟 도메인 인용 횟수
  brandMentioned: boolean         // 브랜드 언급 여부
  brandMentionCount: number       // 브랜드 언급 횟수
  avgResponseTime: number         // 평균 응답 시간 (ms)
  successfulLLMs: LLMType[]       // 성공한 LLM 목록
  failedLLMs: LLMType[]           // 실패한 LLM 목록
  citationRateByLLM: {            // LLM별 인용률
    perplexity: number | null
    chatgpt: number | null
    gemini: number | null
    claude: number | null
  }
}
```

### 6. CrossValidation

크로스 플랫폼 검증 결과.

```typescript
interface CrossValidationItem {
  domain: string
  citedBy: LLMType[]         // 인용한 LLM 목록
  grade: 'A' | 'B' | 'C' | 'D'  // 검증 등급
  reliability: number        // 신뢰도 (0-100)
}

interface CrossValidation {
  items: CrossValidationItem[]
  myDomainGrade: 'A' | 'B' | 'C' | 'D' | null
}
```

## SQL Schema

```sql
-- analyses 테이블 생성
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    my_domain TEXT,
    my_brand TEXT,
    brand_aliases TEXT[] DEFAULT '{}',
    results JSONB NOT NULL DEFAULT '{}',
    summary JSONB,
    cross_validation JSONB,
    competitor_analysis JSONB,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_my_domain ON analyses(my_domain);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_analyses_updated_at
    BEFORE UPDATE ON analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Validation Rules

### Analysis
- `query_text`는 빈 문자열이 아니어야 함
- `status`는 정의된 값 중 하나여야 함
- `results`는 최소 1개 이상의 LLM 결과를 포함해야 함 (완료 시)

### UnifiedCitation
- `url`은 유효한 URL 형식이어야 함
- `position`은 1 이상의 정수여야 함
- `source`는 4개 LLMType 중 하나여야 함

## State Transitions

```
┌─────────┐    분석 요청     ┌────────────┐
│ pending │ ──────────────▶ │ processing │
└─────────┘                  └────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             ┌───────────┐  ┌───────────┐  ┌────────┐
             │ completed │  │  failed   │  │ timeout│
             └───────────┘  └───────────┘  └────────┘
```

## Future Extensions (Phase 2/3)

Phase 2에서 추가될 테이블:
- `projects`: 프로젝트 관리
- `queries`: 저장된 쿼리
- `competitors`: 경쟁사 정보

Phase 3에서 추가될 컬럼:
- `analyses.user_id`: 사용자 식별
- `analyses.project_id`: 프로젝트 연결
