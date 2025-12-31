'use client'

import { useRef, useState, useCallback } from 'react'
import { XCircle, Globe, Tag, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ChartErrorFallback } from '@/components/ui/chart-error-fallback'
import { VisibilityDashboard } from '@/components/analysis/VisibilityDashboard'
import { LLMComparisonChart } from '@/components/analysis/LLMComparisonChart'
import { CompetitorComparison } from '@/components/analysis/CompetitorComparison'
import { FinalReview } from '@/components/analysis/FinalReview'
import { ReviewChat } from '@/components/analysis/ReviewChat'
import { BrandMentionCard } from '@/components/analysis/BrandMentionCard'
import { SentimentDashboard } from '@/components/analysis/SentimentDashboard'
import { AllQueryResultsView, type AllQueryResultsViewHandle } from '@/components/analysis/AllQueryResultsView'
import type { Analysis } from '@/lib/supabase/types'
import type { LLMType, AnalysisResults, AnalysisSummary, BrandMention, CrossValidation, CrossValidationItem } from '@/types'
import { isLLMActive } from '@/lib/constants/labels'

interface AnalysisDetailViewProps {
  analysis: Analysis
}

interface QueryAnalysisResult {
  query: string
  queryType: 'base' | 'variation'
  variationType?: string
  results: AnalysisResults
  summary: AnalysisSummary
  error?: string
}

export function AnalysisDetailView({ analysis }: AnalysisDetailViewProps) {
  const allQueryResultsRef = useRef<AllQueryResultsViewHandle>(null)
  const [currentFinalReview, setCurrentFinalReview] = useState<string | null>(
    analysis.final_review || null
  )

  const handleReviewGenerated = useCallback((review: string) => {
    setCurrentFinalReview(review)
  }, [])

  const intermediateResults = analysis.intermediate_results as {
    allQueryResults?: QueryAnalysisResult[]
    baseQueryResult?: QueryAnalysisResult
    variationResults?: QueryAnalysisResult[]
  } | null

  const allQueryResults = intermediateResults?.allQueryResults || []

  const isBatchAnalysis =
    allQueryResults.length > 1 ||
    (analysis.query_variations_count && analysis.query_variations_count > 0) ||
    (analysis.total_queries_analyzed && analysis.total_queries_analyzed > 1)

  // 처리중 상태
  if (analysis.status === 'processing') {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-medium mb-2">분석 진행 중...</h3>
          <p className="text-muted-foreground">잠시 후 새로고침해 주세요.</p>
        </CardContent>
      </Card>
    )
  }

  // 실패 상태
  if (analysis.status === 'failed') {
    return (
      <Card className="border-destructive">
        <CardContent className="p-12 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">분석 실패</h3>
          <p className="text-muted-foreground">
            {analysis.error_message || '알 수 없는 오류가 발생했습니다.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const baseQueryResult = isBatchAnalysis
    ? (allQueryResults.find(r => r.queryType === 'base') || allQueryResults[0])
    : null

  // 집계된 results 생성
  const aggregatedResults: AnalysisResults = (() => {
    if (!isBatchAnalysis || allQueryResults.length === 0) {
      return baseQueryResult?.results || analysis.results
    }

    const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']
    const aggregated: AnalysisResults = {
      perplexity: null,
      chatgpt: null,
      gemini: null,
      claude: null,
    }

    for (const llm of llmTypes) {
      const allCitations: typeof aggregated.perplexity extends { citations: infer C } | null ? C : never = []
      let successCount = 0
      let totalResponseTime = 0
      let latestAnswer = ''
      let latestModel = ''
      let latestTimestamp = ''

      for (const queryResult of allQueryResults) {
        const llmResult = queryResult.results[llm]
        if (llmResult?.success) {
          successCount++
          totalResponseTime += llmResult.responseTime || 0
          latestAnswer = llmResult.answer || latestAnswer
          latestModel = llmResult.model || latestModel
          latestTimestamp = llmResult.timestamp || latestTimestamp

          for (const citation of llmResult.citations) {
            const exists = allCitations.some(c => c.url === citation.url || c.domain === citation.domain)
            if (!exists) {
              allCitations.push(citation)
            }
          }
        }
      }

      if (successCount > 0) {
        aggregated[llm] = {
          success: true,
          model: latestModel,
          answer: latestAnswer,
          citations: allCitations,
          responseTime: totalResponseTime / successCount,
          timestamp: latestTimestamp,
        }
      }
    }

    return aggregated
  })()

  // 집계된 summary 생성
  const aggregatedSummary: AnalysisSummary = (() => {
    if (!isBatchAnalysis || allQueryResults.length === 0) {
      return baseQueryResult?.summary || analysis.summary || createDefaultSummary()
    }

    const brandMap = new Map<string, BrandMention>()
    let myBrandMention: BrandMention | null = null
    let totalMyDomainCitations = 0
    let totalCitations = 0
    const uniqueDomains = new Set<string>()

    for (const queryResult of allQueryResults) {
      const querySummary = queryResult.summary
      totalCitations += querySummary.totalCitations || 0

      if (querySummary.myDomainCited) {
        totalMyDomainCitations += querySummary.myDomainCitationCount || 1
      }

      const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']
      for (const llm of llmTypes) {
        const llmResult = queryResult.results[llm]
        if (llmResult?.success) {
          for (const citation of llmResult.citations) {
            if (citation.domain) {
              uniqueDomains.add(citation.domain)
            }
          }
        }
      }

      const bma = querySummary.brandMentionAnalysis
      if (bma) {
        if (bma.myBrand && bma.myBrand.mentionCount > 0) {
          if (!myBrandMention) {
            myBrandMention = {
              brand: bma.myBrand.brand,
              aliases: [...(bma.myBrand.aliases || [])],
              mentionCount: 0,
              mentionedInLLMs: [],
              contexts: [],
              sentimentAnalysis: [],
            }
          }
          myBrandMention.mentionCount += bma.myBrand.mentionCount
          for (const llm of bma.myBrand.mentionedInLLMs) {
            if (!myBrandMention.mentionedInLLMs.includes(llm)) {
              myBrandMention.mentionedInLLMs.push(llm)
            }
          }
          // 감성 분석 데이터 집계
          if (bma.myBrand.sentimentAnalysis && bma.myBrand.sentimentAnalysis.length > 0) {
            myBrandMention.sentimentAnalysis = [
              ...(myBrandMention.sentimentAnalysis || []),
              ...bma.myBrand.sentimentAnalysis,
            ]
          }
        }

        for (const competitor of bma.competitors) {
          const existing = brandMap.get(competitor.brand)
          if (existing) {
            existing.mentionCount += competitor.mentionCount
            for (const llm of competitor.mentionedInLLMs) {
              if (!existing.mentionedInLLMs.includes(llm)) {
                existing.mentionedInLLMs.push(llm)
              }
            }
            // 경쟁사 감성 분석 데이터 집계
            if (competitor.sentimentAnalysis && competitor.sentimentAnalysis.length > 0) {
              existing.sentimentAnalysis = [
                ...(existing.sentimentAnalysis || []),
                ...competitor.sentimentAnalysis,
              ]
            }
          } else {
            brandMap.set(competitor.brand, {
              brand: competitor.brand,
              aliases: [...(competitor.aliases || [])],
              mentionCount: competitor.mentionCount,
              mentionedInLLMs: [...competitor.mentionedInLLMs],
              contexts: [],
              sentimentAnalysis: competitor.sentimentAnalysis || [],
            })
          }
        }
      }
    }

    const competitors = Array.from(brandMap.values())
      .sort((a, b) => b.mentionCount - a.mentionCount)

    const totalBrandMentions = (myBrandMention?.mentionCount || 0) +
      competitors.reduce((sum, c) => sum + c.mentionCount, 0)

    const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']
    const successfulLLMs = llmTypes.filter(llm => aggregatedResults[llm]?.success)
    const failedLLMs = llmTypes.filter(llm => !aggregatedResults[llm]?.success)

    return {
      totalCitations,
      uniqueDomains: uniqueDomains.size,
      myDomainCited: totalMyDomainCitations > 0,
      myDomainCitationCount: totalMyDomainCitations,
      brandMentioned: (myBrandMention?.mentionCount || 0) > 0,
      brandMentionCount: myBrandMention?.mentionCount || 0,
      avgResponseTime: 0,
      successfulLLMs,
      failedLLMs,
      citationRateByLLM: {
        perplexity: aggregatedResults.perplexity?.citations.length ?? null,
        chatgpt: aggregatedResults.chatgpt?.citations.length ?? null,
        gemini: aggregatedResults.gemini?.citations.length ?? null,
        claude: aggregatedResults.claude?.citations.length ?? null,
      },
      brandMentionAnalysis: {
        myBrand: myBrandMention,
        competitors,
        totalBrandMentions,
      },
    }
  })()

  function createDefaultSummary(): AnalysisSummary {
    return {
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
  }

  // CrossValidation 생성
  const aggregatedCrossValidation: CrossValidation | undefined = (() => {
    if (!isBatchAnalysis || allQueryResults.length === 0) {
      return analysis.cross_validation || undefined
    }

    const domainLLMMap = new Map<string, Set<LLMType>>()
    const myDomain = analysis.my_domain?.toLowerCase().replace(/^www\./, '')

    for (const queryResult of allQueryResults) {
      const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']
      for (const llm of llmTypes) {
        const llmResult = queryResult.results[llm]
        if (llmResult?.success) {
          for (const citation of llmResult.citations) {
            if (citation.domain) {
              const normalizedDomain = citation.domain.toLowerCase().replace(/^www\./, '')
              if (!domainLLMMap.has(normalizedDomain)) {
                domainLLMMap.set(normalizedDomain, new Set())
              }
              domainLLMMap.get(normalizedDomain)!.add(llm)
            }
          }
        }
      }
    }

    const items: CrossValidationItem[] = Array.from(domainLLMMap.entries()).map(([domain, llmSet]) => {
      const citedBy = Array.from(llmSet)
      const llmCount = citedBy.length

      let grade: 'A' | 'B' | 'C' | 'D'
      let reliability: number
      if (llmCount >= 3) { grade = 'A'; reliability = 95 }
      else if (llmCount >= 2) { grade = 'B'; reliability = 80 }
      else if (llmCount >= 1) { grade = 'C'; reliability = 60 }
      else { grade = 'D'; reliability = 30 }

      return { domain, citedBy, grade, reliability }
    })

    items.sort((a, b) => {
      const gradeOrder = { A: 0, B: 1, C: 2, D: 3 }
      if (gradeOrder[a.grade] !== gradeOrder[b.grade]) {
        return gradeOrder[a.grade] - gradeOrder[b.grade]
      }
      return b.citedBy.length - a.citedBy.length
    })

    const isDomainMatch = (domain: string, target: string) => {
      const d = domain.toLowerCase()
      const t = target.toLowerCase()
      return d === t || d.endsWith('.' + t) || t.endsWith('.' + d)
    }
    const myDomainItem = myDomain ? items.find(item => isDomainMatch(item.domain, myDomain)) : null
    const myDomainGrade = myDomainItem?.grade || null

    return { items, myDomainGrade }
  })()

  const results = aggregatedResults
  const summary = aggregatedSummary
  const crossValidation = aggregatedCrossValidation

  const displayQueryResults: QueryAnalysisResult[] = isBatchAnalysis
    ? allQueryResults
    : [{
        query: analysis.base_query || analysis.query_text,
        queryType: 'base' as const,
        results: analysis.results,
        summary: summary,
      }]

  return (
    <div className="space-y-6">
      {/* 쿼리 정보 */}
      <Card className="bg-gradient-to-r from-slate-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              검색 쿼리
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              {isBatchAnalysis
                ? `${analysis.total_queries_analyzed || allQueryResults.length}개 쿼리`
                : new Date(analysis.created_at).toLocaleString('ko-KR')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <p className="text-xl font-semibold">{analysis.base_query || analysis.query_text}</p>
              {isBatchAnalysis && (
                <p className="text-sm text-muted-foreground mt-1">
                  + {(analysis.query_variations_count || allQueryResults.length - 1)}개 변형
                </p>
              )}
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

      <ErrorBoundary
        fallback={(error, reset) => (
          <ChartErrorFallback
            error={error}
            onReset={reset}
            title="가시성 대시보드를 불러올 수 없습니다"
          />
        )}
      >
        <VisibilityDashboard
          summary={summary}
          results={results}
          myDomain={analysis.my_domain || undefined}
          myBrand={analysis.my_brand || undefined}
          brandAliases={analysis.brand_aliases || []}
          onDomainCitationClick={() => {
            allQueryResultsRef.current?.setFilterAndScroll('myDomain')
          }}
          onBrandMentionClick={() => {
            allQueryResultsRef.current?.setFilterAndScroll('brandMention')
          }}
          onLLMBrandMentionClick={(llm) => {
            allQueryResultsRef.current?.setLLMBrandMentionFilterAndScroll(llm)
          }}
        />
      </ErrorBoundary>

      <ErrorBoundary
        fallback={(error, reset) => (
          <ChartErrorFallback
            error={error}
            onReset={reset}
            title="브랜드 노출 비교 차트를 불러올 수 없습니다"
          />
        )}
      >
        <LLMComparisonChart
          results={results}
          summary={summary}
          myDomain={analysis.my_domain || undefined}
          myBrand={analysis.my_brand || undefined}
          brandMentionAnalysis={summary.brandMentionAnalysis}
        />
      </ErrorBoundary>

      <CompetitorComparison
        results={results}
        myDomain={analysis.my_domain || undefined}
        crossValidation={crossValidation}
        section="myDomain"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompetitorComparison
          results={results}
          myDomain={analysis.my_domain || undefined}
          crossValidation={crossValidation}
          section="topCompetitors"
        />
        <BrandMentionCard
          brandMentionAnalysis={summary.brandMentionAnalysis}
          myBrand={analysis.my_brand || undefined}
          onCompetitorClick={(brandName, aliases) => {
            allQueryResultsRef.current?.setCompetitorFilterAndScroll(brandName, aliases)
          }}
        />
      </div>

      {/* 감성 분석 대시보드 - myBrand에 sentimentAnalysis가 있을 때만 표시 */}
      {summary.brandMentionAnalysis?.myBrand?.sentimentAnalysis &&
       summary.brandMentionAnalysis.myBrand.sentimentAnalysis.length > 0 && (
        <ErrorBoundary
          fallback={(error, reset) => (
            <ChartErrorFallback
              error={error}
              onReset={reset}
              title="감성 분석 대시보드를 불러올 수 없습니다"
            />
          )}
        >
          <SentimentDashboard
            brand={analysis.my_brand || summary.brandMentionAnalysis.myBrand.brand}
            sentiments={summary.brandMentionAnalysis.myBrand.sentimentAnalysis}
          />
        </ErrorBoundary>
      )}

      <CompetitorComparison
        results={results}
        myDomain={analysis.my_domain || undefined}
        crossValidation={crossValidation}
        section="ranking"
      />

      <CompetitorComparison
        results={results}
        myDomain={analysis.my_domain || undefined}
        crossValidation={crossValidation}
        section="recommendations"
      />

      {displayQueryResults.length > 0 && (
        <AllQueryResultsView
          ref={allQueryResultsRef}
          allQueryResults={displayQueryResults}
          myDomain={analysis.my_domain || undefined}
          myBrand={analysis.my_brand || undefined}
        />
      )}

      {(() => {
        const activeFailedLLMs = summary.failedLLMs.filter(isLLMActive)
        const activeSuccessfulLLMs = summary.successfulLLMs.filter(isLLMActive)
        return activeFailedLLMs.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-700">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">일부 LLM 분석 실패</span>
              </div>
              <p className="text-sm text-orange-600 mt-1">
                {activeFailedLLMs.join(', ')}에서 응답을 받지 못했습니다.
                성공한 {activeSuccessfulLLMs.length}개 LLM 결과는 위에서 확인할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        )
      })()}

      <FinalReview
        analysisId={analysis.id}
        query={analysis.base_query || analysis.query_text}
        results={results}
        summary={summary}
        myDomain={analysis.my_domain || undefined}
        myBrand={analysis.my_brand || undefined}
        savedReview={analysis.final_review}
        savedReviewCreatedAt={analysis.final_review_created_at}
        onReviewGenerated={handleReviewGenerated}
      />

      <ReviewChat
        analysisId={analysis.id}
        finalReview={currentFinalReview}
        query={analysis.base_query || analysis.query_text}
        myDomain={analysis.my_domain || undefined}
        myBrand={analysis.my_brand || undefined}
      />
    </div>
  )
}
