/**
 * Reports Types
 * 분석 보고서 관련 타입 정의
 */

export type ReportType = 'comprehensive' | 'summary'
export type PDFStatus = 'pending' | 'generating' | 'completed' | 'failed'

/**
 * 요약 섹션
 */
export interface ExecutiveSummary {
  totalQueries: number
  avgCitationRate: number
  topCompetitor: string | null
  gradeRating: 'A' | 'B' | 'C' | 'D'
  keyInsights: string[]
}

/**
 * 쿼리 분석 섹션
 */
export interface QueryAnalysisSection {
  baseQuery: string
  variationsCount: number
  variationResults: {
    variation: string
    type: string
    citationCount: number
    citationRate: number
  }[]
}

/**
 * 인용 분석 섹션
 */
export interface CitationAnalysisSection {
  myCitationRate: number
  competitorAverage: number
  llmBreakdown: {
    llm: string
    totalCitations: number
    myCitations: number
    citationRate: number
  }[]
  trendData?: any // 시간별 트렌드 (추후 구현)
}

/**
 * 경쟁사 비교 섹션
 */
export interface CompetitorComparisonSection {
  rankings: {
    rank: number
    domain: string
    brandName: string | null
    citationCount: number
    citationRate: number
  }[]
  gapAnalysis: string // 한국어 설명
  strengthsWeaknesses: {
    type: 'strength' | 'weakness'
    title: string
    description: string
  }[]
}

/**
 * 페이지 구조 인사이트 섹션
 */
export interface PageStructureInsightsSection {
  myPageAnalysis: {
    url: string
    metaTags: any
    contentStructure: any
  } | null
  competitorPageAnalysis: {
    domain: string
    url: string
    metaTags: any
    contentStructure: any
  }[]
  recommendations: RecommendationItem[]
}

/**
 * 개선 제안 항목
 */
export interface RecommendationItem {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  expectedImpact: string
  difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * 웹 보고서 데이터 (전체 구조)
 */
export interface ReportWebData {
  executiveSummary: ExecutiveSummary
  queryAnalysis: QueryAnalysisSection
  citationAnalysis: CitationAnalysisSection
  competitorComparison: CompetitorComparisonSection
  pageStructureInsights: PageStructureInsightsSection
  recommendations: RecommendationItem[]
}

/**
 * 보고서 엔티티
 */
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

/**
 * 보고서 생성 입력
 */
export interface CreateReportInput {
  analysis_id: string
  report_type?: ReportType
  web_data?: ReportWebData
}

/**
 * PDF 생성 요청
 */
export interface GeneratePDFRequest {
  reportId: string
}

/**
 * PDF 생성 응답
 */
export interface GeneratePDFResponse {
  success: boolean
  pdfUrl?: string
  error?: string
}
