/**
 * Visualization Data Processor
 * 분석 결과를 차트에 맞게 가공
 */

import type { AnalysisResults } from '@/types'
import type { Competitor } from '@/types/competitors'

export interface BarChartData {
  categories: string[]
  series: {
    name: string
    data: number[]
    color: string
  }[]
}

export interface PieChartData {
  segments: {
    name: string
    value: number
    percentage: number
    color: string
    isMyDomain: boolean
  }[]
}

export interface HeatmapData {
  matrix: number[][] // [llmIndex][domainIndex]
  xLabels: string[] // LLMs
  yLabels: string[] // Domains
  colorScale: {
    min: number
    max: number
  }
}

export interface TableRow {
  llm: string
  domain: string
  brandName?: string
  citations: number
  position: number
  url: string
}

const COLORS = {
  myDomain: '#3b82f6', // blue-500
  competitor1: '#ef4444', // red-500
  competitor2: '#f59e0b', // amber-500
  competitor3: '#10b981', // emerald-500
  competitor4: '#8b5cf6', // violet-500
  competitor5: '#ec4899', // pink-500
}

/**
 * 막대 그래프 데이터 생성 (LLM별 인용 횟수 비교)
 */
export function generateBarChartData(
  results: AnalysisResults,
  myDomain?: string,
  competitors: Competitor[] = []
): BarChartData {
  const llms = ['Perplexity', 'ChatGPT', 'Gemini', 'Claude']

  // 내 도메인 데이터
  const myData = llms.map((llmName) => {
    const llmKey = llmName.toLowerCase() as keyof AnalysisResults
    const result = results[llmKey]
    if (!result?.success || !myDomain) return 0

    return result.citations.filter((c) => c.domain === myDomain).length
  })

  // 경쟁사 데이터 (상위 3개만)
  const competitorSeries = competitors.slice(0, 3).map((comp, index) => ({
    name: comp.brand_name || comp.domain,
    data: llms.map((llmName) => {
      const llmKey = llmName.toLowerCase() as keyof AnalysisResults
      const result = results[llmKey]
      if (!result?.success) return 0

      return result.citations.filter((c) => c.domain === comp.domain).length
    }),
    color: [COLORS.competitor1, COLORS.competitor2, COLORS.competitor3][index],
  }))

  return {
    categories: llms,
    series: [
      {
        name: myDomain || '내 도메인',
        data: myData,
        color: COLORS.myDomain,
      },
      ...competitorSeries,
    ],
  }
}

/**
 * 원형 차트 데이터 생성 (전체 인용 비율)
 */
export function generatePieChartData(
  results: AnalysisResults,
  myDomain?: string,
  competitors: Competitor[] = []
): PieChartData {
  const domainCounts: Record<string, number> = {}

  // 모든 인용 집계
  for (const result of Object.values(results)) {
    if (!result?.success) continue

    for (const citation of result.citations) {
      domainCounts[citation.domain] = (domainCounts[citation.domain] || 0) + 1
    }
  }

  const total = Object.values(domainCounts).reduce((a, b) => a + b, 0)

  if (total === 0) {
    return { segments: [] }
  }

  const segments = Object.entries(domainCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10) // 상위 10개만
    .map(([domain, count], index) => ({
      name: domain,
      value: count,
      percentage: Math.round((count / total) * 100 * 10) / 10, // 소수점 1자리
      color: domain === myDomain ? COLORS.myDomain : `hsl(${index * 36}, 70%, 50%)`,
      isMyDomain: domain === myDomain,
    }))

  return { segments }
}

/**
 * 히트맵 데이터 생성 (LLM × 도메인 교차 분석)
 */
export function generateHeatmapData(
  results: AnalysisResults,
  topDomains: string[]
): HeatmapData {
  const llmKeys = ['perplexity', 'chatgpt', 'gemini', 'claude'] as const

  const matrix: number[][] = llmKeys.map((llmKey) => {
    const result = results[llmKey]
    if (!result?.success) return new Array(topDomains.length).fill(0)

    return topDomains.map(
      (domain) => result.citations.filter((c) => c.domain === domain).length
    )
  })

  const allValues = matrix.flat().filter((v) => v > 0)

  return {
    matrix,
    xLabels: ['Perplexity', 'ChatGPT', 'Gemini', 'Claude'],
    yLabels: topDomains,
    colorScale: {
      min: allValues.length > 0 ? Math.min(...allValues) : 0,
      max: allValues.length > 0 ? Math.max(...allValues) : 10,
    },
  }
}

/**
 * 테이블 데이터 생성 (모든 인용 상세)
 */
export function generateTableData(results: AnalysisResults): TableRow[] {
  const rows: TableRow[] = []

  for (const [llm, result] of Object.entries(results)) {
    if (!result?.success) continue

    for (const citation of result.citations) {
      rows.push({
        llm: llm.charAt(0).toUpperCase() + llm.slice(1),
        domain: citation.domain,
        citations: 1,
        position: citation.position,
        url: citation.url,
      })
    }
  }

  return rows
}

/**
 * 경쟁사 순위 데이터 생성 (인용 횟수 기준 정렬)
 */
export function generateCompetitorRankingData(
  competitors: Competitor[],
  myDomain?: string
): Array<{
  rank: number
  domain: string
  brandName?: string
  citationCount: number
  citationRate: number
  isMyDomain: boolean
}> {
  const sorted = [...competitors].sort((a, b) => b.citation_count - a.citation_count)

  return sorted.map((comp, index) => ({
    rank: index + 1,
    domain: comp.domain,
    brandName: comp.brand_name || undefined,
    citationCount: comp.citation_count,
    citationRate: comp.citation_rate || 0,
    isMyDomain: comp.domain === myDomain,
  }))
}

/**
 * 상위 도메인 추출 (인용 횟수 기준)
 */
export function extractTopDomains(
  results: AnalysisResults,
  limit: number = 10
): string[] {
  const domainCounts: Record<string, number> = {}

  for (const result of Object.values(results)) {
    if (!result?.success) continue

    for (const citation of result.citations) {
      domainCounts[citation.domain] = (domainCounts[citation.domain] || 0) + 1
    }
  }

  return Object.entries(domainCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([domain]) => domain)
}
