# Phase 1 설계서
## 02. 데이터베이스 구축

---

## Phase 정보
| 항목 | 내용 |
|------|------|
| Phase | 1 - Core MVP |
| 문서 | 02/04 |
| 예상 기간 | 2-3일 |
| 선행 작업 | Phase1_01_Setup 완료 |
| 참고 문서 | CORE_LLM_Citation_Methodology.md |

---

## 1. 개요

### 1.1 목표
- Supabase에 분석 결과 저장 테이블 생성
- **4개 LLM 결과** 저장 구조 (Perplexity, ChatGPT, Gemini, Claude)
- **통합 인용 스키마** (UnifiedCitation) 적용
- 크로스 플랫폼 검증 및 경쟁사 분석 데이터 저장
- TypeScript 타입 생성 및 CRUD 함수 구현

### 1.2 산출물
- [ ] `analyses` 테이블 생성 (4개 LLM + 추가 필드)
- [ ] 인덱스 설정
- [ ] DB 타입 정의 업데이트 (UnifiedCitation 포함)
- [ ] 데이터 접근 함수 구현

---

## 2. 작업 상세

### Task 1.2.1: analyses 테이블 생성

#### 작업 내용

Supabase Dashboard > SQL Editor에서 실행:

```sql
-- ============================================
-- GEO Analyzer: Phase 1 Database Schema (4 LLM)
-- ============================================

-- analyses 테이블: 분석 결과 저장
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 쿼리 정보
    query_text TEXT NOT NULL,

    -- 분석 대상 정보
    my_domain TEXT,              -- 예: "meritzfire.com"
    my_brand TEXT,               -- 예: "메리츠화재"
    brand_aliases TEXT[],        -- 예: ["메리츠", "Meritz"]

    -- ✅ 4개 LLM 결과 (JSONB로 통합 저장)
    results JSONB NOT NULL DEFAULT '{}',

    -- 요약 정보
    summary JSONB,

    -- ✅ 크로스 플랫폼 검증 결과
    cross_validation JSONB,

    -- ✅ 경쟁사 분석 결과
    competitor_analysis JSONB,

    -- 상태
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,

    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_my_domain ON analyses(my_domain);
CREATE INDEX IF NOT EXISTS idx_analyses_query_text ON analyses USING gin(to_tsvector('simple', query_text));

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

-- 주석 추가
COMMENT ON TABLE analyses IS '쿼리 분석 결과 저장 테이블 (4개 LLM)';
COMMENT ON COLUMN analyses.results IS '4개 LLM별 분석 결과 JSON (perplexity, chatgpt, gemini, claude)';
COMMENT ON COLUMN analyses.summary IS '분석 요약 정보 (인용률, 브랜드 언급률 등)';
COMMENT ON COLUMN analyses.cross_validation IS '크로스 플랫폼 검증 결과';
COMMENT ON COLUMN analyses.competitor_analysis IS '경쟁사 분석 결과';
```

#### results JSONB 구조 정의 (4개 LLM + UnifiedCitation)

```json
{
  "perplexity": {
    "success": true,
    "answer": "LLM이 생성한 답변 전문...",
    "citations": [
      {
        "id": "uuid",
        "source": "perplexity",
        "position": 1,
        "url": "https://example.com/page1",
        "cleanUrl": "https://example.com/page1",
        "domain": "example.com",
        "title": "페이지 제목",
        "snippet": "인용된 내용 일부...",
        "publishedDate": "2025-01-15",
        "mentionCount": 2,
        "avgConfidence": null,
        "confidenceScores": [],
        "textSpans": []
      }
    ],
    "myDomainCited": true,
    "myDomainPositions": [1, 3],
    "myDomainConfidence": [],
    "brandMentioned": true,
    "brandMentionContext": ["...메리츠화재는 암보험 분야에서..."],
    "responseTimeMs": 2500,
    "model": "sonar-pro",
    "error": null
  },
  "chatgpt": {
    "success": true,
    "answer": "...",
    "citations": [
      {
        "id": "uuid",
        "source": "chatgpt",
        "position": 1,
        "url": "...",
        "cleanUrl": "...",
        "domain": "example.com",
        "title": "...",
        "snippet": null,
        "publishedDate": null,
        "mentionCount": 1,
        "avgConfidence": null,
        "confidenceScores": [],
        "textSpans": [
          { "start": 0, "end": 50, "text": "인용된 텍스트..." }
        ]
      }
    ],
    "myDomainCited": true,
    "myDomainPositions": [2],
    "myDomainConfidence": [],
    "brandMentioned": true,
    "brandMentionContext": ["..."],
    "responseTimeMs": 3500,
    "model": "gpt-4o",
    "error": null
  },
  "gemini": {
    "success": true,
    "answer": "...",
    "citations": [
      {
        "id": "uuid",
        "source": "gemini",
        "position": 1,
        "url": "...",
        "cleanUrl": "...",
        "domain": "example.com",
        "title": "...",
        "snippet": null,
        "publishedDate": null,
        "mentionCount": 1,
        "avgConfidence": 0.85,
        "confidenceScores": [0.9, 0.8],
        "textSpans": [
          { "start": 10, "end": 60, "text": "...", "confidence": 0.9 }
        ]
      }
    ],
    "myDomainCited": false,
    "myDomainPositions": [],
    "myDomainConfidence": [],
    "brandMentioned": true,
    "brandMentionContext": ["..."],
    "responseTimeMs": 2800,
    "model": "gemini-2.0-flash",
    "error": null
  },
  "claude": {
    "success": true,
    "answer": "...",
    "citations": [
      {
        "id": "uuid",
        "source": "claude",
        "position": 1,
        "url": "...",
        "cleanUrl": "...",
        "domain": "example.com",
        "title": "...",
        "snippet": "웹 검색 결과 스니펫...",
        "publishedDate": null,
        "mentionCount": 1,
        "avgConfidence": null,
        "confidenceScores": [],
        "textSpans": []
      }
    ],
    "myDomainCited": true,
    "myDomainPositions": [1],
    "myDomainConfidence": [],
    "brandMentioned": true,
    "brandMentionContext": ["..."],
    "responseTimeMs": 3200,
    "model": "claude-sonnet-4-20250514",
    "error": null
  }
}
```

#### summary JSONB 구조 정의 (4개 LLM)
```json
{
  "totalLlms": 4,
  "successfulLlms": 4,
  "failedLlms": 0,
  "citationRate": 75,
  "citationRateByLLM": {
    "perplexity": 100,
    "chatgpt": 100,
    "gemini": 0,
    "claude": 100
  },
  "myDomainCitedCount": 3,
  "myDomainCitedBy": ["perplexity", "chatgpt", "claude"],
  "avgCitationPosition": 1.67,
  "brandMentionRate": 100,
  "brandMentionedCount": 4,
  "brandMentionedBy": ["perplexity", "chatgpt", "gemini", "claude"],
  "totalCitations": 20,
  "uniqueDomainsCited": 15,
  "avgConfidenceScore": 0.85,
  "avgResponseTimeMs": 3000
}
```

#### cross_validation JSONB 구조 정의
```json
{
  "crossValidatedDomains": [
    { "domain": "example.com", "count": 3 },
    { "domain": "competitor.com", "count": 2 }
  ],
  "validationScore": 0.75
}
```

#### competitor_analysis JSONB 구조 정의
```json
[
  {
    "competitor": {
      "name": "삼성화재",
      "domain": "samsungfire.com",
      "aliases": ["삼성", "Samsung Fire"]
    },
    "citations": [
      { "llm": "perplexity", "position": 2, "url": "...", "confidence": null },
      { "llm": "gemini", "position": 1, "url": "...", "confidence": 0.9 }
    ],
    "citationRate": 50,
    "avgPosition": 1.5,
    "brandMentions": 5
  }
]
```

#### 체크리스트
- [ ] SQL 실행 완료 (에러 없음)
- [ ] 테이블 생성 확인 (Table Editor에서)
- [ ] 인덱스 생성 확인
- [ ] 트리거 생성 확인

---

### Task 1.2.2: TypeScript 타입 정의 (4개 LLM + UnifiedCitation)

#### 작업 내용

**lib/supabase/types.ts** 업데이트:

```typescript
// ============================================
// Database Types (4 LLM + UnifiedCitation)
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ✅ LLM 타입 (4개)
export type LLMType = 'perplexity' | 'chatgpt' | 'gemini' | 'claude'

// 분석 상태
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

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
  id: string
  source: LLMType
  position: number

  // URL 정보
  url: string
  cleanUrl: string
  domain: string

  // 메타데이터
  title: string | null
  snippet: string | null
  publishedDate: string | null  // Perplexity만 제공

  // 분석 데이터
  mentionCount: number
  avgConfidence: number | null  // Gemini만 제공 (0-1)
  confidenceScores: number[]

  // 텍스트 매핑 (OpenAI, Gemini 지원)
  textSpans: TextSpan[]
}

// ============================================
// LLM 결과 타입
// ============================================

// LLM별 처리된 결과
export interface LLMResult {
  success: boolean
  answer: string
  citations: UnifiedCitation[]

  // 내 도메인 분석
  myDomainCited: boolean
  myDomainPositions: number[]
  myDomainConfidence: number[]  // Gemini만

  // 브랜드 언급 분석
  brandMentioned: boolean
  brandMentionContext: string[]

  // 메타
  responseTimeMs: number
  model: string
  error: string | null
}

// ✅ 분석 결과 전체 (4개 LLM)
export interface AnalysisResults {
  perplexity: LLMResult | null
  chatgpt: LLMResult | null
  gemini: LLMResult | null
  claude: LLMResult | null
}

// ============================================
// 분석 요약 및 검증 타입
// ============================================

// 분석 요약
export interface AnalysisSummary {
  totalLlms: number  // 4
  successfulLlms: number
  failedLlms: number

  // 인용률
  citationRate: number
  citationRateByLLM: {
    perplexity: number
    chatgpt: number
    gemini: number
    claude: number
  }

  // 내 도메인 분석
  myDomainCitedCount: number
  myDomainCitedBy: LLMType[]
  avgCitationPosition: number

  // 브랜드 언급
  brandMentionRate: number
  brandMentionedCount: number
  brandMentionedBy: LLMType[]

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
    count: number
  }[]
  validationScore: number
}

// 경쟁사 분석 결과
export interface CompetitorAnalysis {
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
  citationRate: number
  avgPosition: number
  brandMentions: number
}

// ============================================
// Database 스키마
// ============================================

export interface Database {
  public: {
    Tables: {
      analyses: {
        Row: {
          id: string
          query_text: string
          my_domain: string | null
          my_brand: string | null
          brand_aliases: string[] | null
          results: AnalysisResults
          summary: AnalysisSummary | null
          cross_validation: CrossValidation | null
          competitor_analysis: CompetitorAnalysis[] | null
          status: AnalysisStatus
          error_message: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          query_text: string
          my_domain?: string | null
          my_brand?: string | null
          brand_aliases?: string[] | null
          results?: AnalysisResults
          summary?: AnalysisSummary | null
          cross_validation?: CrossValidation | null
          competitor_analysis?: CompetitorAnalysis[] | null
          status?: AnalysisStatus
          error_message?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          query_text?: string
          my_domain?: string | null
          my_brand?: string | null
          brand_aliases?: string[] | null
          results?: AnalysisResults
          summary?: AnalysisSummary | null
          cross_validation?: CrossValidation | null
          competitor_analysis?: CompetitorAnalysis[] | null
          status?: AnalysisStatus
          error_message?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
    }
  }
}

// 편의 타입
export type Analysis = Database['public']['Tables']['analyses']['Row']
export type AnalysisInsert = Database['public']['Tables']['analyses']['Insert']
export type AnalysisUpdate = Database['public']['Tables']['analyses']['Update']
```

#### 체크리스트
- [ ] 타입 파일 업데이트 완료
- [ ] UnifiedCitation 타입 정의
- [ ] 4개 LLM 결과 타입 정의
- [ ] CrossValidation, CompetitorAnalysis 타입 정의
- [ ] TypeScript 컴파일 에러 없음
- [ ] IDE 자동완성 동작 확인

---

### Task 1.2.3: 데이터 접근 함수 구현

#### 작업 내용

**lib/supabase/queries.ts** 생성:

```typescript
import { createClient } from './client'
import type { Analysis, AnalysisInsert, AnalysisUpdate, AnalysisStatus } from './types'

// ============================================
// Analysis CRUD Functions
// ============================================

/**
 * 새 분석 생성 (pending 상태)
 */
export async function createAnalysis(data: {
  query_text: string
  my_domain?: string
  my_brand?: string
  brand_aliases?: string[]
}): Promise<{ data: Analysis | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data: analysis, error } = await supabase
    .from('analyses')
    .insert({
      query_text: data.query_text,
      my_domain: data.my_domain || null,
      my_brand: data.my_brand || null,
      brand_aliases: data.brand_aliases || null,
      status: 'pending',
      results: {},
    })
    .select()
    .single()
  
  return { data: analysis, error }
}

/**
 * 분석 결과 업데이트
 */
export async function updateAnalysis(
  id: string, 
  updates: AnalysisUpdate
): Promise<{ data: Analysis | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('analyses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  return { data, error }
}

/**
 * 분석 상태 업데이트
 */
export async function updateAnalysisStatus(
  id: string,
  status: AnalysisStatus,
  errorMessage?: string
): Promise<{ error: Error | null }> {
  const supabase = createClient()
  
  const updates: AnalysisUpdate = {
    status,
    ...(status === 'completed' && { completed_at: new Date().toISOString() }),
    ...(status === 'failed' && { error_message: errorMessage }),
  }
  
  const { error } = await supabase
    .from('analyses')
    .update(updates)
    .eq('id', id)
  
  return { error }
}

/**
 * 분석 조회 (단일)
 */
export async function getAnalysis(
  id: string
): Promise<{ data: Analysis | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single()
  
  return { data, error }
}

/**
 * 분석 목록 조회
 */
export async function getAnalyses(options?: {
  limit?: number
  offset?: number
  status?: AnalysisStatus
  myDomain?: string
}): Promise<{ data: Analysis[] | null; error: Error | null; count: number | null }> {
  const supabase = createClient()
  
  let query = supabase
    .from('analyses')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
  
  if (options?.status) {
    query = query.eq('status', options.status)
  }
  
  if (options?.myDomain) {
    query = query.eq('my_domain', options.myDomain)
  }
  
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }
  
  const { data, error, count } = await query
  
  return { data, error, count }
}

/**
 * 분석 삭제
 */
export async function deleteAnalysis(
  id: string
): Promise<{ error: Error | null }> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('analyses')
    .delete()
    .eq('id', id)
  
  return { error }
}

/**
 * 최근 분석 통계
 */
export async function getAnalysisStats(days: number = 7): Promise<{
  total: number
  completed: number
  avgCitationRate: number
}> {
  const supabase = createClient()
  
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const { data, error } = await supabase
    .from('analyses')
    .select('status, summary')
    .gte('created_at', since.toISOString())
  
  if (error || !data) {
    return { total: 0, completed: 0, avgCitationRate: 0 }
  }
  
  const total = data.length
  const completed = data.filter(a => a.status === 'completed').length
  
  const citationRates = data
    .filter(a => a.summary?.my_domain_cited_count !== undefined)
    .map(a => {
      const summary = a.summary as any
      return summary.my_domain_cited_count / summary.total_llms
    })
  
  const avgCitationRate = citationRates.length > 0
    ? citationRates.reduce((a, b) => a + b, 0) / citationRates.length
    : 0
  
  return { total, completed, avgCitationRate }
}
```

#### 체크리스트
- [ ] queries.ts 파일 생성 완료
- [ ] 모든 함수 타입 에러 없음
- [ ] createClient import 정상

---

### Task 1.2.4: 데이터베이스 테스트

#### 작업 내용

**app/test-db/page.tsx** (임시 테스트 페이지):

```typescript
'use client'

import { useState } from 'react'
import { createAnalysis, getAnalyses, deleteAnalysis } from '@/lib/supabase/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestDBPage() {
  const [results, setResults] = useState<string>('')
  
  const testCreate = async () => {
    const { data, error } = await createAnalysis({
      query_text: '테스트 쿼리: 암보험 추천',
      my_domain: 'example.com',
      my_brand: '테스트브랜드',
    })
    setResults(JSON.stringify({ data, error }, null, 2))
  }
  
  const testList = async () => {
    const { data, error, count } = await getAnalyses({ limit: 5 })
    setResults(JSON.stringify({ data, error, count }, null, 2))
  }
  
  const testDeleteAll = async () => {
    const { data } = await getAnalyses({ limit: 100 })
    if (data) {
      for (const item of data) {
        await deleteAnalysis(item.id)
      }
    }
    setResults('All test data deleted')
  }
  
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Database Test</h1>
      
      <div className="flex gap-2">
        <Button onClick={testCreate}>Create Test</Button>
        <Button onClick={testList} variant="outline">List All</Button>
        <Button onClick={testDeleteAll} variant="destructive">Delete All</Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto max-h-96 bg-muted p-4 rounded">
            {results}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 테스트 순서
1. http://localhost:3000/test-db 접속
2. "Create Test" 클릭 → 데이터 생성 확인
3. "List All" 클릭 → 목록 조회 확인
4. Supabase Dashboard에서 데이터 확인
5. "Delete All" 클릭 → 테스트 데이터 삭제
6. 테스트 완료 후 test-db 페이지 삭제

#### 체크리스트
- [ ] Create 테스트 성공
- [ ] List 테스트 성공
- [ ] Supabase Dashboard에서 데이터 확인
- [ ] Delete 테스트 성공
- [ ] 테스트 페이지 삭제

---

## 3. 검증 체크리스트

### 최종 확인 사항

| 항목 | 확인 |
|------|------|
| analyses 테이블 존재 | [ ] |
| 인덱스 3개 생성됨 | [ ] |
| updated_at 트리거 동작 | [ ] |
| TypeScript 타입 정의 완료 | [ ] |
| CRUD 함수 모두 동작 | [ ] |
| 테스트 데이터 삭제 완료 | [ ] |

---

## 4. 트러블슈팅

### 자주 발생하는 문제

| 문제 | 원인 | 해결 방법 |
|------|------|----------|
| `relation "analyses" does not exist` | 테이블 미생성 | SQL 다시 실행 |
| `permission denied` | RLS 문제 | Phase 1에서는 RLS 비활성화 상태여야 함 |
| JSONB 타입 에러 | 타입 미스매치 | types.ts 확인 |

### RLS 비활성화 확인
Phase 1에서는 인증 없이 진행하므로 RLS가 비활성화되어 있어야 합니다:

```sql
-- RLS 상태 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'analyses';

-- 만약 활성화되어 있다면 비활성화
ALTER TABLE analyses DISABLE ROW LEVEL SECURITY;
```

---

## 5. 다음 단계

이 문서 완료 후 진행:
- **Phase1_03_EdgeFunction.md**: LLM API 호출 Edge Function 개발

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
| 2.0 | 2025-11-28 | **CORE_LLM_Citation_Methodology.md 반영** |
|     |            | - Claude 결과 필드 추가 (4개 LLM) |
|     |            | - UnifiedCitation 통합 인용 스키마 적용 |
|     |            | - cross_validation 컬럼 추가 |
|     |            | - competitor_analysis 컬럼 추가 |
|     |            | - TypeScript 타입 전면 개정 |
