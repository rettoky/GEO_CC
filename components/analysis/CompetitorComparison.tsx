'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trophy, Minus, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2, XCircle, Link2, ChevronDown, ChevronUp } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { AnalysisResults, UnifiedCitation, CrossValidation, LLMType } from '@/types'
import { ACTIVE_LLMS } from '@/lib/constants/labels'

type SectionType = 'myDomain' | 'topCompetitors' | 'ranking' | 'recommendations' | 'all'

interface CompetitorComparisonProps {
  results: AnalysisResults
  myDomain?: string
  crossValidation?: CrossValidation
  /** 표시할 섹션 선택 (기본값: 'all') */
  section?: SectionType
  /** 컴팩트 모드 (ranking 섹션에서 접기 기능 활성화) */
  compact?: boolean
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
export function CompetitorComparison({ results, myDomain, crossValidation, section = 'all', compact = false }: CompetitorComparisonProps) {
  // compact 모드에서 펼침/접힘 상태
  const [showAllRanking, setShowAllRanking] = useState(false)

  // 결과가 없으면 렌더링하지 않음
  if (!results || Object.keys(results).length === 0) {
    return null
  }

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

  // 도메인 매칭 함수 (서브도메인 고려)
  // store.meritzfire.com과 meritzfire.com이 같은 사이트로 인식되어야 함
  const isDomainMatch = (citedDomain: string, myDomain: string): boolean => {
    if (!myDomain) return false
    const cited = citedDomain.toLowerCase()
    const my = myDomain.toLowerCase()

    // 정확히 일치
    if (cited === my) return true

    // 서브도메인 관계 확인 (한쪽이 다른 쪽으로 끝나는 경우)
    // store.meritzfire.com → meritzfire.com 매칭
    // meritzfire.com → store.meritzfire.com 매칭
    if (cited.endsWith('.' + my) || my.endsWith('.' + cited)) return true

    return false
  }

  // 도메인 통계 배열로 변환 및 정렬
  const domainStats: DomainStats[] = Array.from(domainMap.entries())
    .map(([domain, stats]) => {
      const llmsArray = Array.from(stats.llms)
      const isMyDomain = normalizedMyDomain ? isDomainMatch(domain, normalizedMyDomain) : false
      const cv = cvMap.get(domain)
      const avgPosition = stats.positions.length > 0
        ? stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length
        : 0

      // 장단점 분석 (실제 결과값 기반)
      const strengths: string[] = []
      const weaknesses: string[] = []

      // 인용된 LLM 목록
      const citedLLMNames = llmsArray.map(llm => LLM_NAMES[llm] || llm)

      // 미인용 LLM 목록
      const notCitedLLMs = ACTIVE_LLMS.filter(llm => !llmsArray.includes(llm))
      const notCitedLLMNames = notCitedLLMs.map(llm => LLM_NAMES[llm] || llm)

      // === 강점 분석 ===

      // 1. 인용된 LLM 구체적으로 표시
      if (llmsArray.length > 0) {
        if (llmsArray.length >= 3) {
          strengths.push(`${citedLLMNames.join(', ')} 등 ${llmsArray.length}개 LLM에서 인용`)
        } else {
          strengths.push(`${citedLLMNames.join(', ')}에서 인용됨`)
        }
      }

      // 2. 인용 횟수 분석
      if (stats.count >= 5) {
        strengths.push(`높은 인용 빈도 (${stats.count}회)`)
      } else if (stats.count >= 3) {
        strengths.push(`양호한 인용 빈도 (${stats.count}회)`)
      }

      // 3. 인용 순위 분석
      if (avgPosition > 0 && avgPosition <= 2) {
        strengths.push(`상위 순위에 노출 (평균 ${avgPosition.toFixed(1)}위)`)
      } else if (avgPosition > 0 && avgPosition <= 3) {
        strengths.push(`상위권 노출 (평균 ${avgPosition.toFixed(1)}위)`)
      }

      // 4. 주요 LLM 노출
      if (llmsArray.includes('perplexity')) {
        strengths.push('Perplexity 검색에 노출 (트래픽 유입 가능)')
      }
      if (llmsArray.includes('chatgpt')) {
        strengths.push('ChatGPT에 노출 (높은 사용자층)')
      }

      // === 개선 필요 분석 ===

      // 1. 미인용 LLM 구체적으로 표시 (도메인 인용 기준)
      // 참고: 여기서 "미인용"은 도메인이 URL로 인용되지 않음을 의미
      // 브랜드 언급과는 별개 - 브랜드가 언급되어도 도메인이 인용되지 않을 수 있음
      if (notCitedLLMs.length > 0) {
        if (notCitedLLMs.length === 1) {
          weaknesses.push(`${notCitedLLMNames[0]} 도메인 미인용`)
        } else {
          weaknesses.push(`${notCitedLLMNames.join(', ')} 도메인 미인용`)
        }
      }

      // 2. 낮은 인용 빈도
      if (stats.count === 1) {
        weaknesses.push('인용 빈도 낮음 (1회) - 콘텐츠 품질 개선 필요')
      } else if (stats.count === 2) {
        weaknesses.push('인용 빈도 보통 (2회) - 추가 최적화 권장')
      }

      // 3. 낮은 인용 순위
      if (avgPosition > 5) {
        weaknesses.push(`하위 순위 노출 (평균 ${avgPosition.toFixed(1)}위) - 경쟁력 강화 필요`)
      } else if (avgPosition > 3 && avgPosition <= 5) {
        weaknesses.push(`중위권 노출 (평균 ${avgPosition.toFixed(1)}위) - 상위 진입 여지 있음`)
      }

      // 4. 단일 LLM 의존
      if (llmsArray.length === 1) {
        weaknesses.push('단일 LLM 의존 - 다른 LLM 최적화로 노출 확대 필요')
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
                    <p className="text-sm text-gray-500">분석된 강점이 없습니다</p>
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

      {/* 상위 인용 도메인 */}
      {showTopCompetitors && topCompetitors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-indigo-500" />
              상위 인용 도메인
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              LLM이 답변에서 자주 인용하는 권위 있는 도메인입니다. 백링크/PR 전략에 활용하세요.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topCompetitors.map((domain, index) => (
                <div
                  key={domain.domain}
                  className="border rounded-lg p-4 bg-gradient-to-b from-gray-50 to-white"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <div>
                      <div className="font-mono text-sm font-semibold truncate max-w-[150px]">
                        {domain.domain}
                      </div>
                      <Badge className={GRADE_COLORS[domain.grade || 'C']} variant="secondary">
                        {domain.grade}등급
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">인용 횟수</span>
                      <span className="font-semibold">{domain.citationCount}회</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LLM 커버리지</span>
                      <span className="font-semibold">{domain.llmCount}/{ACTIVE_LLMS.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">평균 순위</span>
                      <span className="font-semibold">{domain.avgPosition.toFixed(1)}위</span>
                    </div>
                  </div>

                  {/* LLM 노출 현황 */}
                  <div className="mt-3 flex gap-1">
                    {ACTIVE_LLMS.map(llm => (
                      <Badge
                        key={llm}
                        variant={domain.llms.includes(llm) ? 'default' : 'outline'}
                        className={`text-xs ${domain.llms.includes(llm) ? '' : 'opacity-30'}`}
                      >
                        {LLM_NAMES[llm]?.charAt(0)}
                      </Badge>
                    ))}
                  </div>

                  {/* 내 도메인과 비교 */}
                  {myDomainStats && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground mb-1">vs 내 도메인</div>
                      <div className={`text-sm font-semibold ${domain.citationCount > myDomainStats.citationCount
                        ? 'text-red-600'
                        : 'text-green-600'
                        }`}>
                        {domain.citationCount > myDomainStats.citationCount
                          ? `+${domain.citationCount - myDomainStats.citationCount}회 더 인용됨`
                          : domain.citationCount < myDomainStats.citationCount
                            ? `${myDomainStats.citationCount - domain.citationCount}회 덜 인용됨`
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
      {showRanking && (() => {
        // compact 모드에서는 기본 5개만 표시, 그렇지 않으면 10개
        const defaultDisplayCount = compact ? 5 : 10
        // 펼쳤을 때는 모든 도메인 표시 (스크롤로 볼 수 있음)
        const displayCount = compact && !showAllRanking ? defaultDisplayCount : (compact ? domainStats.length : Math.min(domainStats.length, 10))
        const hiddenCount = domainStats.length - defaultDisplayCount

        // 도메인 항목 렌더링 함수
        const renderDomainItem = (stat: typeof domainStats[0], index: number) => {
          const percentage = (stat.citationCount / maxCitations) * 100
          const rankIcon = index === 0 ? (
            <Trophy className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-yellow-500`} />
          ) : index === 1 ? (
            <Trophy className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-gray-400`} />
          ) : index === 2 ? (
            <Trophy className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-orange-500`} />
          ) : (
            <Minus className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-gray-300`} />
          )

          return (
            <div
              key={stat.domain}
              className={`${compact ? 'p-2.5' : 'p-4'} rounded-lg border-2 transition-all ${stat.isMyDomain
                ? 'bg-blue-50 border-blue-400 shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className={`flex items-center justify-between ${compact ? 'mb-1.5' : 'mb-2'}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {rankIcon}
                  <span className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
                    {index + 1}위
                  </span>
                  <span className={`font-mono ${compact ? 'text-xs truncate max-w-[120px]' : 'text-sm'} ${stat.isMyDomain ? 'text-blue-700 font-bold' : 'text-gray-700'}`}>
                    {stat.domain}
                  </span>
                  {stat.isMyDomain && (
                    <Badge variant="default" className={compact ? 'text-xs py-0 px-1.5' : 'ml-2'}>내 도메인</Badge>
                  )}
                  <Badge className={`${GRADE_COLORS[stat.grade || 'C']} text-white ${compact ? 'text-xs py-0 px-1.5' : 'text-xs'}`}>
                    {stat.grade}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {compact ? (
                    // 컴팩트 모드: 간략한 정보 표시
                    <>
                      <span className="text-xs text-muted-foreground">{stat.citationCount}회</span>
                      <div className="flex gap-0.5">
                        {ACTIVE_LLMS.map(llm => (
                          <div
                            key={llm}
                            className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold ${stat.llms.includes(llm)
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                              }`}
                            title={LLM_NAMES[llm]}
                          >
                            {LLM_NAMES[llm]?.charAt(0)}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    // 일반 모드: 상세 정보 표시
                    <>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">인용 수</div>
                        <div className="text-lg font-bold">{stat.citationCount}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">LLM 수</div>
                        <div className="text-lg font-bold">{stat.llmCount}/{ACTIVE_LLMS.length}</div>
                      </div>
                      <div className="flex gap-1">
                        {ACTIVE_LLMS.map(llm => (
                          <div
                            key={llm}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${stat.llms.includes(llm)
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                              }`}
                            title={LLM_NAMES[llm]}
                          >
                            {LLM_NAMES[llm]?.charAt(0)}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Progress value={percentage} className={compact ? 'h-1.5' : 'h-2'} />
            </div>
          )
        }

        return (
          <Card>
            <CardHeader className={compact ? 'pb-2' : ''}>
              <CardTitle className="flex items-center justify-between">
                <span className={compact ? 'text-base' : ''}>전체 도메인 순위</span>
                <Badge variant="outline">
                  총 {totalDomains}개 도메인
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {compact && showAllRanking ? (
                // 펼친 상태: 고정 높이 스크롤 영역
                <div>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2 pr-4">
                      {domainStats.map((stat, index) => renderDomainItem(stat, index))}
                    </div>
                  </ScrollArea>
                  {/* 접기 버튼 */}
                  <button
                    onClick={() => setShowAllRanking(false)}
                    className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:bg-gray-50 py-2 rounded-lg transition-colors mt-2"
                  >
                    접기 <ChevronUp className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                // 접힌 상태 또는 비-컴팩트 모드
                <div className={compact ? 'space-y-2' : 'space-y-3'}>
                  {domainStats.slice(0, displayCount).map((stat, index) => renderDomainItem(stat, index))}

                  {/* 더보기 버튼 */}
                  {compact && hiddenCount > 0 && (
                    <button
                      onClick={() => setShowAllRanking(true)}
                      className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:bg-gray-50 py-2 rounded-lg transition-colors"
                    >
                      {hiddenCount}개 더보기 <ChevronDown className="h-4 w-4" />
                    </button>
                  )}

                  {!compact && domainStats.length > 10 && (
                    <div className="text-center text-sm text-muted-foreground pt-2">
                      +{domainStats.length - 10}개 도메인 더 있음
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

    </div>
  )
}
