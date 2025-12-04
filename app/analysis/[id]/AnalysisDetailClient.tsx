'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  XCircle,
  Globe,
  Tag,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Search,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { LLMTabs } from '@/components/analysis/LLMTabs'
import { CitationDetailCard } from '@/components/analysis/CitationDetailCard'
import { AnswerView } from '@/components/analysis/AnswerView'
import { VisibilityDashboard } from '@/components/analysis/VisibilityDashboard'
import { LLMComparisonChart } from '@/components/analysis/LLMComparisonChart'
import { CompetitorComparison } from '@/components/analysis/CompetitorComparison'
import { LLMResultCard } from '@/components/analysis/LLMResultCard'
import { FinalReview } from '@/components/analysis/FinalReview'
import { BrandMentionCard } from '@/components/analysis/BrandMentionCard'
import type { Analysis } from '@/lib/supabase/types'
import type { LLMType, AnalysisResults, AnalysisSummary } from '@/types'

interface AnalysisDetailClientProps {
  analysis: Analysis
}

// 변형 타입 한국어 라벨
const variationTypeLabels: Record<string, string> = {
  demographic: '연령/성별',
  informational: '정보성',
  comparison: '비교',
  recommendation: '추천',
  base: '기본 쿼리',
}

// 쿼리 분석 결과 타입
interface QueryAnalysisResult {
  query: string
  queryType: 'base' | 'variation'
  variationType?: string
  results: AnalysisResults
  summary: AnalysisSummary
  error?: string
}

// 집계 메트릭 타입
interface AggregatedMetrics {
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  avgCitationRateByLLM: {
    perplexity: number
    chatgpt: number
    gemini: number
    claude: number
  }
  myDomainStats: {
    totalCitations: number
    queriesWithCitation: number
    citationRate: number
    byLLM: {
      perplexity: { cited: number; total: number }
      chatgpt: { cited: number; total: number }
      gemini: { cited: number; total: number }
      claude: { cited: number; total: number }
    }
  }
  brandMentionStats: {
    totalMentions: number
    queriesWithMention: number
    mentionRate: number
  }
  topCitedDomains: {
    domain: string
    count: number
    percentage: number
  }[]
  performanceByQueryType: {
    type: string
    avgCitationRate: number
    avgBrandMentionRate: number
    count: number
  }[]
}

// 시각화 데이터 타입
interface VisualizationData {
  summaryCards: {
    totalQueries: number
    successRate: number
    myDomainCitationRate: number
    brandMentionRate: number
    bestPerformingLLM: string
    topDomain: string
  }
  queryHeatmap: {
    index: number
    query: string
    queryType: string
    variationType?: string
    perplexity: number | null
    chatgpt: number | null
    gemini: number | null
    claude: number | null
    myDomainCited: boolean
    brandMentioned: boolean
  }[]
  topDomainsChart: {
    domain: string
    count: number
    percentage: number
  }[]
}

export function AnalysisDetailClient({ analysis }: AnalysisDetailClientProps) {
  const [selectedQueryIndex, setSelectedQueryIndex] = useState<number | null>(null)

  // 디버그: 원본 데이터 확인
  console.log('[AnalysisDetailClient] Analysis data:', {
    id: analysis.id,
    status: analysis.status,
    query_variations_count: analysis.query_variations_count,
    total_queries_analyzed: analysis.total_queries_analyzed,
    hasIntermediateResults: !!analysis.intermediate_results,
    hasCitationMetrics: !!analysis.citation_metrics,
    hasVisualizationData: !!analysis.visualization_data,
  })

  // 배치 분석 데이터 파싱
  const intermediateResults = analysis.intermediate_results as {
    allQueryResults?: QueryAnalysisResult[]
    baseQueryResult?: QueryAnalysisResult
    variationResults?: QueryAnalysisResult[]
  } | null

  const citationMetrics = analysis.citation_metrics as AggregatedMetrics | null
  const visualizationData = analysis.visualization_data as VisualizationData | null

  // 빈 객체 체크 헬퍼
  const isEmptyObject = (obj: unknown): boolean => {
    return obj === null || obj === undefined ||
           (typeof obj === 'object' && Object.keys(obj as object).length === 0)
  }

  console.log('[AnalysisDetailClient] Parsed data:', {
    intermediateResultsKeys: intermediateResults ? Object.keys(intermediateResults) : null,
    allQueryResultsLength: intermediateResults?.allQueryResults?.length || 0,
    citationMetricsKeys: citationMetrics ? Object.keys(citationMetrics) : null,
    visualizationDataKeys: visualizationData ? Object.keys(visualizationData) : null,
    isIntermediateResultsEmpty: isEmptyObject(intermediateResults),
    isCitationMetricsEmpty: isEmptyObject(citationMetrics),
    isVisualizationDataEmpty: isEmptyObject(visualizationData),
  })

  const allQueryResults = intermediateResults?.allQueryResults || []

  // 배치 분석 판별: allQueryResults가 있거나, 변형 개수가 있거나, 총 쿼리 수가 1보다 큰 경우
  const isBatchAnalysis =
    allQueryResults.length > 1 ||
    (analysis.query_variations_count && analysis.query_variations_count > 0) ||
    (analysis.total_queries_analyzed && analysis.total_queries_analyzed > 1)

  // 처리중 상태인 경우
  if (analysis.status === 'processing') {
    return (
      <div className="space-y-6">
        <Link href="/analysis">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            분석 이력으로 돌아가기
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">분석 진행 중...</h3>
            <p className="text-muted-foreground">
              {analysis.total_queries_analyzed || 1}개 쿼리를 분석하고 있습니다.
              <br />
              잠시 후 새로고침해 주세요.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              새로고침
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 실패 상태인 경우
  if (analysis.status === 'failed') {
    return (
      <div className="space-y-6">
        <Link href="/analysis">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            분석 이력으로 돌아가기
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="p-12 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">분석 실패</h3>
            <p className="text-muted-foreground">
              {analysis.error_message || '알 수 없는 오류가 발생했습니다.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 단일 분석인 경우
  if (!isBatchAnalysis) {
    return <SingleAnalysisView analysis={analysis} />
  }

  // 배치 분석인 경우 - 데이터가 없으면 안내 메시지
  if (allQueryResults.length === 0 && isEmptyObject(citationMetrics) && isEmptyObject(visualizationData)) {
    return (
      <div className="space-y-6">
        <Link href="/analysis">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            분석 이력으로 돌아가기
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">분석 데이터 없음</h3>
            <p className="text-muted-foreground">
              아직 분석 결과가 저장되지 않았습니다.
              <br />
              분석이 완료될 때까지 기다려 주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 배치 분석인 경우
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Link href="/analysis">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            분석 이력으로 돌아가기
          </Button>
        </Link>
        <Badge variant="outline" className="text-sm">
          {analysis.total_queries_analyzed || allQueryResults.length}개 쿼리 분석 완료
        </Badge>
      </div>

      {/* 종합 요약 카드 */}
      {visualizationData?.summaryCards && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryCard
            title="총 쿼리"
            value={visualizationData.summaryCards.totalQueries.toString()}
            icon={<Search className="h-4 w-4" />}
          />
          <SummaryCard
            title="성공률"
            value={`${visualizationData.summaryCards.successRate}%`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            variant={visualizationData.summaryCards.successRate >= 80 ? 'success' : 'warning'}
          />
          <SummaryCard
            title="내 도메인 인용률"
            value={`${visualizationData.summaryCards.myDomainCitationRate}%`}
            icon={<Globe className="h-4 w-4" />}
            variant={visualizationData.summaryCards.myDomainCitationRate > 50 ? 'success' : 'default'}
          />
          <SummaryCard
            title="브랜드 언급률"
            value={`${visualizationData.summaryCards.brandMentionRate}%`}
            icon={<Tag className="h-4 w-4" />}
            variant={visualizationData.summaryCards.brandMentionRate > 50 ? 'success' : 'default'}
          />
          <SummaryCard
            title="최고 성과 LLM"
            value={visualizationData.summaryCards.bestPerformingLLM}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <SummaryCard
            title="최다 인용 도메인"
            value={visualizationData.summaryCards.topDomain.length > 15
              ? visualizationData.summaryCards.topDomain.substring(0, 15) + '...'
              : visualizationData.summaryCards.topDomain}
            icon={<BarChart3 className="h-4 w-4" />}
          />
        </div>
      )}

      {/* 기본 쿼리 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            검색 작업 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">기본 쿼리</p>
              <p className="font-semibold text-lg">{analysis.base_query || analysis.query_text}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {analysis.my_domain && (
                <div>
                  <p className="text-sm text-muted-foreground">타겟 도메인</p>
                  <p className="font-medium">{analysis.my_domain}</p>
                </div>
              )}
              {analysis.my_brand && (
                <div>
                  <p className="text-sm text-muted-foreground">브랜드명</p>
                  <p className="font-medium">{analysis.my_brand}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>분석 시각: {new Date(analysis.created_at).toLocaleString('ko-KR')}</span>
            {analysis.completed_at && (
              <span>완료 시각: {new Date(analysis.completed_at).toLocaleString('ko-KR')}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 탭 기반 상세 보기 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">종합 분석</TabsTrigger>
          <TabsTrigger value="queries">쿼리별 결과</TabsTrigger>
          <TabsTrigger value="competitors">경쟁 도메인</TabsTrigger>
        </TabsList>

        {/* 종합 분석 탭 */}
        <TabsContent value="overview" className="space-y-4">
          {/* LLM별 인용률 비교 */}
          {citationMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>LLM별 내 도메인 인용 현황</CardTitle>
                <CardDescription>
                  각 AI 검색 엔진에서 내 도메인이 인용된 비율입니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(['perplexity', 'chatgpt', 'gemini', 'claude'] as const).map((llm) => {
                    const stats = citationMetrics.myDomainStats.byLLM[llm]
                    const rate = stats.total > 0 ? Math.round((stats.cited / stats.total) * 100) : 0
                    return (
                      <div key={llm} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{llm}</span>
                          <span className="text-sm text-muted-foreground">
                            {stats.cited} / {stats.total} 쿼리 ({rate}%)
                          </span>
                        </div>
                        <Progress value={rate} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 쿼리 타입별 성과 */}
          {citationMetrics?.performanceByQueryType && citationMetrics.performanceByQueryType.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>쿼리 타입별 성과</CardTitle>
                <CardDescription>
                  쿼리 유형에 따른 인용률과 브랜드 언급률을 비교합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {citationMetrics.performanceByQueryType.map((item) => (
                    <div key={item.type} className="p-4 border rounded-lg">
                      <p className="font-medium capitalize mb-2">
                        {item.type === 'base' ? '기본 쿼리' : item.type}
                      </p>
                      <div className="space-y-1 text-sm">
                        <p>쿼리 수: {item.count}개</p>
                        <p className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          인용률: {item.avgCitationRate}%
                        </p>
                        <p className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          브랜드 언급: {item.avgBrandMentionRate}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 쿼리별 결과 탭 */}
        <TabsContent value="queries" className="space-y-4">
          {allQueryResults.map((result, index) => (
            <QueryResultCard
              key={index}
              result={result}
              index={index}
              isSelected={selectedQueryIndex === index}
              onSelect={() => setSelectedQueryIndex(selectedQueryIndex === index ? null : index)}
              targetDomain={analysis.my_domain || undefined}
            />
          ))}
        </TabsContent>

        {/* 경쟁 도메인 탭 */}
        <TabsContent value="competitors" className="space-y-4">
          {visualizationData?.topDomainsChart && visualizationData.topDomainsChart.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>상위 인용 도메인</CardTitle>
                <CardDescription>
                  모든 쿼리에서 가장 많이 인용된 도메인 순위입니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visualizationData.topDomainsChart.map((domain, index) => {
                    const isMyDomain = analysis.my_domain &&
                      domain.domain.toLowerCase().includes(analysis.my_domain.toLowerCase())
                    return (
                      <div
                        key={domain.domain}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isMyDomain ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <div>
                            <p className={`font-medium ${isMyDomain ? 'text-primary' : ''}`}>
                              {domain.domain}
                              {isMyDomain && (
                                <Badge variant="default" className="ml-2 text-xs">내 도메인</Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {domain.count}회 인용
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{domain.percentage}%</p>
                          <Progress value={domain.percentage} className="w-20 h-1.5" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                경쟁 도메인 데이터가 없습니다
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* AI 최종 검토 의견 - 배치 분석 */}
      {allQueryResults.length > 0 && allQueryResults[0]?.results && allQueryResults[0]?.summary && (
        <FinalReview
          analysisId={analysis.id}
          query={analysis.base_query || analysis.query_text}
          results={allQueryResults[0].results}
          summary={allQueryResults[0].summary}
          myDomain={analysis.my_domain || undefined}
          myBrand={analysis.my_brand || undefined}
          savedReview={analysis.final_review}
          savedReviewCreatedAt={analysis.final_review_created_at}
        />
      )}
    </div>
  )
}

// 요약 카드 컴포넌트
function SummaryCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string
  value: string
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'warning'
}) {
  const bgColor = {
    default: 'bg-background',
    success: 'bg-green-50',
    warning: 'bg-orange-50',
  }[variant]

  const textColor = {
    default: 'text-foreground',
    success: 'text-green-600',
    warning: 'text-orange-600',
  }[variant]

  return (
    <Card className={bgColor}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{title}</span>
        </div>
        <p className={`text-xl font-bold ${textColor}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

// 쿼리별 결과 카드 컴포넌트
function QueryResultCard({
  result,
  index,
  isSelected,
  onSelect,
  targetDomain,
}: {
  result: QueryAnalysisResult
  index: number
  isSelected: boolean
  onSelect: () => void
  targetDomain?: string
}) {
  const [activeLLM, setActiveLLM] = useState<LLMType>('perplexity')

  const successfulLLMs = result.results
    ? (Object.keys(result.results) as LLMType[]).filter(
        (llm) => result.results[llm]?.success
      )
    : []

  const activeResult = result.results?.[activeLLM]

  return (
    <Collapsible open={isSelected} onOpenChange={onSelect}>
      <Card className={isSelected ? 'ring-2 ring-primary' : ''}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSelected ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.queryType === 'base' ? 'default' : 'secondary'}>
                      {result.queryType === 'base' ? '기본 쿼리' : variationTypeLabels[result.variationType || ''] || result.variationType || '변형'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">#{index + 1}</span>
                  </div>
                  <CardTitle className="text-base mt-1">{result.query}</CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {result.error ? (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    실패
                  </Badge>
                ) : (
                  <>
                    {result.summary?.myDomainCited && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Globe className="h-3 w-3 mr-1" />
                        인용됨
                      </Badge>
                    )}
                    {result.summary?.brandMentioned && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        <Tag className="h-3 w-3 mr-1" />
                        언급됨
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {result.summary?.totalCitations || 0}개 인용
                    </span>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {result.error ? (
              <div className="p-4 bg-destructive/10 rounded-lg text-destructive">
                분석 실패: {result.error}
              </div>
            ) : successfulLLMs.length > 0 ? (
              <div className="space-y-4">
                <LLMTabs llms={successfulLLMs} onTabChange={setActiveLLM} />

                {activeResult && activeResult.success && (
                  <>
                    <AnswerView answer={activeResult.answer} model={activeResult.model} />

                    <div className="space-y-3">
                      <h4 className="font-semibold">
                        인용 목록 ({activeResult.citations.length}개)
                      </h4>
                      {activeResult.citations.length > 0 ? (
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                          {activeResult.citations.map((citation) => (
                            <CitationDetailCard
                              key={citation.id}
                              citation={citation}
                              targetDomain={targetDomain}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">인용이 없습니다</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">성공한 LLM 분석 결과가 없습니다</p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// 단일 분석 뷰 (메인 페이지와 동일한 레이아웃)
function SingleAnalysisView({ analysis }: { analysis: Analysis }) {
  // 요약 데이터가 없으면 생성
  const summary: AnalysisSummary = analysis.summary || {
    totalCitations: 0,
    uniqueDomains: 0,
    myDomainCited: false,
    myDomainCitationCount: 0,
    brandMentioned: false,
    brandMentionCount: 0,
    avgResponseTime: 0,
    successfulLLMs: (Object.keys(analysis.results) as LLMType[]).filter(
      (llm) => analysis.results[llm]?.success
    ),
    failedLLMs: (Object.keys(analysis.results) as LLMType[]).filter(
      (llm) => !analysis.results[llm]?.success
    ),
    citationRateByLLM: {
      perplexity: analysis.results.perplexity?.citations.length ?? null,
      chatgpt: analysis.results.chatgpt?.citations.length ?? null,
      gemini: analysis.results.gemini?.citations.length ?? null,
      claude: analysis.results.claude?.citations.length ?? null,
    },
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Link href="/analysis">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            분석 이력으로 돌아가기
          </Button>
        </Link>
        <Badge variant="outline" className="text-sm">
          {new Date(analysis.created_at).toLocaleString('ko-KR')}
        </Badge>
      </div>

      {/* 쿼리 정보 카드 */}
      <Card className="bg-gradient-to-r from-slate-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            검색 쿼리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <p className="text-2xl font-semibold">{analysis.query_text}</p>
            </div>
            <div className="flex flex-col gap-2">
              {analysis.my_domain && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">도메인:</span>
                  <span className="font-medium">{analysis.my_domain}</span>
                </div>
              )}
              {analysis.my_brand && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">브랜드:</span>
                  <span className="font-medium">{analysis.my_brand}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 핵심 지표: 내 도메인/브랜드 노출 현황 */}
      <VisibilityDashboard
        summary={summary}
        results={analysis.results}
        myDomain={analysis.my_domain || undefined}
        myBrand={analysis.my_brand || undefined}
      />

      {/* 브랜드 언급 분석 */}
      <BrandMentionCard
        brandMentionAnalysis={summary.brandMentionAnalysis}
        myBrand={analysis.my_brand || undefined}
      />

      {/* LLM 성능 비교 차트 */}
      <LLMComparisonChart
        results={analysis.results}
        summary={summary}
        myDomain={analysis.my_domain || undefined}
      />

      {/* 경쟁사 비교 분석 */}
      <CompetitorComparison
        results={analysis.results}
        myDomain={analysis.my_domain || undefined}
        crossValidation={analysis.cross_validation || undefined}
      />

      {/* LLM별 상세 결과 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">LLM별 상세 결과</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LLMResultCard
            llmName="Perplexity"
            result={analysis.results.perplexity}
            targetDomain={analysis.my_domain || undefined}
          />
          <LLMResultCard
            llmName="ChatGPT"
            result={analysis.results.chatgpt}
            targetDomain={analysis.my_domain || undefined}
          />
          <LLMResultCard
            llmName="Gemini"
            result={analysis.results.gemini}
            targetDomain={analysis.my_domain || undefined}
          />
          <LLMResultCard
            llmName="Claude"
            result={analysis.results.claude}
            targetDomain={analysis.my_domain || undefined}
          />
        </div>
      </div>

      {/* 부분 실패 경고 */}
      {summary.failedLLMs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">일부 LLM 분석 실패</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              {summary.failedLLMs.join(', ')}에서 응답을 받지 못했습니다.
              성공한 {summary.successfulLLMs.length}개 LLM 결과는 위에서 확인할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI 최종 검토 의견 */}
      <FinalReview
        analysisId={analysis.id}
        query={analysis.query_text}
        results={analysis.results}
        summary={summary}
        myDomain={analysis.my_domain || undefined}
        myBrand={analysis.my_brand || undefined}
        savedReview={analysis.final_review}
        savedReviewCreatedAt={analysis.final_review_created_at}
      />
    </div>
  )
}
