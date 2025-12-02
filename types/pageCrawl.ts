/**
 * Page Crawl Types
 * 페이지 크롤링 및 콘텐츠 분석 관련 타입 정의
 */

export type CrawlStatus = 'pending' | 'success' | 'failed' | 'blocked_robots'

/**
 * 메타 태그 데이터
 */
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

/**
 * 콘텐츠 구조 분석 결과
 */
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

/**
 * 페이지 크롤링 엔티티
 */
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

/**
 * 페이지 크롤링 생성 입력
 */
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

/**
 * 페이지 크롤링 결과 (Edge Function 응답)
 */
export interface PageCrawlResult {
  url: string
  status: 'success' | 'failed' | 'blocked_robots'
  metaTags?: MetaTags
  schemaMarkup?: any[]
  contentStructure?: ContentStructure
  error?: string
}

/**
 * robots.txt 체크 결과
 */
export interface RobotsCheckResult {
  allowed: boolean
  reason?: string
  robotsTxt?: string
}
