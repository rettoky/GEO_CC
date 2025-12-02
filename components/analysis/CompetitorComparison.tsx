'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, TrendingDown, Minus } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { AnalysisResults } from '@/types'

interface CompetitorComparisonProps {
  results: AnalysisResults
  myDomain?: string
}

interface DomainStats {
  domain: string
  citationCount: number
  llmCount: number
  isMyDomain: boolean
}

/**
 * 경쟁사 도메인 비교 분석
 */
export function CompetitorComparison({ results, myDomain }: CompetitorComparisonProps) {
  // 모든 도메인별 인용 수 집계
  const domainMap = new Map<string, { count: number; llms: Set<string> }>()

  Object.entries(results).forEach(([llm, result]) => {
    if (!result || !result.success) return

    result.citations.forEach((citation) => {
      const existing = domainMap.get(citation.domain) || { count: 0, llms: new Set() }
      existing.count += 1
      existing.llms.add(llm)
      domainMap.set(citation.domain, existing)
    })
  })

  // 도메인 통계 배열로 변환 및 정렬
  const domainStats: DomainStats[] = Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      citationCount: stats.count,
      llmCount: stats.llms.size,
      isMyDomain: myDomain ? domain === myDomain.toLowerCase().replace(/^www\./, '') : false,
    }))
    .sort((a, b) => b.citationCount - a.citationCount)

  // 최대값 (상대적 비교용)
  const maxCitations = Math.max(...domainStats.map((d) => d.citationCount), 1)

  // 내 도메인 순위
  const myDomainRank = domainStats.findIndex((d) => d.isMyDomain) + 1
  const totalDomains = domainStats.length

  if (domainStats.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>도메인별 경쟁력 분석</span>
          {myDomain && myDomainRank > 0 && (
            <Badge variant={myDomainRank <= 3 ? 'default' : 'secondary'}>
              내 순위: {myDomainRank}/{totalDomains}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {domainStats.slice(0, 10).map((stat, index) => {
            const percentage = (stat.citationCount / maxCitations) * 100
            const rankIcon = index === 0 ? (
              <Trophy className="h-5 w-5 text-yellow-500" />
            ) : index === 1 ? (
              <Trophy className="h-5 w-5 text-gray-400" />
            ) : index === 2 ? (
              <Trophy className="h-5 w-5 text-orange-500" />
            ) : (
              <Minus className="h-5 w-5 text-gray-300" />
            )

            return (
              <div
                key={stat.domain}
                className={`p-4 rounded-lg border-2 ${
                  stat.isMyDomain
                    ? 'bg-blue-50 border-blue-400'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {rankIcon}
                    <span className="font-semibold text-sm">
                      {index + 1}위
                    </span>
                    <span className={`font-mono text-sm ${stat.isMyDomain ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
                      {stat.domain}
                    </span>
                    {stat.isMyDomain && (
                      <Badge variant="default" className="ml-2">내 도메인</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">인용 수</div>
                      <div className="text-lg font-bold">{stat.citationCount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">LLM 수</div>
                      <div className="text-lg font-bold">{stat.llmCount}/4</div>
                    </div>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })}

          {domainStats.length > 10 && (
            <div className="text-center text-sm text-muted-foreground pt-2">
              +{domainStats.length - 10}개 도메인 더 있음
            </div>
          )}

          {/* 분석 인사이트 */}
          {myDomain && myDomainRank > 0 && (
            <div className={`mt-6 p-4 rounded-lg ${
              myDomainRank === 1 ? 'bg-green-50 border border-green-200' :
              myDomainRank <= 3 ? 'bg-blue-50 border border-blue-200' :
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <h4 className="text-sm font-semibold mb-2">📊 경쟁력 분석</h4>
              <div className="text-sm space-y-1">
                {myDomainRank === 1 && (
                  <p className="text-green-700">
                    🏆 축하합니다! 현재 1위를 차지하고 있습니다. 이 우위를 유지하세요.
                  </p>
                )}
                {myDomainRank === 2 && (
                  <p className="text-blue-700">
                    🥈 2위입니다. 1위와의 격차를 줄이기 위해 콘텐츠 품질을 더 높여보세요.
                  </p>
                )}
                {myDomainRank === 3 && (
                  <p className="text-blue-700">
                    🥉 3위입니다. 상위권에 있습니다. 더 많은 고품질 콘텐츠로 순위를 높일 수 있습니다.
                  </p>
                )}
                {myDomainRank > 3 && myDomainRank <= totalDomains / 2 && (
                  <p className="text-yellow-700">
                    중위권입니다. SEO 최적화와 콘텐츠 개선으로 상위권 진입이 가능합니다.
                  </p>
                )}
                {myDomainRank > totalDomains / 2 && (
                  <p className="text-orange-700">
                    하위권입니다. 적극적인 SEO 전략과 고품질 콘텐츠 생산이 필요합니다.
                  </p>
                )}
                <p className="text-muted-foreground">
                  경쟁 도메인: {domainStats[0]?.domain} ({domainStats[0]?.citationCount}회 인용)
                  {myDomainRank > 1 && ` - 격차: ${domainStats[0]?.citationCount - (domainStats.find(d => d.isMyDomain)?.citationCount || 0)}회`}
                </p>
              </div>
            </div>
          )}

          {myDomain && myDomainRank === 0 && (
            <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200">
              <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ 경고</h4>
              <p className="text-sm text-red-700">
                현재 검색 결과에 귀하의 도메인이 포함되지 않았습니다. SEO 최적화가 시급합니다.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
