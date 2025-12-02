/**
 * Report Generator
 * 종합 보고서 데이터 집계
 */

import type { AnalysisResults } from '@/types'
import type { Competitor } from '@/types/competitors'
import type { PageCrawlData } from '@/types/pageCrawl'

export interface ReportSummary {
  totalCitations: number
  myDomainRank: number | null
  totalDomains: number
  llmCoverage: {
    llm: string
    cited: boolean
    citationCount: number
  }[]
  avgPosition: number | null
}

export interface LLMAnalysis {
  llm: string
  cited: boolean
  citationCount: number
  citations: Array<{
    domain: string
    url: string
    position: number
    snippet: string
  }>
  avgPosition: number | null
}

export interface CompetitorComparison {
  rank: number
  domain: string
  brandName?: string
  citationCount: number
  citationRate: number
  isMyDomain: boolean
  llmBreakdown: {
    llm: string
    citations: number
  }[]
}

export interface RecommendationItem {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  actionItems: string[]
}

export interface ComprehensiveReport {
  generatedAt: Date
  query: string
  myDomain?: string
  summary: ReportSummary
  llmAnalyses: LLMAnalysis[]
  competitorComparisons: CompetitorComparison[]
  crawlInsights: {
    totalPages: number
    successfulCrawls: number
    avgLoadTime: number
    structureIssues: string[]
  } | null
  recommendations: RecommendationItem[]
}

/**
 * 보고서 요약 생성
 */
export function generateReportSummary(
  results: AnalysisResults,
  myDomain?: string,
  competitors: Competitor[] = []
): ReportSummary {
  const llms = ['Perplexity', 'ChatGPT', 'Gemini', 'Claude']

  // 전체 인용 횟수 계산
  let totalCitations = 0
  let myDomainCitations = 0
  let myDomainPositions: number[] = []

  const llmCoverage = llms.map((llmName) => {
    const llmKey = llmName.toLowerCase() as keyof AnalysisResults
    const result = results[llmKey]

    if (!result?.success) {
      return { llm: llmName, cited: false, citationCount: 0 }
    }

    const myCitations = myDomain
      ? result.citations.filter((c) => c.domain === myDomain)
      : []

    if (myCitations.length > 0) {
      myDomainCitations += myCitations.length
      myDomainPositions.push(...myCitations.map((c) => c.position))
    }

    totalCitations += result.citations.length

    return {
      llm: llmName,
      cited: myCitations.length > 0,
      citationCount: myCitations.length,
    }
  })

  // 내 도메인 순위 계산
  const sortedCompetitors = [...competitors].sort(
    (a, b) => b.citation_count - a.citation_count
  )
  const myDomainRank = myDomain
    ? sortedCompetitors.findIndex((c) => c.domain === myDomain) + 1
    : null

  // 전체 도메인 수
  const allDomains = new Set<string>()
  for (const result of Object.values(results)) {
    if (result?.success) {
      result.citations.forEach((c) => allDomains.add(c.domain))
    }
  }

  // 평균 순위
  const avgPosition =
    myDomainPositions.length > 0
      ? myDomainPositions.reduce((a, b) => a + b, 0) / myDomainPositions.length
      : null

  return {
    totalCitations,
    myDomainRank: myDomainRank > 0 ? myDomainRank : null,
    totalDomains: allDomains.size,
    llmCoverage,
    avgPosition,
  }
}

/**
 * LLM별 분석 데이터 생성
 */
export function generateLLMAnalyses(
  results: AnalysisResults,
  myDomain?: string
): LLMAnalysis[] {
  const llms = ['Perplexity', 'ChatGPT', 'Gemini', 'Claude']

  return llms.map((llmName) => {
    const llmKey = llmName.toLowerCase() as keyof AnalysisResults
    const result = results[llmKey]

    if (!result?.success) {
      return {
        llm: llmName,
        cited: false,
        citationCount: 0,
        citations: [],
        avgPosition: null,
      }
    }

    const myCitations = myDomain
      ? result.citations.filter((c) => c.domain === myDomain)
      : result.citations.slice(0, 5) // 내 도메인 없으면 상위 5개

    const avgPosition =
      myCitations.length > 0
        ? myCitations.reduce((sum, c) => sum + c.position, 0) /
          myCitations.length
        : null

    return {
      llm: llmName,
      cited: myCitations.length > 0,
      citationCount: myCitations.length,
      citations: myCitations.map((c) => ({
        domain: c.domain,
        url: c.url,
        position: c.position,
        snippet: c.snippet || '',
      })),
      avgPosition,
    }
  })
}

/**
 * 경쟁사 비교 데이터 생성
 */
export function generateCompetitorComparisons(
  results: AnalysisResults,
  competitors: Competitor[],
  myDomain?: string
): CompetitorComparison[] {
  const llms = ['Perplexity', 'ChatGPT', 'Gemini', 'Claude']

  const sorted = [...competitors].sort(
    (a, b) => b.citation_count - a.citation_count
  )

  return sorted.map((comp, index) => {
    const llmBreakdown = llms.map((llmName) => {
      const llmKey = llmName.toLowerCase() as keyof AnalysisResults
      const result = results[llmKey]

      if (!result?.success) {
        return { llm: llmName, citations: 0 }
      }

      const citations = result.citations.filter((c) => c.domain === comp.domain)
        .length

      return { llm: llmName, citations }
    })

    return {
      rank: index + 1,
      domain: comp.domain,
      brandName: comp.brand_name || undefined,
      citationCount: comp.citation_count,
      citationRate: comp.citation_rate || 0,
      isMyDomain: comp.domain === myDomain,
      llmBreakdown,
    }
  })
}

/**
 * 크롤링 인사이트 생성
 */
export function generateCrawlInsights(crawlData: PageCrawlData[] | null) {
  if (!crawlData || crawlData.length === 0) {
    return null
  }

  const successful = crawlData.filter((d) => d.success)
  const totalPages = crawlData.length
  const successfulCrawls = successful.length

  const avgLoadTime =
    successful.length > 0
      ? successful.reduce((sum, d) => sum + (d.load_time_ms || 0), 0) /
        successful.length
      : 0

  const structureIssues: string[] = []

  // 구조 문제 감지
  const missingTitle = successful.filter((d) => !d.structured_data?.title).length
  const missingMeta = successful.filter(
    (d) => !d.structured_data?.meta_description
  ).length
  const missingHeadings = successful.filter(
    (d) => !d.structured_data?.headings?.h1?.length
  ).length

  if (missingTitle > 0) {
    structureIssues.push(`${missingTitle}개 페이지에 제목 누락`)
  }
  if (missingMeta > 0) {
    structureIssues.push(`${missingMeta}개 페이지에 메타 설명 누락`)
  }
  if (missingHeadings > 0) {
    structureIssues.push(`${missingHeadings}개 페이지에 H1 태그 누락`)
  }

  return {
    totalPages,
    successfulCrawls,
    avgLoadTime: Math.round(avgLoadTime),
    structureIssues,
  }
}

/**
 * 개선 권장사항 생성
 */
export function generateRecommendations(
  summary: ReportSummary,
  llmAnalyses: LLMAnalysis[],
  crawlInsights: ReturnType<typeof generateCrawlInsights>
): RecommendationItem[] {
  const recommendations: RecommendationItem[] = []

  // LLM 커버리지 분석
  const notCitedLLMs = summary.llmCoverage.filter((llm) => !llm.cited)
  if (notCitedLLMs.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'LLM 최적화',
      title: `${notCitedLLMs.length}개 LLM에서 미노출`,
      description: `${notCitedLLMs.map((l) => l.llm).join(', ')}에서 귀하의 도메인이 인용되지 않았습니다.`,
      actionItems: [
        'LLM별 선호하는 콘텐츠 형식 분석',
        '구조화된 데이터(Schema.org) 추가',
        '권위 있는 사이트로부터 백링크 확보',
      ],
    })
  }

  // 순위 분석
  if (summary.myDomainRank && summary.myDomainRank > 3) {
    recommendations.push({
      priority: 'high',
      category: '순위 개선',
      title: `현재 순위: ${summary.myDomainRank}위`,
      description: '경쟁사 대비 인용 횟수가 낮습니다.',
      actionItems: [
        '상위 경쟁사의 콘텐츠 전략 분석',
        '고품질 롱폼 콘텐츠 제작',
        '전문성과 신뢰도를 높이는 콘텐츠 업데이트',
      ],
    })
  }

  // 크롤링 문제
  if (crawlInsights && crawlInsights.structureIssues.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: '기술적 SEO',
      title: '페이지 구조 개선 필요',
      description: crawlInsights.structureIssues.join(', '),
      actionItems: [
        '모든 페이지에 고유한 title 태그 추가',
        '메타 설명을 150-160자로 최적화',
        '각 페이지에 명확한 H1 태그 사용',
      ],
    })
  }

  // 평균 위치 분석
  if (summary.avgPosition && summary.avgPosition > 5) {
    recommendations.push({
      priority: 'medium',
      category: '콘텐츠 품질',
      title: '평균 인용 순위 낮음',
      description: `평균 ${summary.avgPosition.toFixed(1)}번째 위치에서 인용됩니다.`,
      actionItems: [
        '답변 중심의 명확한 콘텐츠 구성',
        'FAQ 섹션 추가',
        '최신 정보로 콘텐츠 업데이트',
      ],
    })
  }

  // 도메인 다양성
  if (summary.totalDomains < 5) {
    recommendations.push({
      priority: 'low',
      category: '경쟁 환경',
      title: '경쟁 도메인 수 적음',
      description: '이 주제에서는 경쟁이 적습니다. 선점 기회입니다.',
      actionItems: [
        '관련 키워드로 콘텐츠 확장',
        '주제 권위를 확립하기 위한 시리즈 콘텐츠 제작',
        '다양한 쿼리 변형에 대응하는 콘텐츠 작성',
      ],
    })
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

/**
 * 종합 보고서 생성
 */
export function generateComprehensiveReport(
  results: AnalysisResults,
  query: string,
  myDomain?: string,
  competitors: Competitor[] = [],
  crawlData: PageCrawlData[] | null = null
): ComprehensiveReport {
  const summary = generateReportSummary(results, myDomain, competitors)
  const llmAnalyses = generateLLMAnalyses(results, myDomain)
  const competitorComparisons = generateCompetitorComparisons(
    results,
    competitors,
    myDomain
  )
  const crawlInsights = generateCrawlInsights(crawlData)
  const recommendations = generateRecommendations(
    summary,
    llmAnalyses,
    crawlInsights
  )

  return {
    generatedAt: new Date(),
    query,
    myDomain,
    summary,
    llmAnalyses,
    competitorComparisons,
    crawlInsights,
    recommendations,
  }
}
