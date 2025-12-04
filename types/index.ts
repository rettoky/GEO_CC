/**
 * 공통 타입 정의
 * 클라이언트와 Edge Function에서 공유
 */

// Import AnalyzeResponse for use within this file
import type { AnalyzeResponse as AnalyzeResponseType } from '@/lib/supabase/types'

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
  AnalyzeRequest,
  AnalyzeResponse,
  BrandMention,
  BrandMentionAnalysis,
} from '@/lib/supabase/types'

export { INSURANCE_COMPETITOR_BRANDS } from '@/lib/supabase/types'

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
 * UI 상태 타입
 */

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AnalysisState {
  status: AnalysisStatus
  data: AnalyzeResponseType | null
  error: Error | null
}
