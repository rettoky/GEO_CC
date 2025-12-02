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
 * Re-export from Edge Function types for backward compatibility
 */
export type {
  AnalyzeRequest,
  AnalyzeResponse,
} from '@/supabase/functions/analyze-query/llm/types'

/**
 * UI 상태 타입
 */

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AnalysisState {
  status: AnalysisStatus
  data: AnalyzeResponse | null
  error: Error | null
}
