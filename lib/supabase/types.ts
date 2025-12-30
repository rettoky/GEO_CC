/**
 * Supabase Database 타입 정의
 * supabase gen types typescript --linked 명령으로 생성 가능
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type LLMType = 'perplexity' | 'chatgpt' | 'gemini' | 'claude'

export interface TextSpan {
  start: number
  end: number
  text: string
  confidence?: number
}

export interface UnifiedCitation {
  id: string
  source: LLMType
  position: number
  url: string
  cleanUrl: string
  domain: string
  title: string | null
  snippet: string | null
  publishedDate: string | null
  mentionCount: number
  avgConfidence: number | null
  confidenceScores: number[]
  textSpans: TextSpan[]
}

export interface LLMResult {
  success: boolean
  model: string
  answer: string
  citations: UnifiedCitation[]
  responseTime: number
  error?: string
  timestamp: string
}

export interface AnalysisResults {
  perplexity: LLMResult | null
  chatgpt: LLMResult | null
  gemini: LLMResult | null
  claude: LLMResult | null
}

export interface AnalysisSummary {
  totalCitations: number
  uniqueDomains: number
  myDomainCited: boolean
  myDomainCitationCount: number
  brandMentioned: boolean
  brandMentionCount: number
  avgResponseTime: number
  successfulLLMs: LLMType[]
  failedLLMs: LLMType[]
  citationRateByLLM: {
    perplexity: number | null
    chatgpt: number | null
    gemini: number | null
    claude: number | null
  }
  // 브랜드 언급 분석 (새로 추가)
  brandMentionAnalysis?: BrandMentionAnalysis
}

export interface CrossValidationItem {
  domain: string
  citedBy: LLMType[]
  grade: 'A' | 'B' | 'C' | 'D'
  reliability: number
}

export interface CrossValidation {
  items: CrossValidationItem[]
  myDomainGrade: 'A' | 'B' | 'C' | 'D' | null
}

/**
 * 트래킹 섹션 - 관련 분석을 그룹화하여 추적
 */
export interface TrackingSection {
  id: string
  name: string
  description: string | null
  default_domain: string | null
  default_brand: string | null
  default_brand_aliases: string[]
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

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
          competitor_analysis: Json | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          // Enhanced features
          base_query: string | null
          query_variations_count: number | null
          total_queries_analyzed: number | null
          citation_metrics: Json | null
          page_crawl_summary: Json | null
          visualization_data: Json | null
          intermediate_results: Json | null
          report_id: string | null
          // AI Review
          final_review: string | null
          final_review_created_at: string | null
          // Tracking Section
          section_id: string | null
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
          competitor_analysis?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          // Enhanced features
          base_query?: string | null
          query_variations_count?: number | null
          total_queries_analyzed?: number | null
          citation_metrics?: Json | null
          page_crawl_summary?: Json | null
          visualization_data?: Json | null
          intermediate_results?: Json | null
          report_id?: string | null
          // AI Review
          final_review?: string | null
          final_review_created_at?: string | null
          // Tracking Section
          section_id?: string | null
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
          competitor_analysis?: Json | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          // Enhanced features
          base_query?: string | null
          query_variations_count?: number | null
          total_queries_analyzed?: number | null
          citation_metrics?: Json | null
          page_crawl_summary?: Json | null
          visualization_data?: Json | null
          intermediate_results?: Json | null
          report_id?: string | null
          // AI Review
          final_review?: string | null
          final_review_created_at?: string | null
          // Tracking Section
          section_id?: string | null
        }
      }
      tracking_sections: {
        Row: {
          id: string
          name: string
          description: string | null
          default_domain: string | null
          default_brand: string | null
          default_brand_aliases: string[]
          color: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          default_domain?: string | null
          default_brand?: string | null
          default_brand_aliases?: string[]
          color?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          default_domain?: string | null
          default_brand?: string | null
          default_brand_aliases?: string[]
          color?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Analysis = Tables<'analyses'>

/**
 * LLM별 브랜드 언급 횟수
 */
export interface MentionCountByLLM {
  perplexity: number
  chatgpt: number
  gemini: number
  claude: number
}

/**
 * 브랜드 언급 분석 타입
 */
export interface BrandMention {
  brand: string
  aliases: string[]
  mentionCount: number
  mentionedInLLMs: LLMType[]
  /** LLM별 언급 횟수 */
  mentionCountByLLM?: MentionCountByLLM
  contexts: string[] // 언급된 문맥 (앞뒤 텍스트)
  /** 감성 분석 결과 (선택적) */
  sentimentAnalysis?: BrandMentionSentiment[]
}

/**
 * 브랜드 언급별 감성 분석
 */
export interface BrandMentionSentiment {
  /** 문맥 */
  context: string
  /** 감성 유형 */
  sentiment: 'positive' | 'negative' | 'neutral'
  /** 신뢰도 (0-1) */
  confidence: number
  /** 감성 판단 이유 */
  reason: string
  /** 출처 LLM */
  llmSource: LLMType
}

export interface BrandMentionAnalysis {
  myBrand: BrandMention | null
  competitors: BrandMention[]
  totalBrandMentions: number
}

/**
 * 보험업계 경쟁사 브랜드 사전
 */
export const INSURANCE_COMPETITOR_BRANDS: Record<string, string[]> = {
  '삼성화재': ['삼성화재', 'Samsung Fire', '삼성', 'samsungfire'],
  '현대해상': ['현대해상', 'Hyundai Marine', '현대', 'hyundaimarine'],
  '한화생명': ['한화생명', 'Hanwha Life', '한화', 'hanwhalife'],
  '교보생명': ['교보생명', 'Kyobo Life', '교보', 'kyobolife'],
  'DB손해보험': ['DB손해보험', 'DB손보', 'DB Insurance', 'DB'],
  'KB손해보험': ['KB손해보험', 'KB손보', 'KB Insurance'],
  '흥국생명': ['흥국생명', 'Heungkuk Life', '흥국'],
  '동양생명': ['동양생명', 'Tongyang Life', '동양'],
  '미래에셋생명': ['미래에셋생명', 'Mirae Asset Life', '미래에셋'],
  '라이나생명': ['라이나생명', 'LINA Life', '라이나'],
  'NH농협생명': ['NH농협생명', 'NH생명', '농협생명'],
  '신한라이프': ['신한라이프', 'Shinhan Life', '신한생명'],
  'AIA생명': ['AIA생명', 'AIA', '에이아이에이'],
  '처브라이프': ['처브라이프', 'Chubb Life', '처브'],
  '하나생명': ['하나생명', 'Hana Life', '하나'],
  '메리츠화재': ['메리츠화재', '메리츠', 'Meritz', 'meritz', '메리츠보험'],
  '롯데손해보험': ['롯데손해보험', '롯데손보', 'Lotte Insurance'],
  'MG손해보험': ['MG손해보험', 'MG손보'],
  '악사손해보험': ['악사손해보험', 'AXA', '악사'],
  '캐롯손해보험': ['캐롯손해보험', '캐롯', 'Carrot'],
}

/**
 * Edge Function API 요청/응답 타입
 */
export interface AnalyzeRequest {
  query: string
  domain?: string
  brand?: string
  brandAliases?: string[] // 브랜드 별칭 목록
}

export interface AnalyzeResponse {
  success: boolean
  analysisId: string
  data?: {
    results: AnalysisResults
    summary: AnalysisSummary
    crossValidation?: CrossValidation
  }
  error?: {
    message: string
    code?: string
  }
}
