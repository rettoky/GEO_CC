/**
 * Page Crawls Queries
 * 페이지 크롤링 결과 CRUD 함수
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  PageCrawl,
  CreatePageCrawlInput,
  CrawlStatus,
  MetaTags,
  ContentStructure,
} from '@/types/pageCrawl'

/**
 * 특정 분석에 속한 모든 페이지 크롤 조회
 */
export async function getPageCrawlsByAnalysisId(
  supabase: SupabaseClient,
  analysisId: string
): Promise<PageCrawl[]> {
  const { data, error } = await supabase
    .from('page_crawls')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 단일 페이지 크롤 조회
 */
export async function getPageCrawlById(
  supabase: SupabaseClient,
  id: string
): Promise<PageCrawl | null> {
  const { data, error } = await supabase
    .from('page_crawls')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * 페이지 크롤 생성
 */
export async function createPageCrawl(
  supabase: SupabaseClient,
  input: CreatePageCrawlInput
): Promise<PageCrawl> {
  const { data, error } = await supabase
    .from('page_crawls')
    .insert({
      analysis_id: input.analysis_id,
      url: input.url,
      domain: input.domain,
      crawl_status: input.crawl_status || 'pending',
      html_content: input.html_content || null,
      meta_tags: input.meta_tags || null,
      schema_markup: input.schema_markup || null,
      content_structure: input.content_structure || null,
      robots_txt_allowed: input.robots_txt_allowed ?? null,
      error_message: input.error_message || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 페이지 크롤 대량 생성
 */
export async function createPageCrawlsBulk(
  supabase: SupabaseClient,
  inputs: CreatePageCrawlInput[]
): Promise<PageCrawl[]> {
  const { data, error } = await supabase
    .from('page_crawls')
    .insert(
      inputs.map((input) => ({
        analysis_id: input.analysis_id,
        url: input.url,
        domain: input.domain,
        crawl_status: input.crawl_status || 'pending',
        html_content: input.html_content || null,
        meta_tags: input.meta_tags || null,
        schema_markup: input.schema_markup || null,
        content_structure: input.content_structure || null,
        robots_txt_allowed: input.robots_txt_allowed ?? null,
        error_message: input.error_message || null,
      }))
    )
    .select()

  if (error) throw error
  return data || []
}

/**
 * 페이지 크롤 업데이트
 */
export async function updatePageCrawl(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<PageCrawl, 'id' | 'analysis_id' | 'created_at'>>
): Promise<PageCrawl> {
  const { data, error } = await supabase
    .from('page_crawls')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 크롤링 결과 업데이트 (성공 케이스)
 */
export async function updatePageCrawlSuccess(
  supabase: SupabaseClient,
  id: string,
  result: {
    html_content?: string
    meta_tags: MetaTags
    schema_markup?: Record<string, unknown>[]
    content_structure: ContentStructure
    robots_txt_allowed: boolean
  }
): Promise<PageCrawl> {
  return updatePageCrawl(supabase, id, {
    crawl_status: 'success',
    html_content: result.html_content,
    meta_tags: result.meta_tags,
    schema_markup: result.schema_markup || [],
    content_structure: result.content_structure,
    robots_txt_allowed: result.robots_txt_allowed,
    crawled_at: new Date().toISOString(),
  })
}

/**
 * 크롤링 결과 업데이트 (실패 케이스)
 */
export async function updatePageCrawlFailure(
  supabase: SupabaseClient,
  id: string,
  errorMessage: string,
  status: 'failed' | 'blocked_robots' = 'failed'
): Promise<PageCrawl> {
  return updatePageCrawl(supabase, id, {
    crawl_status: status,
    error_message: errorMessage,
    crawled_at: new Date().toISOString(),
  })
}

/**
 * 페이지 크롤 삭제
 */
export async function deletePageCrawl(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('page_crawls').delete().eq('id', id)

  if (error) throw error
}

/**
 * 크롤 상태별 조회
 */
export async function getPageCrawlsByStatus(
  supabase: SupabaseClient,
  analysisId: string,
  status: CrawlStatus
): Promise<PageCrawl[]> {
  const { data, error } = await supabase
    .from('page_crawls')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('crawl_status', status)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 성공한 크롤만 조회
 */
export async function getSuccessfulPageCrawls(
  supabase: SupabaseClient,
  analysisId: string
): Promise<PageCrawl[]> {
  return getPageCrawlsByStatus(supabase, analysisId, 'success')
}

/**
 * 실패한 크롤만 조회
 */
export async function getFailedPageCrawls(
  supabase: SupabaseClient,
  analysisId: string
): Promise<PageCrawl[]> {
  const { data, error } = await supabase
    .from('page_crawls')
    .select('*')
    .eq('analysis_id', analysisId)
    .in('crawl_status', ['failed', 'blocked_robots'])
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * 도메인별 크롤 조회
 */
export async function getPageCrawlsByDomain(
  supabase: SupabaseClient,
  analysisId: string,
  domain: string
): Promise<PageCrawl[]> {
  const { data, error } = await supabase
    .from('page_crawls')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('domain', domain)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * URL로 크롤 조회 (중복 체크용)
 */
export async function getPageCrawlByUrl(
  supabase: SupabaseClient,
  analysisId: string,
  url: string
): Promise<PageCrawl | null> {
  const { data, error } = await supabase
    .from('page_crawls')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('url', url)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows found
    throw error
  }
  return data
}

/**
 * 페이지 크롤 통계 조회
 */
export async function getPageCrawlStats(
  supabase: SupabaseClient,
  analysisId: string
): Promise<{
  total: number
  pending: number
  success: number
  failed: number
  blocked: number
  avgWordCount: number
  avgImageCount: number
  crawledDomains: number
}> {
  const crawls = await getPageCrawlsByAnalysisId(supabase, analysisId)

  const pending = crawls.filter((c) => c.crawl_status === 'pending').length
  const success = crawls.filter((c) => c.crawl_status === 'success').length
  const failed = crawls.filter((c) => c.crawl_status === 'failed').length
  const blocked = crawls.filter((c) => c.crawl_status === 'blocked_robots').length

  const successCrawls = crawls.filter((c) => c.crawl_status === 'success')
  const avgWordCount =
    successCrawls.reduce((sum, c) => sum + (c.content_structure?.wordCount || 0), 0) /
    (successCrawls.length || 1)

  const avgImageCount =
    successCrawls.reduce((sum, c) => sum + (c.content_structure?.imageCount || 0), 0) /
    (successCrawls.length || 1)

  const uniqueDomains = new Set(crawls.map((c) => c.domain))

  return {
    total: crawls.length,
    pending,
    success,
    failed,
    blocked,
    avgWordCount: Math.round(avgWordCount),
    avgImageCount: Math.round(avgImageCount),
    crawledDomains: uniqueDomains.size,
  }
}

/**
 * 메타 태그 분석 결과 조회
 */
export async function getMetaTagsAnalysis(
  supabase: SupabaseClient,
  analysisId: string
): Promise<{
  hasTitle: number
  hasDescription: number
  hasOgTags: number
  hasSchemaMarkup: number
}> {
  const successCrawls = await getSuccessfulPageCrawls(supabase, analysisId)

  const hasTitle = successCrawls.filter((c) => c.meta_tags?.title).length
  const hasDescription = successCrawls.filter((c) => c.meta_tags?.description).length
  const hasOgTags = successCrawls.filter((c) => c.meta_tags?.ogTitle).length
  const hasSchemaMarkup = successCrawls.filter(
    (c) => c.schema_markup && c.schema_markup.length > 0
  ).length

  return {
    hasTitle,
    hasDescription,
    hasOgTags,
    hasSchemaMarkup,
  }
}
