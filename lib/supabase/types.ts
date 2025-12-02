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
