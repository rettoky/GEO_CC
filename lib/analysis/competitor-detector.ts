/**
 * Competitor Auto-Detection Algorithm
 * LLM 검색 결과에서 경쟁사를 자동으로 감지
 */

import type { AnalysisResults, UnifiedCitation } from '@/types'
import type { CompetitorScore, DomainData, LLMAppearances } from '@/types/competitors'

// 제외할 generic 도메인
const EXCLUDED_DOMAINS = [
  'wikipedia.org',
  'en.wikipedia.org',
  'ko.wikipedia.org',
  'youtube.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'naver.com',
  'google.com',
  'reddit.com',
  'quora.com',
]

/**
 * LLM 결과에서 경쟁사 자동 감지
 *
 * 점수 계산 공식:
 * - 인용 빈도 점수: 40점 (인용 횟수 기반)
 * - LLM 다양성 점수: 30점 (몇 개 LLM이 언급했는지)
 * - 위치 점수: 20점 (평균 순위가 높을수록)
 * - 도메인 권위 점수: 10점 (TLD, 길이 기반 휴리스틱)
 */
export function detectCompetitors(
  results: AnalysisResults,
  myDomain?: string,
  maxCompetitors: number = 5
): CompetitorScore[] {
  const domainCounts = new Map<string, DomainData>()

  // 1. 모든 citation에서 도메인 추출
  for (const [llmName, result] of Object.entries(results)) {
    if (!result?.success || !result.citations) continue

    for (const citation of result.citations) {
      const domain = citation.domain

      // 자신의 도메인 제외
      if (myDomain && domain === myDomain) continue

      // Generic 도메인 제외
      if (EXCLUDED_DOMAINS.includes(domain)) continue

      const data = domainCounts.get(domain) || {
        count: 0,
        llms: new Set<string>(),
        positions: [],
      }

      data.count++
      data.llms.add(llmName)
      data.positions.push(citation.position)

      domainCounts.set(domain, data)
    }
  }

  // 2. 각 도메인 점수 계산
  const competitors = Array.from(domainCounts.entries()).map(
    ([domain, data]) => {
      // 인용 빈도 점수 (max 40점)
      // 10회 이상이면 만점
      const citationScore = Math.min((data.count / 10) * 40, 40)

      // LLM 다양성 점수 (max 30점)
      // 4개 LLM 모두에서 언급되면 만점
      const diversityScore = (data.llms.size / 4) * 30

      // 평균 위치 점수 (max 20점)
      // 1위면 20점, 10위면 0점
      const avgPos =
        data.positions.reduce((a, b) => a + b, 0) / data.positions.length
      const positionScore = Math.max(20 - avgPos * 2, 0)

      // 도메인 권위 점수 (간단한 휴리스틱, max 10점)
      const authorityScore = calculateAuthorityScore(domain)

      const competitorScore =
        citationScore + diversityScore + positionScore + authorityScore

      // 신뢰도 점수 (0-1)
      const confidenceScore = Math.min(competitorScore / 100, 1)

      return {
        domain,
        citationCount: data.count,
        llmDiversity: data.llms.size,
        avgPosition: Math.round(avgPos * 10) / 10, // 소수점 1자리
        competitorScore: Math.round(competitorScore),
        confidenceScore: Math.round(confidenceScore * 100) / 100,
      }
    }
  )

  // 3. 점수 순 정렬 및 상위 N개 반환
  return competitors
    .sort((a, b) => b.competitorScore - a.competitorScore)
    .slice(0, maxCompetitors)
}

/**
 * 도메인 권위 점수 계산 (간단한 휴리스틱)
 */
function calculateAuthorityScore(domain: string): number {
  let score = 5 // base score

  // TLD에 따른 점수
  if (domain.endsWith('.com')) score += 3
  else if (domain.endsWith('.co.kr')) score += 2
  else if (domain.endsWith('.kr')) score += 1
  else if (domain.endsWith('.net') || domain.endsWith('.org')) score += 1

  // 도메인 길이 (짧을수록 권위있다고 가정)
  const domainName = domain.split('.')[0]
  if (domainName.length <= 10) score += 2
  else if (domainName.length <= 15) score += 1

  return Math.min(score, 10)
}

/**
 * LLM별 경쟁사 출현 횟수 추출
 */
export function extractLLMAppearances(
  results: AnalysisResults,
  domain: string
): LLMAppearances {
  const appearances: LLMAppearances = {}

  for (const [llmName, result] of Object.entries(results)) {
    if (!result?.success || !result.citations) continue

    const count = result.citations.filter((c: UnifiedCitation) => c.domain === domain).length

    if (count > 0) {
      const llmKey = llmName as 'perplexity' | 'chatgpt' | 'gemini' | 'claude'
      appearances[llmKey] = count
    }
  }

  return appearances
}

/**
 * 경쟁사 브랜드명 추론 (도메인에서)
 */
export function inferBrandName(domain: string): string {
  // 간단한 휴리스틱: 도메인의 첫 부분을 대문자로
  const name = domain.split('.')[0]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * 경쟁사 인용률 계산
 */
export function calculateCitationRate(
  citationCount: number,
  totalQueries: number
): number {
  if (totalQueries === 0) return 0
  return Math.round((citationCount / totalQueries) * 100 * 100) / 100 // 소수점 2자리
}
