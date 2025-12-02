# Phase 1: 데이터베이스 기반 구축

**기간**: 1주차
**상태**: 📋 계획 완료
**의존성**: 없음 (첫 번째 Phase)

## 목표

모든 신규 기능을 지원하는 데이터베이스 스키마를 구축하고, TypeScript 타입 정의 및 Supabase 쿼리 함수를 작성합니다.

## 범위

### 포함 사항
- ✅ 4개 신규 테이블 생성
- ✅ `analyses` 테이블 확장 (9개 컬럼 추가)
- ✅ 인덱스 및 제약조건 설정
- ✅ TypeScript 타입 정의
- ✅ Supabase CRUD 함수 작성
- ✅ 로컬 환경에서 마이그레이션 테스트

### 제외 사항
- ❌ Edge Functions (Phase 2-3에서 진행)
- ❌ UI 컴포넌트 (Phase 2-7에서 진행)
- ❌ 비즈니스 로직 (각 Phase에서 진행)

## 작업 항목

### 1. 데이터베이스 마이그레이션 생성

**파일**: `supabase/migrations/20251203000000_enhanced_features.sql`

```sql
-- =============================================
-- 1. query_variations 테이블
-- =============================================
CREATE TABLE query_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    base_query TEXT NOT NULL,
    variation TEXT NOT NULL,
    variation_type TEXT, -- 'demographic', 'informational', 'comparison', 'recommendation'
    generation_method TEXT DEFAULT 'ai', -- 'ai' | 'manual'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variations_analysis ON query_variations(analysis_id);
CREATE INDEX idx_variations_type ON query_variations(variation_type);

COMMENT ON TABLE query_variations IS 'AI가 생성한 쿼리 변형을 저장';
COMMENT ON COLUMN query_variations.variation_type IS '변형 타입: demographic(연령대/성별), informational(정보성), comparison(비교), recommendation(추천)';

-- =============================================
-- 2. competitors 테이블
-- =============================================
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    brand_name TEXT,
    detection_method TEXT NOT NULL, -- 'manual' | 'auto'
    citation_count INTEGER DEFAULT 0,
    citation_rate DECIMAL(5,2), -- 0.00 ~ 100.00
    confidence_score DECIMAL(3,2), -- 0.00 ~ 1.00 (자동 감지 신뢰도)
    llm_appearances JSONB DEFAULT '{}', -- {"perplexity": 3, "chatgpt": 2, "gemini": 4, "claude": 1}
    is_confirmed BOOLEAN DEFAULT false, -- 사용자가 확인했는지
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competitors_analysis ON competitors(analysis_id);
CREATE INDEX idx_competitors_method ON competitors(detection_method);
CREATE INDEX idx_competitors_domain ON competitors(domain);

COMMENT ON TABLE competitors IS '수동 입력 및 자동 감지된 경쟁사 정보';
COMMENT ON COLUMN competitors.detection_method IS 'manual: 사용자 직접 입력, auto: 시스템 자동 감지';
COMMENT ON COLUMN competitors.confidence_score IS '자동 감지 시 신뢰도 점수 (0.0 ~ 1.0)';

-- =============================================
-- 3. page_crawls 테이블
-- =============================================
CREATE TABLE page_crawls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    crawl_status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed', 'blocked_robots'
    html_content TEXT, -- HTML 원본 (처음 50KB만 저장)
    meta_tags JSONB, -- {title, description, keywords, og*, canonical, etc.}
    schema_markup JSONB, -- Schema.org JSON-LD 데이터
    content_structure JSONB, -- {headings, wordCount, imageCount, etc.}
    robots_txt_allowed BOOLEAN,
    error_message TEXT,
    crawled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crawls_analysis ON page_crawls(analysis_id);
CREATE INDEX idx_crawls_domain ON page_crawls(domain);
CREATE INDEX idx_crawls_status ON page_crawls(crawl_status);

COMMENT ON TABLE page_crawls IS '크롤링된 페이지 콘텐츠 및 분석 결과';
COMMENT ON COLUMN page_crawls.crawl_status IS 'pending: 대기, success: 성공, failed: 실패, blocked_robots: robots.txt 차단';

-- =============================================
-- 4. reports 테이블
-- =============================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    report_type TEXT DEFAULT 'comprehensive', -- 'comprehensive', 'summary'
    web_data JSONB, -- 웹 대시보드용 구조화된 데이터
    pdf_url TEXT, -- Supabase Storage에 저장된 PDF URL
    pdf_status TEXT DEFAULT 'pending', -- 'pending', 'generating', 'completed', 'failed'
    pdf_error TEXT,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_analysis ON reports(analysis_id);
CREATE INDEX idx_reports_pdf_status ON reports(pdf_status);

COMMENT ON TABLE reports IS '생성된 분석 보고서 (웹 데이터 + PDF)';
COMMENT ON COLUMN reports.web_data IS '보고서 섹션별 데이터 (Executive Summary, Query Analysis, etc.)';

-- =============================================
-- 5. analyses 테이블 확장
-- =============================================
ALTER TABLE analyses
ADD COLUMN base_query TEXT,
ADD COLUMN query_variations_count INTEGER DEFAULT 0,
ADD COLUMN total_queries_analyzed INTEGER DEFAULT 1,
ADD COLUMN citation_metrics JSONB DEFAULT '{}',
ADD COLUMN page_crawl_summary JSONB DEFAULT '{}',
ADD COLUMN visualization_data JSONB DEFAULT '{}',
ADD COLUMN intermediate_results JSONB DEFAULT '{}',
ADD COLUMN report_id UUID REFERENCES reports(id);

COMMENT ON COLUMN analyses.base_query IS '기본 쿼리 (변형 생성의 기준)';
COMMENT ON COLUMN analyses.query_variations_count IS '생성된 변형 개수';
COMMENT ON COLUMN analyses.total_queries_analyzed IS '분석된 총 쿼리 수 (base + variations)';
COMMENT ON COLUMN analyses.citation_metrics IS '인용률, 브랜드 언급, 경쟁사 비교 등 메트릭';
COMMENT ON COLUMN analyses.page_crawl_summary IS '크롤링 결과 요약 (성공/실패 건수 등)';
COMMENT ON COLUMN analyses.visualization_data IS '미리 계산된 시각화 데이터 (차트용)';
COMMENT ON COLUMN analyses.intermediate_results IS '모든 중간 단계 결과 (디버깅/재분석용)';

-- =============================================
-- 6. 인덱스 추가
-- =============================================
CREATE INDEX idx_analyses_base_query ON analyses(base_query);
CREATE INDEX idx_analyses_report_id ON analyses(report_id);

-- =============================================
-- 7. RLS (Row Level Security) - 추후 Phase 3에서 활성화
-- =============================================
-- Phase 3 (인증 구현 시) RLS 정책 추가 예정
-- 현재는 모든 데이터 public 접근 가능
```

### 2. TypeScript 타입 정의

#### 파일: `types/queryVariations.ts`

```typescript
export type VariationType = 'demographic' | 'informational' | 'comparison' | 'recommendation'
export type GenerationMethod = 'ai' | 'manual'

export interface QueryVariation {
  id: string
  analysis_id: string
  base_query: string
  variation: string
  variation_type: VariationType | null
  generation_method: GenerationMethod
  created_at: string
}

export interface CreateQueryVariationInput {
  analysis_id: string
  base_query: string
  variation: string
  variation_type?: VariationType
  generation_method?: GenerationMethod
}
```

#### 파일: `types/competitors.ts`

```typescript
export type DetectionMethod = 'manual' | 'auto'

export interface LLMAppearances {
  perplexity?: number
  chatgpt?: number
  gemini?: number
  claude?: number
}

export interface Competitor {
  id: string
  analysis_id: string
  domain: string
  brand_name: string | null
  detection_method: DetectionMethod
  citation_count: number
  citation_rate: number | null
  confidence_score: number | null
  llm_appearances: LLMAppearances
  is_confirmed: boolean
  created_at: string
}

export interface CreateCompetitorInput {
  analysis_id: string
  domain: string
  brand_name?: string
  detection_method: DetectionMethod
  citation_count?: number
  citation_rate?: number
  confidence_score?: number
  llm_appearances?: LLMAppearances
}

export interface CompetitorScore {
  domain: string
  citationCount: number
  llmDiversity: number
  avgPosition: number
  competitorScore: number
  confidenceScore: number
}
```

#### 파일: `types/pageCrawl.ts`

```typescript
export type CrawlStatus = 'pending' | 'success' | 'failed' | 'blocked_robots'

export interface MetaTags {
  title?: string
  description?: string
  keywords?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  canonical?: string
  robots?: string
  author?: string
  datePublished?: string
  dateModified?: string
}

export interface ContentStructure {
  headings: {
    h1: string[]
    h2: string[]
    h3: string[]
  }
  wordCount: number
  paragraphCount: number
  imageCount: number
  linkCount: number
  hasTableOfContents: boolean
  hasFAQ: boolean
  faqCount?: number
  hasProductInfo?: boolean
  hasReviews?: boolean
}

export interface PageCrawl {
  id: string
  analysis_id: string
  url: string
  domain: string
  crawl_status: CrawlStatus
  html_content: string | null
  meta_tags: MetaTags | null
  schema_markup: any[] | null
  content_structure: ContentStructure | null
  robots_txt_allowed: boolean | null
  error_message: string | null
  crawled_at: string | null
  created_at: string
}

export interface CreatePageCrawlInput {
  analysis_id: string
  url: string
  domain: string
  crawl_status?: CrawlStatus
  html_content?: string
  meta_tags?: MetaTags
  schema_markup?: any[]
  content_structure?: ContentStructure
  robots_txt_allowed?: boolean
  error_message?: string
}
```

#### 파일: `types/reports.ts`

```typescript
export type ReportType = 'comprehensive' | 'summary'
export type PDFStatus = 'pending' | 'generating' | 'completed' | 'failed'

export interface ExecutiveSummary {
  totalQueries: number
  avgCitationRate: number
  topCompetitor: string | null
  gradeRating: 'A' | 'B' | 'C' | 'D'
  keyInsights: string[]
}

export interface RecommendationItem {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  expectedImpact: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface ReportWebData {
  executiveSummary: ExecutiveSummary
  queryAnalysis: any
  citationAnalysis: any
  competitorComparison: any
  pageStructureInsights: any
  recommendations: RecommendationItem[]
}

export interface Report {
  id: string
  analysis_id: string
  report_type: ReportType
  web_data: ReportWebData | null
  pdf_url: string | null
  pdf_status: PDFStatus
  pdf_error: string | null
  generated_at: string | null
  created_at: string
}

export interface CreateReportInput {
  analysis_id: string
  report_type?: ReportType
  web_data?: ReportWebData
}
```

#### 파일: `types/index.ts` (확장)

기존 파일에 추가:

```typescript
// 기존 imports...
export * from './queryVariations'
export * from './competitors'
export * from './pageCrawl'
export * from './reports'

// Citation Metrics 타입 추가
export interface BrandMention {
  text: string
  context: string
  llm: LLMType
}

export interface LLMCitationBreakdown {
  total: number
  mine: number
}

export interface CitationMetrics {
  myCitationRate: number
  avgCompetitorRate: number
  totalCitations: number
  myCitations: number
  brandMentions: BrandMention[]
  competitorRates: Record<string, number>
  llmBreakdown: Record<LLMType, LLMCitationBreakdown>
}

// Intermediate Results 타입
export interface IntermediateResults {
  queryGeneration?: {
    modelUsed: string
    prompt: string
    rawResponse: string
    generatedAt: string
    variations: string[]
  }
  llmRawResponses?: Record<LLMType, {
    raw: string
    timestamp: string
  }>
  competitorDetection?: {
    algorithmVersion: string
    detectedDomains: string[]
    confidenceScores: Record<string, number>
  }
  crawlResults?: {
    totalUrls: number
    successCount: number
    blockedByRobots: number
    failedCount: number
  }
}
```

### 3. Supabase 쿼리 함수

#### 파일: `lib/supabase/queries/variations.ts`

```typescript
import { supabase } from '../client'
import type { QueryVariation, CreateQueryVariationInput } from '@/types'

export async function createQueryVariation(input: CreateQueryVariationInput) {
  const { data, error } = await supabase
    .from('query_variations')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as QueryVariation
}

export async function createQueryVariations(inputs: CreateQueryVariationInput[]) {
  const { data, error } = await supabase
    .from('query_variations')
    .insert(inputs)
    .select()

  if (error) throw error
  return data as QueryVariation[]
}

export async function getQueryVariationsByAnalysis(analysisId: string) {
  const { data, error } = await supabase
    .from('query_variations')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as QueryVariation[]
}

export async function deleteQueryVariation(id: string) {
  const { error } = await supabase
    .from('query_variations')
    .delete()
    .eq('id', id)

  if (error) throw error
}
```

#### 파일: `lib/supabase/queries/competitors.ts`

```typescript
import { supabase } from '../client'
import type { Competitor, CreateCompetitorInput } from '@/types'

export async function createCompetitor(input: CreateCompetitorInput) {
  const { data, error } = await supabase
    .from('competitors')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Competitor
}

export async function createCompetitors(inputs: CreateCompetitorInput[]) {
  const { data, error } = await supabase
    .from('competitors')
    .insert(inputs)
    .select()

  if (error) throw error
  return data as Competitor[]
}

export async function getCompetitorsByAnalysis(analysisId: string) {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('citation_count', { ascending: false })

  if (error) throw error
  return data as Competitor[]
}

export async function updateCompetitor(id: string, updates: Partial<Competitor>) {
  const { data, error } = await supabase
    .from('competitors')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Competitor
}

export async function confirmCompetitor(id: string) {
  return updateCompetitor(id, { is_confirmed: true })
}

export async function deleteCompetitor(id: string) {
  const { error } = await supabase
    .from('competitors')
    .delete()
    .eq('id', id)

  if (error) throw error
}
```

#### 파일: `lib/supabase/queries/pageCrawls.ts`

```typescript
import { supabase } from '../client'
import type { PageCrawl, CreatePageCrawlInput } from '@/types'

export async function createPageCrawl(input: CreatePageCrawlInput) {
  const { data, error } = await supabase
    .from('page_crawls')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as PageCrawl
}

export async function createPageCrawls(inputs: CreatePageCrawlInput[]) {
  const { data, error } = await supabase
    .from('page_crawls')
    .insert(inputs)
    .select()

  if (error) throw error
  return data as PageCrawl[]
}

export async function getPageCrawlsByAnalysis(analysisId: string) {
  const { data, error } = await supabase
    .from('page_crawls')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as PageCrawl[]
}

export async function updatePageCrawl(id: string, updates: Partial<PageCrawl>) {
  const { data, error } = await supabase
    .from('page_crawls')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as PageCrawl
}
```

#### 파일: `lib/supabase/queries/reports.ts`

```typescript
import { supabase } from '../client'
import type { Report, CreateReportInput } from '@/types'

export async function createReport(input: CreateReportInput) {
  const { data, error } = await supabase
    .from('reports')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Report
}

export async function getReportByAnalysis(analysisId: string) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('analysis_id', analysisId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as Report
}

export async function updateReport(id: string, updates: Partial<Report>) {
  const { data, error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Report
}

export async function updatePDFStatus(
  reportId: string,
  status: 'generating' | 'completed' | 'failed',
  pdfUrl?: string,
  error?: string
) {
  const updates: any = { pdf_status: status }

  if (pdfUrl) updates.pdf_url = pdfUrl
  if (error) updates.pdf_error = error
  if (status === 'completed') updates.generated_at = new Date().toISOString()

  return updateReport(reportId, updates)
}
```

## 검증 방법

### 1. 로컬 Supabase 설정

```bash
# Supabase CLI 설치 (없다면)
npm install -g supabase

# 로컬 Supabase 시작
supabase start

# 마이그레이션 적용
supabase db reset

# 또는 새 마이그레이션만 적용
supabase db push
```

### 2. 테이블 확인

```sql
-- 모든 테이블 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 예상 결과:
-- analyses (기존)
-- competitors (신규)
-- page_crawls (신규)
-- query_variations (신규)
-- reports (신규)
```

### 3. 컬럼 확인

```sql
-- analyses 테이블 새 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'analyses'
AND column_name IN (
  'base_query',
  'query_variations_count',
  'total_queries_analyzed',
  'citation_metrics',
  'page_crawl_summary',
  'visualization_data',
  'intermediate_results',
  'report_id'
);
```

### 4. 인덱스 확인

```sql
-- 모든 인덱스 확인
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 5. 타입 체크

```bash
# TypeScript 컴파일 오류 없는지 확인
npm run build

# 타입 체크만
npx tsc --noEmit
```

### 6. 쿼리 함수 테스트

임시 테스트 파일 생성: `test-db.ts`

```typescript
import { createQueryVariation } from '@/lib/supabase/queries/variations'

async function test() {
  // 임시 analysis_id 생성
  const testAnalysisId = '00000000-0000-0000-0000-000000000000'

  try {
    const variation = await createQueryVariation({
      analysis_id: testAnalysisId,
      base_query: '암보험',
      variation: '50대 여자 암보험',
      variation_type: 'demographic'
    })

    console.log('✅ Query variation created:', variation)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

test()
```

## 체크리스트

- [ ] `20251203000000_enhanced_features.sql` 마이그레이션 파일 생성
- [ ] 로컬 Supabase에서 마이그레이션 실행
- [ ] 4개 신규 테이블 생성 확인
- [ ] `analyses` 테이블에 9개 컬럼 추가 확인
- [ ] 모든 인덱스 생성 확인
- [ ] TypeScript 타입 파일 4개 생성
- [ ] Supabase 쿼리 함수 파일 4개 생성
- [ ] TypeScript 컴파일 오류 없음 확인
- [ ] 각 쿼리 함수 간단 테스트

## 다음 단계

Phase 1 완료 후 → **Phase 2: 쿼리 변형 생성**으로 진행

Phase 2에서는:
- GPT-4o 통합 (쿼리 변형 생성)
- `generate-query-variations` Edge Function 생성
- UI 컴포넌트 개발

---

**작성일**: 2025-12-02
**예상 소요 시간**: 1주
**난이도**: ⭐⭐ (중간)
