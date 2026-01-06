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
  // 디버그 메타데이터 (각 LLM별 원시 응답 정보)
  _debug?: {
    [key: string]: unknown
  }
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

/**
 * Cross-Validation 관련 타입 (방법론 문서 Section 4.2)
 * 여러 LLM이 같은 소스를 인용하면 신뢰도 상승
 */
export interface CrossValidationItem {
  domain: string
  citedBy: LLMType[]
  grade: 'A' | 'B' | 'C' | 'D'  // A: 3+LLM, B: 2LLM, C: 1LLM+검증, D: 1LLM미검증
  reliability: number  // 0-100%
}

export interface CrossValidation {
  items: CrossValidationItem[]
  myDomainGrade: 'A' | 'B' | 'C' | 'D' | null
}

/**
 * 감성 분석 타입
 */
export type SentimentType = 'positive' | 'negative' | 'neutral'

export interface SentimentResult {
  /** 감성 유형 */
  sentiment: SentimentType
  /** 신뢰도 (0-1) */
  confidence: number
  /** 감성 판단 이유 */
  reason: string
}

export interface BrandMentionSentiment {
  /** 문맥 */
  context: string
  /** 감성 분석 결과 */
  sentiment: SentimentType
  /** 신뢰도 */
  confidence: number
  /** 감성 판단 이유 */
  reason: string
  /** 출처 LLM */
  llmSource: LLMType
}

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
 * 브랜드 언급 분석 (방법론 문서 Section 5.2)
 */
export interface BrandMentionDetail {
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

export interface BrandMentionAnalysis {
  myBrand: BrandMentionDetail | null
  competitors: BrandMentionDetail[]
  totalBrandMentions: number
}

/**
 * 브랜드-도메인 매핑 테이블
 * GPT에서 인용이 없을 때 브랜드 언급으로부터 도메인을 추론하기 위함
 */
export const BRAND_DOMAIN_MAP: Record<string, string[]> = {
  '메리츠화재': ['meritz.com', 'meritzfire.com', 'imeritz.com'],
  '삼성화재': ['samsungfire.com', 'samsung.com'],
  '현대해상': ['hi.co.kr', 'hyundaimarine.com'],
  '한화생명': ['hanwhalife.com', 'hanwha.com'],
  '교보생명': ['kyobo.co.kr', 'kyobolife.com'],
  'DB손해보험': ['idblife.com', 'dbinsurance.co.kr'],
  'KB손해보험': ['kbinsure.co.kr', 'kbdirect.com'],
  '흥국생명': ['heungkuklife.co.kr'],
  '동양생명': ['myangel.co.kr', 'tongyang.co.kr'],
  '미래에셋생명': ['miraeassetlife.com'],
  '라이나생명': ['lina.co.kr', 'linalife.co.kr'],
  'NH농협생명': ['nhlife.co.kr'],
  '신한라이프': ['shinhanlife.co.kr'],
  'AIA생명': ['aia.co.kr'],
  '처브라이프': ['chubb.com'],
  '하나생명': ['hanalife.co.kr'],
  '롯데손해보험': ['lotteins.co.kr'],
  'MG손해보험': ['mggeneralins.com'],
  '악사손해보험': ['axa.co.kr'],
  '캐롯손해보험': ['carrotins.com'],
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
 * 경쟁사 브랜드 타입
 */
export interface CompetitorBrand {
  name: string
  aliases: string[]
  domain?: string // 경쟁사 도메인 (선택적, 텍스트 기반 폴백 시 도메인 추론에 사용)
}

export interface AnalyzeRequest {
  query: string
  domain?: string
  brand?: string
  brandAliases?: string[] // 브랜드 별칭 목록
  competitors?: CompetitorBrand[] // 사용자 입력 경쟁사 목록
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
