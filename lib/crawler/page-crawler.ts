/**
 * Page Crawler Orchestrator
 * 여러 URL 크롤링 오케스트레이션
 */

import type { PageCrawlResult } from '@/types/pageCrawl'
import type { LLMResult } from '@/types'

export interface CrawlProgress {
  stage: 'extracting' | 'checking_robots' | 'crawling' | 'completed'
  current: number
  total: number
  percentage: number
}

export type CrawlProgressCallback = (progress: CrawlProgress) => void

/**
 * LLM 분석 결과에서 인용된 URL 추출
 */
export function extractUrlsFromResults(results: {
  perplexity: LLMResult | null
  chatgpt: LLMResult | null
  gemini: LLMResult | null
  claude: LLMResult | null
}): string[] {
  const urls: string[] = []

  // 각 LLM 결과에서 citations 추출
  const llms = [results.perplexity, results.chatgpt, results.gemini, results.claude]

  for (const llm of llms) {
    if (!llm || !llm.citations) continue

    for (const citation of llm.citations) {
      if (citation.url) {
        urls.push(citation.url)
      }
    }
  }

  // 중복 제거
  return Array.from(new Set(urls))
}

/**
 * URL 크롤링 (배치 처리)
 */
export async function crawlPages(
  urls: string[],
  analysisId: string,
  onProgress?: CrawlProgressCallback
): Promise<PageCrawlResult[]> {
  // 1. URL 추출 및 중복 제거
  onProgress?.({
    stage: 'extracting',
    current: 0,
    total: urls.length,
    percentage: 0,
  })

  // 최대 10개씩 배치 처리
  const batches: string[][] = []
  for (let i = 0; i < urls.length; i += 10) {
    batches.push(urls.slice(i, i + 10))
  }

  // 2. robots.txt 사전 체크 (선택적)
  onProgress?.({
    stage: 'checking_robots',
    current: 0,
    total: urls.length,
    percentage: 10,
  })

  // 3. 배치별로 크롤링 수행
  const allResults: PageCrawlResult[] = []

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]

    onProgress?.({
      stage: 'crawling',
      current: batchIndex * 10,
      total: urls.length,
      percentage: 20 + (batchIndex / batches.length) * 70,
    })

    // API 호출
    const response = await fetch('/api/crawl-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: batch,
        analysisId,
      }),
    })

    if (!response.ok) {
      console.error(`Batch ${batchIndex} failed:`, response.statusText)
      continue
    }

    const result = await response.json()
    allResults.push(...(result.results || []))
  }

  onProgress?.({
    stage: 'completed',
    current: urls.length,
    total: urls.length,
    percentage: 100,
  })

  return allResults
}

/**
 * 크롤링 결과 요약
 */
export function summarizeCrawlResults(results: PageCrawlResult[]): {
  total: number
  success: number
  failed: number
  blocked: number
  successRate: number
} {
  const total = results.length
  const success = results.filter((r) => r.status === 'success').length
  const blocked = results.filter((r) => r.status === 'blocked_robots').length
  const failed = results.filter((r) => r.status === 'failed').length

  return {
    total,
    success,
    failed,
    blocked,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
  }
}

/**
 * 내 도메인과 경쟁사 도메인 분리
 */
export function categorizeCrawlResults(
  results: PageCrawlResult[],
  myDomain?: string
): {
  myPages: PageCrawlResult[]
  competitorPages: PageCrawlResult[]
} {
  if (!myDomain) {
    return {
      myPages: [],
      competitorPages: results,
    }
  }

  const myPages = results.filter((r) => {
    try {
      const domain = new URL(r.url).hostname
      return domain === myDomain || domain.endsWith(`.${myDomain}`)
    } catch {
      return false
    }
  })

  const competitorPages = results.filter((r) => {
    try {
      const domain = new URL(r.url).hostname
      return domain !== myDomain && !domain.endsWith(`.${myDomain}`)
    } catch {
      return true
    }
  })

  return { myPages, competitorPages }
}
