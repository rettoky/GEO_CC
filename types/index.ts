/**
 * 공통 타입 정의
 * 클라이언트와 Edge Function에서 공유
 */

// Re-export Supabase types
export type {
  LLMType,
  TextSpan,
  UnifiedCitation,
  LLMResult,
  AnalysisResults,
  AnalysisSummary,
  CrossValidation,
  CrossValidationItem,
  Analysis,
} from '@/lib/supabase/types'

// Query Variations types
export type {
  QueryVariation,
  CreateQueryVariationInput,
  GeneratedVariation,
  VariationGenerationResult,
  VariationGenerationInput,
  VariationType,
  GenerationMethod,
} from './queryVariations'

// Competitors types
export type {
  Competitor,
  CreateCompetitorInput,
  CompetitorScore,
  DomainData,
  DetectionMethod,
  LLMAppearances,
} from './competitors'

// Page Crawl types
export type {
  PageCrawl,
  CreatePageCrawlInput,
  PageCrawlResult,
  RobotsCheckResult,
  CrawlStatus,
  MetaTags,
  ContentStructure,
} from './pageCrawl'

// Reports types
export type {
  Report,
  CreateReportInput,
  GeneratePDFRequest,
  GeneratePDFResponse,
  ReportWebData,
  ExecutiveSummary,
  QueryAnalysisSection,
  CitationAnalysisSection,
  CompetitorComparisonSection,
  PageStructureInsightsSection,
  RecommendationItem,
  ReportType,
  PDFStatus,
} from './reports'

/**
 * Edge Function API 요청/응답 타입
 */

// 분석 요청
export interface AnalyzeRequest {
  query: string           // 검색 쿼리 (필수)
  domain?: string         // 타겟 도메인 (선택)
  brand?: string          // 브랜드명 (선택)
}

// 분석 응답
export interface AnalyzeResponse {
  success: boolean
  analysisId: string
  data?: {
    results: import('@/lib/supabase/types').AnalysisResults
    summary: import('@/lib/supabase/types').AnalysisSummary
  }
  error?: {
    message: string
    code?: string
  }
}

/**
 * UI 상태 타입
 */

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AnalysisState {
  status: AnalysisStatus
  data: AnalyzeResponse | null
  error: Error | null
}
