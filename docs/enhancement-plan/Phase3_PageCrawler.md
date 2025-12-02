# Phase 3: 페이지 크롤러

**기간**: 2주차
**상태**: 📋 계획 완료
**의존성**: Phase 1 완료 필요

## 목표

인용된 URL의 실제 HTML 콘텐츠를 페칭하고, 메타태그, Schema.org 마크업, 콘텐츠 구조를 분석하여 경쟁사와의 페이지 구조 비교 기반을 마련합니다.

## 핵심 제약사항

- ✅ **robots.txt 존중** (윤리적 크롤링)
- ✅ 타임아웃: 30초/URL
- ✅ 속도 제한: 최대 10 URLs/요청
- ✅ Content-Length: 5MB 제한
- ✅ User-Agent: "GEOAnalyzer/1.0 (Educational Research Tool)"

## 작업 항목

### 1. robots.txt 체커

#### 파일: `lib/crawler/robots-checker.ts`

```typescript
export interface RobotsCheckResult {
  allowed: boolean
  reason?: string
  robotsTxt?: string
}

/**
 * robots.txt를 확인하여 크롤링 허용 여부 판단
 */
export async function isAllowedByRobots(url: string): Promise<RobotsCheckResult> {
  try {
    const { origin, pathname } = new URL(url)
    const robotsUrl = `${origin}/robots.txt`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GEOAnalyzer/1.0 (Educational Research Tool)'
      }
    })

    clearTimeout(timeout)

    // robots.txt가 없으면 허용
    if (!response.ok) {
      return { allowed: true, reason: 'No robots.txt found' }
    }

    const robotsTxt = await response.text()

    // 간단한 robots.txt 파싱
    const disallowedPaths = parseRobotsTxt(robotsTxt)

    // 현재 URL의 경로가 disallow 목록에 있는지 확인
    const isDisallowed = disallowedPaths.some(path =>
      pathname.startsWith(path)
    )

    if (isDisallowed) {
      return {
        allowed: false,
        reason: `Disallowed by robots.txt: ${pathname}`,
        robotsTxt
      }
    }

    return { allowed: true, robotsTxt }

  } catch (error) {
    // 에러 발생 시 관대하게 허용
    return { allowed: true, reason: `robots.txt check failed: ${error.message}` }
  }
}

function parseRobotsTxt(content: string): string[] {
  const lines = content.split('\n')
  const disallowedPaths: string[] = []
  let isWildcardSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('User-agent: *')) {
      isWildcardSection = true
    } else if (trimmed.startsWith('User-agent:')) {
      isWildcardSection = false
    } else if (isWildcardSection && trimmed.startsWith('Disallow:')) {
      const path = trimmed.split('Disallow:')[1].trim()
      if (path && path !== '/') {
        disallowedPaths.push(path)
      }
    }
  }

  return disallowedPaths
}
```

### 2. 페이지 Fetcher

#### 파일: `lib/crawler/page-fetcher.ts`

```typescript
import type { MetaTags, ContentStructure } from '@/types/pageCrawl'

export interface PageFetchResult {
  success: boolean
  url: string
  domain: string
  html?: string
  metaTags?: MetaTags
  schemaMarkup?: any[]
  contentStructure?: ContentStructure
  error?: string
  crawlStatus: 'success' | 'failed' | 'blocked_robots'
  robotsAllowed: boolean
}

export async function fetchPage(url: string): Promise<PageFetchResult> {
  const domain = new URL(url).hostname

  try {
    // 1. robots.txt 체크
    const robotsCheck = await isAllowedByRobots(url)

    if (!robotsCheck.allowed) {
      return {
        success: false,
        url,
        domain,
        error: robotsCheck.reason,
        crawlStatus: 'blocked_robots',
        robotsAllowed: false
      }
    }

    // 2. HTML 페칭 (30초 타임아웃)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GEOAnalyzer/1.0 (Educational Research Tool)',
        'Accept': 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return {
        success: false,
        url,
        domain,
        error: `HTTP ${response.status}: ${response.statusText}`,
        crawlStatus: 'failed',
        robotsAllowed: true
      }
    }

    // 3. Content-Length 체크
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return {
        success: false,
        url,
        domain,
        error: 'Content too large (>5MB)',
        crawlStatus: 'failed',
        robotsAllowed: true
      }
    }

    const html = await response.text()

    // 4. HTML 파싱은 Edge Function에서 수행 (Deno DOM)
    return {
      success: true,
      url,
      domain,
      html: html.slice(0, 50000), // 처음 50KB만 저장
      crawlStatus: 'success',
      robotsAllowed: true
    }

  } catch (error) {
    return {
      success: false,
      url,
      domain,
      error: error.message,
      crawlStatus: 'failed',
      robotsAllowed: true
    }
  }
}
```

### 3. Edge Function: crawl-pages

#### 파일: `supabase/functions/crawl-pages/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts'

interface CrawlRequest {
  urls: string[]
  analysisId: string
}

serve(async (req) => {
  try {
    const { urls, analysisId } = await req.json() as CrawlRequest

    if (!urls || urls.length === 0 || urls.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid URLs. Must provide 1-10 URLs' }),
        { status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    // 각 URL 크롤링
    const results = await Promise.allSettled(
      urls.map(url => crawlSinglePage(url, analysisId, supabase))
    )

    const crawlResults = results.map((result, index) => ({
      url: urls[index],
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }))

    return new Response(
      JSON.stringify({ results: crawlResults }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})

async function crawlSinglePage(url: string, analysisId: string, supabase: any) {
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
      error_message: 'Blocked by robots.txt'
    })

    return { url, status: 'blocked_robots' }
  }

  // 2. HTML 페칭
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GEOAnalyzer/1.0 (Educational Research Tool)',
        'Accept': 'text/html'
      }
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
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
      html_content: html.slice(0, 50000),
      meta_tags: metaTags,
      schema_markup: schemaMarkup,
      content_structure: contentStructure,
      robots_txt_allowed: true,
      crawled_at: new Date().toISOString()
    })

    return { url, status: 'success' }

  } catch (error) {
    await supabase.from('page_crawls').insert({
      analysis_id: analysisId,
      url,
      domain,
      crawl_status: 'failed',
      error_message: error.message,
      robots_txt_allowed: true
    })

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const { origin, pathname } = new URL(url)
    const robotsUrl = `${origin}/robots.txt`

    const response = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) return true

    const robotsTxt = await response.text()
    const lines = robotsTxt.split('\n')
    let isWildcard = false
    const disallowed: string[] = []

    for (const line of lines) {
      if (line.trim().startsWith('User-agent: *')) {
        isWildcard = true
      } else if (line.trim().startsWith('User-agent:')) {
        isWildcard = false
      } else if (isWildcard && line.trim().startsWith('Disallow:')) {
        const path = line.split('Disallow:')[1].trim()
        if (path) disallowed.push(path)
      }
    }

    return !disallowed.some(path => pathname.startsWith(path))

  } catch {
    return true
  }
}

function extractMetaTags(doc: any) {
  const meta: any = {}

  meta.title = doc.querySelector('title')?.textContent || null

  const metaElements = doc.querySelectorAll('meta')
  for (const el of metaElements) {
    const name = el.getAttribute('name') || el.getAttribute('property')
    const content = el.getAttribute('content')

    if (name && content) {
      if (name === 'description') meta.description = content
      if (name === 'keywords') meta.keywords = content
      if (name === 'author') meta.author = content
      if (name === 'og:title') meta.ogTitle = content
      if (name === 'og:description') meta.ogDescription = content
      if (name === 'og:image') meta.ogImage = content
    }
  }

  const canonical = doc.querySelector('link[rel="canonical"]')
  if (canonical) {
    meta.canonical = canonical.getAttribute('href')
  }

  return meta
}

function extractSchemaMarkup(doc: any) {
  const schemas: any[] = []

  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
  for (const script of scripts) {
    try {
      const schema = JSON.parse(script.textContent)
      schemas.push(schema)
    } catch {
      // Invalid JSON, skip
    }
  }

  return schemas
}

function analyzeContentStructure(doc: any) {
  const structure: any = {
    headings: { h1: [], h2: [], h3: [] }
  }

  // Headings
  doc.querySelectorAll('h1').forEach((h1: any) => {
    structure.headings.h1.push(h1.textContent?.trim())
  })
  doc.querySelectorAll('h2').forEach((h2: any) => {
    structure.headings.h2.push(h2.textContent?.trim())
  })
  doc.querySelectorAll('h3').forEach((h3: any) => {
    structure.headings.h3.push(h3.textContent?.trim())
  })

  // Counts
  const bodyText = doc.querySelector('body')?.textContent || ''
  structure.wordCount = bodyText.split(/\s+/).length
  structure.paragraphCount = doc.querySelectorAll('p').length
  structure.imageCount = doc.querySelectorAll('img').length
  structure.linkCount = doc.querySelectorAll('a').length

  // Special elements
  structure.hasTableOfContents = !!doc.querySelector('[class*="toc"], [id*="toc"]')
  structure.hasFAQ = !!doc.querySelector('[itemtype*="FAQPage"], [class*="faq"]')

  return structure
}
```

### 4. UI 컴포넌트

#### 파일: `components/page-analysis/CrawlResults.tsx`

```typescript
'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CheckCircle, XCircle, Ban } from 'lucide-react'
import type { PageCrawl } from '@/types/pageCrawl'

interface CrawlResultsProps {
  crawls: PageCrawl[]
}

export function CrawlResults({ crawls }: CrawlResultsProps) {
  const successCount = crawls.filter(c => c.crawl_status === 'success').length
  const blockedCount = crawls.filter(c => c.crawl_status === 'blocked_robots').length
  const failedCount = crawls.filter(c => c.crawl_status === 'failed').length

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="flex gap-4">
        <Badge variant="success">성공: {successCount}</Badge>
        <Badge variant="warning">차단: {blockedCount}</Badge>
        <Badge variant="destructive">실패: {failedCount}</Badge>
      </div>

      {/* 개별 결과 */}
      <div className="space-y-2">
        {crawls.map((crawl) => (
          <Card key={crawl.id} className="p-4">
            <div className="flex items-start gap-3">
              {/* 상태 아이콘 */}
              {crawl.crawl_status === 'success' && (
                <CheckCircle className="text-green-500 mt-1" />
              )}
              {crawl.crawl_status === 'blocked_robots' && (
                <Ban className="text-yellow-500 mt-1" />
              )}
              {crawl.crawl_status === 'failed' && (
                <XCircle className="text-red-500 mt-1" />
              )}

              <div className="flex-1">
                <div className="font-medium">{crawl.domain}</div>
                <div className="text-sm text-gray-500 truncate">{crawl.url}</div>

                {/* 성공 시 메타태그 표시 */}
                {crawl.meta_tags && (
                  <div className="mt-2 text-sm">
                    <div><strong>제목:</strong> {crawl.meta_tags.title}</div>
                    <div><strong>설명:</strong> {crawl.meta_tags.description}</div>
                  </div>
                )}

                {/* 에러 메시지 */}
                {crawl.error_message && (
                  <div className="mt-2 text-sm text-red-600">
                    {crawl.error_message}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

## 검증 방법

### 1. robots.txt 체커 테스트

```typescript
// test-robots.ts
import { isAllowedByRobots } from './lib/crawler/robots-checker'

const testUrls = [
  'https://www.google.com/',
  'https://www.google.com/search', // Disallowed
  'https://example.com/page'
]

for (const url of testUrls) {
  const result = await isAllowedByRobots(url)
  console.log(url, result.allowed ? '✅' : '❌', result.reason)
}
```

### 2. Edge Function 테스트

```bash
supabase functions serve crawl-pages

curl -X POST 'http://localhost:54321/functions/v1/crawl-pages' \
  -H 'Content-Type: application/json' \
  -d '{"urls":["https://example.com"],"analysisId":"test-id"}'
```

## 체크리스트

- [ ] `lib/crawler/robots-checker.ts` 생성
- [ ] `lib/crawler/page-fetcher.ts` 생성
- [ ] `supabase/functions/crawl-pages/index.ts` 생성
- [ ] `components/page-analysis/CrawlResults.tsx` 생성
- [ ] robots.txt 파싱 로직 테스트
- [ ] 다양한 사이트 크롤링 테스트
- [ ] 타임아웃 및 에러 핸들링 테스트
- [ ] DB 저장 확인

## 다음 단계

Phase 3 완료 후 → **Phase 4: 경쟁사 분석 강화**

---

**예상 소요 시간**: 3-4일
**난이도**: ⭐⭐⭐ (높음 - 크롤링 복잡도)
