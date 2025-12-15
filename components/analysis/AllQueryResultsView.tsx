'use client'

import { useState, useMemo, useRef, useImperativeHandle, forwardRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  BarChart3,
  List,
} from 'lucide-react'
import type { AnalysisResults, AnalysisSummary, LLMType } from '@/types'
import { ACTIVE_LLMS } from '@/lib/constants/labels'

interface QueryAnalysisResult {
  query: string
  queryType: 'base' | 'variation'
  variationType?: string
  results: AnalysisResults
  summary: AnalysisSummary
  error?: string
}

interface AllQueryResultsViewProps {
  allQueryResults: QueryAnalysisResult[]
  myDomain?: string
  myBrand?: string
}

export interface AllQueryResultsViewHandle {
  setFilterAndScroll: (filter: 'all' | 'myDomain' | 'brandMention') => void
  setCompetitorFilterAndScroll: (brandName: string, aliases: string[]) => void
}

/**
 * 텍스트에서 특정 키워드를 찾아 하이라이트 처리
 */
function highlightText(text: string, keywords: string[], highlightClass: string): React.ReactNode {
  if (!keywords.length || !text) return text

  // 키워드를 정규식으로 변환 (대소문자 무시)
  const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi')

  const parts = text.split(regex)

  return parts.map((part, index) => {
    const isMatch = keywords.some(k => k.toLowerCase() === part.toLowerCase())
    if (isMatch) {
      return (
        <span key={index} className={highlightClass}>
          {part}
        </span>
      )
    }
    return part
  })
}

const LLM_NAMES: Record<LLMType, string> = {
  perplexity: 'Perplexity',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}

const LLM_COLORS: Record<LLMType, string> = {
  perplexity: 'bg-blue-500',
  chatgpt: 'bg-green-500',
  gemini: 'bg-purple-500',
  claude: 'bg-orange-500',
}

/**
 * 모든 쿼리 결과 보기 컴포넌트
 * 배치 분석의 모든 쿼리와 그 결과를 표시
 */
export const AllQueryResultsView = forwardRef<AllQueryResultsViewHandle, AllQueryResultsViewProps>(
  function AllQueryResultsView({
    allQueryResults,
    myDomain,
    myBrand,
  }, ref) {
  // 컴포넌트 ref
  const containerRef = useRef<HTMLDivElement>(null)

  // 단일 쿼리인 경우 기본적으로 펼침
  const isSingleQuery = allQueryResults.length === 1
  const [expandedQueries, setExpandedQueries] = useState<Set<number>>(
    isSingleQuery ? new Set([0]) : new Set()
  )
  // 단일 쿼리인 경우 상세 뷰를 기본으로
  const [viewMode, setViewMode] = useState<'list' | 'summary'>(isSingleQuery ? 'list' : 'summary')
  // 필터 상태
  const [filterMode, setFilterMode] = useState<'all' | 'myDomain' | 'brandMention' | 'competitor'>('all')
  // 경쟁사 브랜드 필터 상태
  const [competitorFilter, setCompetitorFilter] = useState<{ brandName: string; aliases: string[] } | null>(null)

  // 외부에서 호출 가능한 메서드 노출
  useImperativeHandle(ref, () => ({
    setFilterAndScroll: (filter: 'all' | 'myDomain' | 'brandMention') => {
      setFilterMode(filter)
      setCompetitorFilter(null) // 경쟁사 필터 초기화
      setViewMode('list') // 상세 뷰로 전환
      // 필터된 쿼리가 있는 경우 첫 번째 쿼리 펼침
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    },
    setCompetitorFilterAndScroll: (brandName: string, aliases: string[]) => {
      setFilterMode('competitor')
      setCompetitorFilter({ brandName, aliases })
      setViewMode('list') // 상세 뷰로 전환
      setExpandedQueries(new Set([0])) // 첫 번째 쿼리 펼침
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }))

  // 전체 인용 통계 계산
  const aggregatedStats = useMemo(() => {
    const llmTypes: LLMType[] = ACTIVE_LLMS
    const stats = {
      totalQueries: allQueryResults.length,
      successfulQueries: 0,
      totalCitations: 0,
      myDomainCitations: 0,
      myBrandMentions: 0,
      citationsByLLM: {} as Record<LLMType, number>,
      citationsByDomain: {} as Record<string, number>,
      llmSuccessRate: {} as Record<LLMType, { success: number; total: number }>,
    }

    llmTypes.forEach((llm) => {
      stats.citationsByLLM[llm] = 0
      stats.llmSuccessRate[llm] = { success: 0, total: 0 }
    })

    for (const result of allQueryResults) {
      if (!result.error) {
        stats.successfulQueries++
      }

      for (const llm of llmTypes) {
        const llmResult = result.results[llm]
        stats.llmSuccessRate[llm].total++

        if (llmResult?.success) {
          stats.llmSuccessRate[llm].success++
          const citations = llmResult.citations || []
          stats.citationsByLLM[llm] += citations.length
          stats.totalCitations += citations.length

          // 도메인별 인용 집계
          for (const citation of citations) {
            if (citation.domain) {
              stats.citationsByDomain[citation.domain] =
                (stats.citationsByDomain[citation.domain] || 0) + 1

              // 내 도메인 인용 체크 (부분 일치 - 서브도메인 포함)
              if (myDomain) {
                const normalizedCitationDomain = citation.domain.toLowerCase().replace(/^www\./, '')
                const normalizedMyDomain = myDomain.toLowerCase().replace(/^www\./, '')
                if (normalizedCitationDomain.includes(normalizedMyDomain) ||
                    normalizedMyDomain.includes(normalizedCitationDomain)) {
                  stats.myDomainCitations++
                }
              }
            }
          }
        }
      }

      // 브랜드 언급 집계
      if (result.summary?.brandMentioned) {
        stats.myBrandMentions += result.summary.brandMentionCount || 1
      }
    }

    return stats
  }, [allQueryResults, myDomain])

  // 상위 인용 도메인 추출
  const topDomains = useMemo(() => {
    return Object.entries(aggregatedStats.citationsByDomain)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
  }, [aggregatedStats.citationsByDomain])

  // 경쟁사 브랜드가 LLM 응답에 포함되어 있는지 확인
  const hasCompetitorMention = (result: QueryAnalysisResult, aliases: string[]): boolean => {
    const llmTypes: LLMType[] = ACTIVE_LLMS
    for (const llm of llmTypes) {
      const llmResult = result.results[llm]
      if (llmResult?.success && llmResult.answer) {
        const lowerAnswer = llmResult.answer.toLowerCase()
        for (const alias of aliases) {
          if (lowerAnswer.includes(alias.toLowerCase())) {
            return true
          }
        }
      }
    }
    return false
  }

  // 필터링된 쿼리 결과
  const filteredQueryResults = useMemo(() => {
    if (filterMode === 'all') {
      return allQueryResults.map((result, index) => ({ result, originalIndex: index }))
    } else if (filterMode === 'myDomain') {
      return allQueryResults
        .map((result, index) => ({ result, originalIndex: index }))
        .filter(({ result }) => result.summary?.myDomainCited)
    } else if (filterMode === 'competitor' && competitorFilter) {
      // 경쟁사 브랜드 필터링
      return allQueryResults
        .map((result, index) => ({ result, originalIndex: index }))
        .filter(({ result }) => hasCompetitorMention(result, competitorFilter.aliases))
    } else {
      // brandMention
      return allQueryResults
        .map((result, index) => ({ result, originalIndex: index }))
        .filter(({ result }) => result.summary?.brandMentioned)
    }
  }, [allQueryResults, filterMode, competitorFilter])

  const toggleQuery = (index: number) => {
    const newExpanded = new Set(expandedQueries)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedQueries(newExpanded)
  }

  const expandAll = () => {
    setExpandedQueries(new Set(filteredQueryResults.map((_, i) => i)))
  }

  const collapseAll = () => {
    setExpandedQueries(new Set())
  }

  const handleFilterClick = (filter: 'all' | 'myDomain' | 'brandMention') => {
    setFilterMode(filter)
    setCompetitorFilter(null) // 경쟁사 필터 초기화
    setViewMode('list') // 필터링 시 리스트 뷰로 전환
    // 필터링 후 첫 번째 항목 펼치기
    if (filter !== 'all') {
      setExpandedQueries(new Set([0]))
    }
  }

  const clearCompetitorFilter = () => {
    setFilterMode('all')
    setCompetitorFilter(null)
  }

  if (allQueryResults.length === 0) {
    return null
  }

  return (
    <Card ref={containerRef} className="border-none shadow-md" id="all-query-results">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6 text-primary" />
            {isSingleQuery ? 'LLM 분석 결과' : '전체 쿼리 분석 결과'}
            {!isSingleQuery && (
              <Badge variant="secondary">{allQueryResults.length}개 쿼리</Badge>
            )}
          </CardTitle>
          {!isSingleQuery && (
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'summary')}>
                <TabsList className="h-8">
                  <TabsTrigger value="summary" className="text-xs px-2 h-6">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    요약
                  </TabsTrigger>
                  <TabsTrigger value="list" className="text-xs px-2 h-6">
                    <List className="h-3 w-3 mr-1" />
                    상세
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {isSingleQuery
            ? '각 LLM의 응답과 인용 출처를 확인하세요'
            : '모든 쿼리의 LLM 응답과 인용 출처를 확인하세요'
          }
        </p>
      </CardHeader>
      <CardContent>
        {viewMode === 'summary' ? (
          <div className="space-y-6">
            {/* 종합 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => handleFilterClick('all')}
              >
                <p className="text-2xl font-bold text-primary">
                  {aggregatedStats.successfulQueries}/{aggregatedStats.totalQueries}
                </p>
                <p className="text-xs text-muted-foreground">성공 쿼리</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{aggregatedStats.totalCitations}</p>
                <p className="text-xs text-muted-foreground">총 인용</p>
              </div>
              <div
                className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => handleFilterClick('myDomain')}
              >
                <p className="text-2xl font-bold text-green-600">
                  {aggregatedStats.myDomainCitations}
                </p>
                <p className="text-xs text-muted-foreground">내 도메인 인용 (클릭)</p>
              </div>
              <div
                className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => handleFilterClick('brandMention')}
              >
                <p className="text-2xl font-bold text-orange-600">
                  {aggregatedStats.myBrandMentions}
                </p>
                <p className="text-xs text-muted-foreground">브랜드 언급 (클릭)</p>
              </div>
            </div>

            {/* LLM별 성공률 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">LLM별 성공률 및 인용</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ACTIVE_LLMS.map((llm) => {
                  const rate = aggregatedStats.llmSuccessRate[llm]
                  const successRate =
                    rate.total > 0 ? Math.round((rate.success / rate.total) * 100) : 0
                  return (
                    <div
                      key={llm}
                      className="border rounded-lg p-3 flex flex-col items-center"
                    >
                      <div className={`w-2 h-2 rounded-full ${LLM_COLORS[llm]} mb-2`} />
                      <span className="text-sm font-medium">{LLM_NAMES[llm]}</span>
                      <span className="text-lg font-bold">{successRate}%</span>
                      <span className="text-xs text-muted-foreground">
                        {aggregatedStats.citationsByLLM[llm]}개 인용
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 상위 인용 도메인 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">상위 인용 도메인 (전체 쿼리 집계)</h4>
              <div className="space-y-2">
                {topDomains.map(([domain, count], index) => {
                  const isMyDomain =
                    myDomain && domain.toLowerCase().includes(myDomain.toLowerCase())
                  const percentage = Math.round(
                    (count / aggregatedStats.totalCitations) * 100
                  )
                  return (
                    <div
                      key={domain}
                      className={`flex items-center justify-between p-2 rounded ${
                        isMyDomain ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-slate-50 dark:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-5">
                          #{index + 1}
                        </span>
                        <span
                          className={`text-sm ${isMyDomain ? 'font-bold text-blue-600' : ''}`}
                        >
                          {domain}
                        </span>
                        {isMyDomain && (
                          <Badge variant="default" className="text-xs bg-blue-600">
                            내 도메인
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isMyDomain ? 'bg-blue-500' : 'bg-gray-400'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {count}회
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 필터 안내 및 펼치기/접기 버튼 */}
            {!isSingleQuery && (
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    모두 펼치기
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    모두 접기
                  </Button>
                </div>
                {filterMode !== 'all' && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={filterMode === 'competitor' ? 'bg-orange-100 text-orange-700' : ''}>
                      {filterMode === 'myDomain'
                        ? '내 도메인 인용 필터'
                        : filterMode === 'competitor' && competitorFilter
                        ? `${competitorFilter.brandName} 필터`
                        : '브랜드 언급 필터'}
                      ({filteredQueryResults.length}개)
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={filterMode === 'competitor' ? clearCompetitorFilter : () => handleFilterClick('all')}
                    >
                      필터 해제
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 쿼리 목록 */}
            <div className="space-y-2">
              {filteredQueryResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {filterMode === 'myDomain'
                    ? '내 도메인이 인용된 쿼리가 없습니다.'
                    : filterMode === 'competitor' && competitorFilter
                    ? `"${competitorFilter.brandName}" 브랜드가 언급된 쿼리가 없습니다.`
                    : '브랜드가 언급된 쿼리가 없습니다.'}
                </div>
              ) : (
                filteredQueryResults.map(({ result, originalIndex }, index) => {
                const isExpanded = expandedQueries.has(index)
                const llmTypes: LLMType[] = ACTIVE_LLMS
                const successCount = llmTypes.filter(
                  (llm) => result.results[llm]?.success
                ).length

                return (
                  <div
                    key={index}
                    className={`border rounded-lg overflow-hidden ${isSingleQuery ? 'border-0' : ''}`}
                  >
                    {/* 쿼리 헤더 - 단일 쿼리는 간소화 */}
                    {!isSingleQuery ? (
                      <div
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        onClick={() => toggleQuery(index)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm text-muted-foreground w-8">
                            #{originalIndex + 1}
                          </span>
                          <Badge
                            variant={result.queryType === 'base' ? 'default' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {result.queryType === 'base'
                              ? '기본'
                              : result.variationType || '변형'}
                          </Badge>
                          <span className="text-sm truncate">{result.query}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {successCount}/{ACTIVE_LLMS.length} LLM 성공
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* 펼침 상세 내용 */}
                    {isExpanded && (
                      <div className={`p-4 space-y-4 ${isSingleQuery ? '' : 'border-t'}`}>
                        {result.error ? (
                          <div className="text-red-500 text-sm">
                            오류: {result.error}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {llmTypes.map((llm) => {
                              const llmResult = result.results[llm]
                              const citations = llmResult?.citations || []
                              return (
                                <div
                                  key={llm}
                                  className="border rounded-lg p-3 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-2 h-2 rounded-full ${LLM_COLORS[llm]}`}
                                      />
                                      <span className="font-medium text-sm">
                                        {LLM_NAMES[llm]}
                                      </span>
                                    </div>
                                    {llmResult?.success ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                  </div>

                                  {llmResult?.success ? (
                                    <>
                                      {/* 응답 (전문 표시, 높이 증가) - 필터 모드에 따라 하이라이트 */}
                                      <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded p-2 overflow-y-auto whitespace-pre-wrap max-h-96">
                                        {filterMode === 'competitor' && competitorFilter
                                          ? highlightText(
                                              llmResult.answer || '응답 없음',
                                              competitorFilter.aliases,
                                              'font-bold text-orange-600 bg-orange-100 px-0.5 rounded'
                                            )
                                          : filterMode === 'brandMention' && myBrand
                                          ? highlightText(
                                              llmResult.answer || '응답 없음',
                                              result.summary?.brandMentionAnalysis?.myBrand?.aliases || [myBrand],
                                              'font-bold text-red-600'
                                            )
                                          : filterMode === 'myDomain' && myDomain
                                          ? highlightText(
                                              llmResult.answer || '응답 없음',
                                              [myDomain],
                                              'font-bold text-red-600'
                                            )
                                          : llmResult.answer || '응답 없음'}
                                      </div>

                                      {/* 인용 출처 */}
                                      {citations.length > 0 && (
                                        <div className="space-y-1">
                                          <p className="text-xs font-medium">
                                            인용 출처 ({citations.length}개)
                                          </p>
                                          <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {citations.map((citation, cidx) => {
                                              const normalizedCitationDomain = citation.domain?.toLowerCase().replace(/^www\./, '')
                                              const normalizedMyDomain = myDomain?.toLowerCase().replace(/^www\./, '')
                                              const isMyDomain =
                                                normalizedMyDomain &&
                                                normalizedCitationDomain &&
                                                (normalizedCitationDomain.includes(normalizedMyDomain) ||
                                                 normalizedMyDomain.includes(normalizedCitationDomain))
                                              // 내 도메인 필터 모드에서 하이라이트 적용
                                              const shouldHighlight = filterMode === 'myDomain' && isMyDomain
                                              return (
                                                <div
                                                  key={cidx}
                                                  className={`flex items-center gap-1 text-xs ${
                                                    shouldHighlight
                                                      ? 'text-red-600 font-bold bg-red-50 p-1 rounded'
                                                      : isMyDomain
                                                      ? 'text-blue-600 font-medium'
                                                      : 'text-muted-foreground'
                                                  }`}
                                                >
                                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                                  <span className="truncate">
                                                    {citation.domain || citation.url}
                                                  </span>
                                                  {isMyDomain && (
                                                    <Badge
                                                      variant="outline"
                                                      className={`text-[10px] px-1 py-0 ${
                                                        shouldHighlight ? 'border-red-400 text-red-600' : ''
                                                      }`}
                                                    >
                                                      내 도메인
                                                    </Badge>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-xs text-red-500">
                                      {llmResult?.error || '응답 실패'}
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* 쿼리별 요약 */}
                        {result.summary && (
                          <div className="flex gap-4 text-xs pt-2 border-t">
                            <span>
                              총 인용: <strong>{result.summary.totalCitations || 0}</strong>
                            </span>
                            <span>
                              내 도메인:{' '}
                              <strong
                                className={
                                  result.summary.myDomainCited ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {result.summary.myDomainCited ? '인용됨' : '미인용'}
                              </strong>
                            </span>
                            <span>
                              브랜드:{' '}
                              <strong
                                className={
                                  result.summary.brandMentioned ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {result.summary.brandMentioned
                                  ? `${result.summary.brandMentionCount}회`
                                  : '미언급'}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
