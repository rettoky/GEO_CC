-- =============================================
-- GEO Analyzer Enhanced Features Migration
-- Created: 2025-12-03
-- Purpose: Add support for query variations, competitors,
--          page crawling, and comprehensive reporting
-- =============================================

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
COMMENT ON COLUMN query_variations.generation_method IS 'ai: GPT-4o로 생성, manual: 사용자가 직접 입력';

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
COMMENT ON COLUMN competitors.is_confirmed IS '사용자가 경쟁사임을 확인한 경우 true';

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
    schema_markup JSONB, -- Schema.org JSON-LD 데이터 (배열)
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
COMMENT ON COLUMN page_crawls.html_content IS 'HTML 원본 (처음 50KB만 저장, 필요시 압축)';
COMMENT ON COLUMN page_crawls.meta_tags IS 'title, description, keywords, OG tags, canonical 등';
COMMENT ON COLUMN page_crawls.schema_markup IS 'Schema.org JSON-LD 데이터 (배열)';
COMMENT ON COLUMN page_crawls.content_structure IS 'headings, wordCount, paragraphCount, imageCount, linkCount 등';

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
COMMENT ON COLUMN reports.pdf_url IS 'Supabase Storage의 public URL';
COMMENT ON COLUMN reports.pdf_status IS 'PDF 생성 상태 추적';

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
COMMENT ON COLUMN analyses.report_id IS '생성된 보고서 ID (1:1 관계)';

-- =============================================
-- 6. 추가 인덱스 (성능 최적화)
-- =============================================
CREATE INDEX idx_analyses_base_query ON analyses(base_query);
CREATE INDEX idx_analyses_report_id ON analyses(report_id);
CREATE INDEX idx_analyses_created_at_desc ON analyses(created_at DESC);

-- =============================================
-- 7. RLS (Row Level Security) - 추후 Phase 3에서 활성화
-- =============================================
-- Phase 3 (인증 구현 시) RLS 정책 추가 예정
-- 현재는 모든 데이터 public 접근 가능

-- =============================================
-- 완료
-- =============================================
-- 이 마이그레이션은 GEO Analyzer의 핵심 기능 확장을 위한
-- 데이터베이스 스키마를 구성합니다:
-- - 쿼리 변형 (AI 생성)
-- - 경쟁사 분석 (자동/수동)
-- - 페이지 크롤링 (메타데이터, 구조 분석)
-- - 종합 보고서 (웹 + PDF)
