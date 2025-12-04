'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Minus, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { AnalysisResults, UnifiedCitation, CrossValidation, LLMType } from '@/types'

type SectionType = 'myDomain' | 'topCompetitors' | 'ranking' | 'recommendations' | 'all'

interface CompetitorComparisonProps {
  results: AnalysisResults
  myDomain?: string
  crossValidation?: CrossValidation
  /** 표시할 섹션 선택 (기본값: 'all') */
  section?: SectionType
}

interface DomainStats {
  domain: string
  citationCount: number
  llmCount: number
  llms: LLMType[]
  isMyDomain: boolean
  grade: 'A' | 'B' | 'C' | 'D' | null
  reliability: number
  avgPosition: number
  strengths: string[]
  weaknesses: string[]
}

const LLM_NAMES: Record<string, string> = {
  perplexity: 'Perplexity',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-blue-500',
  C: 'bg-yellow-500',
  D: 'bg-red-500',
}

const GRADE_DESCRIPTIONS: Record<string, string> = {
  A: '매우 높은 신뢰도 (3+ LLM)',
  B: '높은 신뢰도 (2 LLM)',
  C: '보통 신뢰도 (1 LLM)',
  D: '낮은 신뢰도',
}

/**
 * 경쟁사 도메인 비교 분석 (강화된 버전)
 */
export function CompetitorComparison({ results, myDomain, crossValidation, section = 'all' }: CompetitorComparisonProps) {
  // 모든 도메인별 인용 수 집계
  const domainMap = new Map<string, {
    count: number
    llms: Set<LLMType>
    positions: number[]
  }>()

  Object.entries(results).forEach(([llm, result]) => {
    if (!result || !result.success) return

    result.citations.forEach((citation: UnifiedCitation, index: number) => {
      const existing = domainMap.get(citation.domain) || {
        count: 0,
        llms: new Set<LLMType>(),
        positions: []
      }
      existing.count += 1
      existing.llms.add(llm as LLMType)
      existing.positions.push(citation.position || index + 1)
      domainMap.set(citation.domain, existing)
    })
  })

  // CrossValidation 데이터 병합
  const cvMap = new Map<string, { grade: 'A' | 'B' | 'C' | 'D', reliability: number }>()
  if (crossValidation?.items) {
    crossValidation.items.forEach(item => {
      cvMap.set(item.domain, { grade: item.grade, reliability: item.reliability })
    })
  }

  // 정규화된 내 도메인
  const normalizedMyDomain = myDomain?.toLowerCase().replace(/^www\./, '')

  // 도메인 통계 배열로 변환 및 정렬
  const domainStats: DomainStats[] = Array.from(domainMap.entries())
    .map(([domain, stats]) => {
      const llmsArray = Array.from(stats.llms)
      const isMyDomain = normalizedMyDomain ? domain === normalizedMyDomain : false
      const cv = cvMap.get(domain)
      const avgPosition = stats.positions.length > 0
        ? stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length
        : 0

      // 장단점 분석
      const strengths: string[] = []
      const weaknesses: string[] = []

      // LLM 커버리지 분석
      if (llmsArray.length >= 3) {
        strengths.push('다수의 LLM에서 인용됨')
      } else if (llmsArray.length === 1) {
        weaknesses.push('단일 LLM에서만 인용됨')
      }

      // 인용 빈도 분석
      if (stats.count >= 5) {
        strengths.push('높은 인용 빈도')
      } else if (stats.count === 1) {
        weaknesses.push('낮은 인용 빈도')
      }

      // 인용 위치 분석
      if (avgPosition <= 2) {
        strengths.push('상위 순위에 인용됨')
      } else if (avgPosition > 5) {
        weaknesses.push('하위 순위에 인용됨')
      }

      // 특정 LLM 분석
      if (llmsArray.includes('perplexity') && llmsArray.includes('chatgpt')) {
        strengths.push('주요 AI 검색엔진에 노출')
      }

      if (!llmsArray.includes('gemini')) {
        weaknesses.push('Gemini 미노출')
      }

      return {
        domain,
        citationCount: stats.count,
        llmCount: llmsArray.length,
        llms: llmsArray,
        isMyDomain,
        grade: cv?.grade || (llmsArray.length >= 3 ? 'A' : llmsArray.length >= 2 ? 'B' : 'C'),
        reliability: cv?.reliability || (llmsArray.length >= 3 ? 95 : llmsArray.length >= 2 ? 80 : 60),
        avgPosition,
        strengths,
        weaknesses,
      }
    })
    .sort((a, b) => {
      // 1차: LLM 수 기준
      if (b.llmCount !== a.llmCount) return b.llmCount - a.llmCount
      // 2차: 인용 수 기준
      return b.citationCount - a.citationCount
    })

  // 최대값 (상대적 비교용)
  const maxCitations = Math.max(...domainStats.map((d) => d.citationCount), 1)

  // 내 도메인 정보
  const myDomainStats = domainStats.find((d) => d.isMyDomain)
  const myDomainRank = domainStats.findIndex((d) => d.isMyDomain) + 1
  const totalDomains = domainStats.length

  // 상위 경쟁자들 (내 도메인 제외)
  const topCompetitors = domainStats.filter(d => !d.isMyDomain).slice(0, 3)

  // 섹션 표시 여부 결정
  const showMyDomain = section === 'all' || section === 'myDomain'
  const showTopCompetitors = section === 'all' || section === 'topCompetitors'
  const showRanking = section === 'all' || section === 'ranking'
  const showRecommendations = section === 'all' || section === 'recommendations'

  if (domainStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>도메인별 경쟁력 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <p>인용된 도메인이 없습니다.</p>
            <p className="text-sm mt-2">LLM 응답에서 외부 소스가 인용되지 않았습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={section === 'all' ? 'space-y-6' : ''}>
      {/* 내 도메인 vs 경쟁사 요약 카드 */}
      {showMyDomain && myDomain && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              내 도메인 경쟁력 분석
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myDomainStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 현재 순위 */}
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-4xl font-bold text-blue-600">
                    {myDomainRank}위
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    전체 {totalDomains}개 도메인 중
                  </div>
                  <Badge
                    className={`mt-2 ${GRADE_COLORS[myDomainStats.grade || 'C']}`}
                  >
                    {myDomainStats.grade}등급 - {GRADE_DESCRIPTIONS[myDomainStats.grade || 'C']}
                  </Badge>
                </div>

                {/* 장점 */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4" />
                    강점
                  </h4>
                  {myDomainStats.strengths.length > 0 ? (
                    <ul className="space-y-1">
                      {myDomainStats.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-green-700 flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600">분석 중...</p>
                  )}
                  <div className="mt-3 text-xs text-green-600">
                    {myDomainStats.llms.map(llm => LLM_NAMES[llm]).join(', ')}에서 인용
                  </div>
                </div>

                {/* 약점 */}
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
                    <TrendingDown className="h-4 w-4" />
                    개선 필요
                  </h4>
                  {myDomainStats.weaknesses.length > 0 ? (
                    <ul className="space-y-1">
                      {myDomainStats.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-orange-700 flex items-center gap-2">
                          <XCircle className="h-3 w-3" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600">개선 필요 사항 없음!</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <h4 className="font-semibold text-red-800 mb-2">
                  도메인이 인용되지 않음
                </h4>
                <p className="text-sm text-red-700">
                  현재 검색 쿼리에서 <span className="font-mono">{myDomain}</span>이(가)
                  어떤 LLM에서도 인용되지 않았습니다.
                </p>
                <div className="mt-4 text-left bg-white p-4 rounded">
                  <h5 className="font-semibold text-sm mb-2">개선 권장사항:</h5>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• 해당 키워드에 대한 콘텐츠 품질 개선</li>
                    <li>• 구조화된 데이터(Schema.org) 적용</li>
                    <li>• E-E-A-T(경험, 전문성, 권위, 신뢰) 강화</li>
                    <li>• 관련 백링크 확보</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 상위 경쟁사 비교 */}
      {showTopCompetitors && topCompetitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              상위 경쟁사 분석
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topCompetitors.map((competitor, index) => (
                <div
                  key={competitor.domain}
                  className="border rounded-lg p-4 bg-gradient-to-b from-gray-50 to-white"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <div>
                      <div className="font-mono text-sm font-semibold truncate max-w-[150px]">
                        {competitor.domain}
                      </div>
                      <Badge className={GRADE_COLORS[competitor.grade || 'C']} variant="secondary">
                        {competitor.grade}등급
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">인용 횟수</span>
                      <span className="font-semibold">{competitor.citationCount}회</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LLM 커버리지</span>
                      <span className="font-semibold">{competitor.llmCount}/4</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">평균 순위</span>
                      <span className="font-semibold">{competitor.avgPosition.toFixed(1)}위</span>
                    </div>
                  </div>

                  {/* LLM 노출 현황 */}
                  <div className="mt-3 flex gap-1">
                    {(['perplexity', 'chatgpt', 'gemini', 'claude'] as LLMType[]).map(llm => (
                      <Badge
                        key={llm}
                        variant={competitor.llms.includes(llm) ? 'default' : 'outline'}
                        className={`text-xs ${competitor.llms.includes(llm) ? '' : 'opacity-30'}`}
                      >
                        {LLM_NAMES[llm]?.charAt(0)}
                      </Badge>
                    ))}
                  </div>

                  {/* 내 도메인과 비교 */}
                  {myDomainStats && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground mb-1">vs 내 도메인</div>
                      <div className={`text-sm font-semibold ${
                        competitor.citationCount > myDomainStats.citationCount
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {competitor.citationCount > myDomainStats.citationCount
                          ? `+${competitor.citationCount - myDomainStats.citationCount}회 더 인용됨`
                          : competitor.citationCount < myDomainStats.citationCount
                            ? `${myDomainStats.citationCount - competitor.citationCount}회 덜 인용됨`
                            : '동일한 인용 수'
                        }
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전체 도메인 순위 */}
      {showRanking && <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>전체 도메인 순위</span>
            <Badge variant="outline">
              총 {totalDomains}개 도메인
            </Badge>
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
                  className={`p-4 rounded-lg border-2 transition-all ${
                    stat.isMyDomain
                      ? 'bg-blue-50 border-blue-400 shadow-md'
                      : 'bg-white border-gray-200 hover:border-gray-300'
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
                      <Badge className={`${GRADE_COLORS[stat.grade || 'C']} text-white text-xs`}>
                        {stat.grade}
                      </Badge>
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
                      <div className="flex gap-1">
                        {(['perplexity', 'chatgpt', 'gemini', 'claude'] as LLMType[]).map(llm => (
                          <div
                            key={llm}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${
                              stat.llms.includes(llm)
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                            title={LLM_NAMES[llm]}
                          >
                            {LLM_NAMES[llm]?.charAt(0)}
                          </div>
                        ))}
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
          </div>
        </CardContent>
      </Card>}

      {/* GEO 최적화 권장사항 */}
      {showRecommendations && (
        <Card>
          <CardHeader>
            <CardTitle>GEO 최적화 권장사항</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 즉시 개선 가능 */}
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-3">즉시 적용 가능</h4>
                <ul className="space-y-2 text-sm text-green-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>메타 설명에 주요 키워드 포함</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>구조화된 FAQ 섹션 추가</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Schema.org 마크업 적용</span>
                  </li>
                </ul>
              </div>

              {/* 중장기 개선 */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-3">중장기 전략</h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>권위 있는 사이트로부터 백링크 확보</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>전문가 콘텐츠 및 연구 자료 발행</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>사용자 리뷰 및 평점 시스템 구축</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
