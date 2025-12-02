/**
 * Edge Function LLM 타입 정의
 */

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

export interface AnalyzeRequest {
  query: string
  domain?: string
  brand?: string
}

export interface AnalyzeResponse {
  success: boolean
  analysisId: string
  data?: {
    results: AnalysisResults
    summary: AnalysisSummary
  }
  error?: {
    message: string
    code?: string
  }
}
