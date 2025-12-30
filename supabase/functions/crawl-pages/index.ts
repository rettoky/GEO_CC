/**
 * Crawl Pages Edge Function
 * HTML 페이지 크롤링 및 파싱 (Deno 환경)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  createClient,
  SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2'
import {
  DOMParser,
  Document,
  Element,
} from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

const USER_AGENT = 'GEOAnalyzer/1.0 (Educational Research Tool)'

interface CrawlRequest {
  urls: string[]
  analysisId: string
}

interface MetaTags {
  title?: string
  description?: string
  keywords?: string
  author?: string
  robots?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  canonical?: string
}

interface ContentStructure {
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
  hasProductInfo: boolean
  hasReviews: boolean
}

interface CrawlResult {
  url: string
  status: string
  metaTags?: MetaTags
  contentStructure?: ContentStructure
}

serve(async (req) => {
  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { urls, analysisId } = (await req.json()) as CrawlRequest

    // 입력 검증
    if (!urls || urls.length === 0 || urls.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid URLs. Must provide 1-10 URLs' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!analysisId) {
      return new Response(
        JSON.stringify({ error: 'analysisId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 각 URL 크롤링 (병렬 처리)
    const results = await Promise.allSettled(
      urls.map((url) => crawlSinglePage(url, analysisId, supabase))
    )

    const crawlResults = results.map((result, index) => ({
      url: urls[index],
      status: result.status === 'fulfilled' ? 'success' : 'failed',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? String(result.reason) : null,
    }))

    return new Response(JSON.stringify({ results: crawlResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in crawl-pages:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * 단일 페이지 크롤링
 */
async function crawlSinglePage(
  url: string,
  analysisId: string,
  supabase: SupabaseClient
): Promise<CrawlResult> {
  const domain = new URL(url).hostname

  // 1. robots.txt 체크
  const robotsAllowed = await checkRobotsTxt(url)

  if (!robotsAllowed) {
    await supabase.from('page_crawls').insert({
      analysis_id: analysisId,
      url,
      domain,
      crawl_status: 'blocked_robots',
      robots_txt_allowed: false,
      error_message: 'Blocked by robots.txt',
    })

    return { url, status: 'blocked_robots' }
  }

  // 2. HTML 페칭 (30초 타임아웃)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Content-Length 체크 (5MB 제한)
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      throw new Error('Content too large (>5MB)')
    }

    const html = await response.text()

    // 3. HTML 파싱
    const doc = new DOMParser().parseFromString(html, 'text/html')

    if (!doc) {
      throw new Error('HTML parsing failed')
    }

    // 4. 메타태그 추출
    const metaTags = extractMetaTags(doc)

    // 5. Schema 마크업 추출
    const schemaMarkup = extractSchemaMarkup(doc)

    // 6. 콘텐츠 구조 분석
    const contentStructure = analyzeContentStructure(doc)

    // 7. DB 저장
    await supabase.from('page_crawls').insert({
      analysis_id: analysisId,
      url,
      domain,
      crawl_status: 'success',
      html_content: html.slice(0, 50000), // 처음 50KB만 저장
      meta_tags: metaTags,
      schema_markup: schemaMarkup,
      content_structure: contentStructure,
      robots_txt_allowed: true,
      crawled_at: new Date().toISOString(),
    })

    return { url, status: 'success', metaTags, contentStructure }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

    // 실패 시 DB에 기록
    await supabase.from('page_crawls').insert({
      analysis_id: analysisId,
      url,
      domain,
      crawl_status: 'failed',
      error_message: errorMessage,
      robots_txt_allowed: true,
    })

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * robots.txt 체크
 */
async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const { origin, pathname } = new URL(url)
    const robotsUrl = `${origin}/robots.txt`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    })

    clearTimeout(timeout)

    // robots.txt가 없으면 허용
    if (!response.ok) return true

    const robotsTxt = await response.text()
    const lines = robotsTxt.split('\n')
    let isWildcard = false
    const disallowed: string[] = []

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase()

      if (trimmed.startsWith('user-agent: *')) {
        isWildcard = true
      } else if (trimmed.startsWith('user-agent:')) {
        isWildcard = false
      } else if (isWildcard && trimmed.startsWith('disallow:')) {
        const path = line.substring(line.indexOf(':') + 1).trim()
        if (path && path !== '/') {
          disallowed.push(path)
        }
      }
    }

    // disallowed 경로와 매치되는지 확인
    return !disallowed.some((path) => pathname.startsWith(path))
  } catch {
    // 에러 시 허용
    return true
  }
}

/**
 * 메타태그 추출
 */
function extractMetaTags(doc: Document): MetaTags {
  const meta: Partial<MetaTags> = {}

  // Title
  const titleEl = doc.querySelector('title')
  if (titleEl) {
    meta.title = titleEl.textContent?.trim() || null
  }

  // Meta tags
  const metaElements = doc.querySelectorAll('meta')
  for (const el of metaElements) {
    const name = el.getAttribute('name') || el.getAttribute('property')
    const content = el.getAttribute('content')

    if (name && content) {
      const nameLower = name.toLowerCase()
      if (nameLower === 'description') meta.description = content
      if (nameLower === 'keywords') meta.keywords = content
      if (nameLower === 'author') meta.author = content
      if (nameLower === 'robots') meta.robots = content
      if (nameLower === 'og:title') meta.ogTitle = content
      if (nameLower === 'og:description') meta.ogDescription = content
      if (nameLower === 'og:image') meta.ogImage = content
    }
  }

  // Canonical link
  const canonical = doc.querySelector('link[rel="canonical"]')
  if (canonical) {
    meta.canonical = canonical.getAttribute('href')
  }

  return meta
}

/**
 * Schema.org 마크업 추출
 */
function extractSchemaMarkup(doc: Document): unknown[] {
  const schemas: unknown[] = []

  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
  for (const script of scripts) {
    try {
      const content = script.textContent?.trim()
      if (content) {
        const schema = JSON.parse(content)
        schemas.push(schema)
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return schemas
}

/**
 * 콘텐츠 구조 분석
 */
function analyzeContentStructure(doc: Document): ContentStructure {
  const structure: ContentStructure = {
    headings: { h1: [], h2: [], h3: [] },
    wordCount: 0,
    paragraphCount: 0,
    imageCount: 0,
    linkCount: 0,
    hasTableOfContents: false,
    hasFAQ: false,
    hasProductInfo: false,
    hasReviews: false,
  }

  // Headings 추출
  doc.querySelectorAll('h1').forEach((h1: Element) => {
    const text = h1.textContent?.trim()
    if (text) structure.headings.h1.push(text)
  })
  doc.querySelectorAll('h2').forEach((h2: Element) => {
    const text = h2.textContent?.trim()
    if (text) structure.headings.h2.push(text)
  })
  doc.querySelectorAll('h3').forEach((h3: Element) => {
    const text = h3.textContent?.trim()
    if (text) structure.headings.h3.push(text)
  })

  // 콘텐츠 통계
  const bodyEl = doc.querySelector('body')
  const bodyText = bodyEl?.textContent || ''
  structure.wordCount = bodyText.split(/\s+/).filter((w: string) => w.length > 0)
    .length
  structure.paragraphCount = doc.querySelectorAll('p').length
  structure.imageCount = doc.querySelectorAll('img').length
  structure.linkCount = doc.querySelectorAll('a').length

  // 특수 요소 감지
  structure.hasTableOfContents = !!(
    doc.querySelector('[class*="toc"]') || doc.querySelector('[id*="toc"]')
  )
  structure.hasFAQ = !!(
    doc.querySelector('[itemtype*="FAQPage"]') ||
    doc.querySelector('[class*="faq"]') ||
    doc.querySelector('[id*="faq"]')
  )

  // FAQ 개수
  if (structure.hasFAQ) {
    structure.faqCount = doc.querySelectorAll(
      '[itemtype*="Question"], .faq-item, .faq-question'
    ).length
  }

  // 상품/리뷰 감지
  structure.hasProductInfo = !!doc.querySelector('[itemtype*="Product"]')
  structure.hasReviews = !!doc.querySelector('[itemtype*="Review"]')

  return structure
}
