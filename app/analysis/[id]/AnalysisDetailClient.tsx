'use client'

import { useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  XCircle,
  Globe,
  Tag,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VisibilityDashboard } from '@/components/analysis/VisibilityDashboard'
import { LLMComparisonChart } from '@/components/analysis/LLMComparisonChart'
import { CompetitorComparison } from '@/components/analysis/CompetitorComparison'
import { FinalReview } from '@/components/analysis/FinalReview'
import { BrandMentionCard } from '@/components/analysis/BrandMentionCard'
import { AllQueryResultsView, type AllQueryResultsViewHandle } from '@/components/analysis/AllQueryResultsView'
import type { Analysis } from '@/lib/supabase/types'
import type { LLMType, AnalysisResults, AnalysisSummary, BrandMention, CrossValidation, CrossValidationItem } from '@/types'
import { isLLMActive } from '@/lib/constants/labels'

interface AnalysisDetailClientProps {
  analysis: Analysis
}

// 쿼리 분석 결과 타입 (배치 분석용)
interface QueryAnalysisResult {
  query: string
  queryType: 'base' | 'variation'
  variationType?: string
  results: AnalysisResults
  summary: AnalysisSummary
  error?: string
}

export function AnalysisDetailClient({ analysis }: AnalysisDetailClientProps) {
  // AllQueryResultsView ref
  const allQueryResultsRef = useRef<AllQueryResultsViewHandle>(null)

  // 배치 분석 데이터 파싱
  const intermediateResults = analysis.intermediate_results as {
    allQueryResults?: QueryAnalysisResult[]
    baseQueryResult?: QueryAnalysisResult
    variationResults?: QueryAnalysisResult[]
  } | null

  const allQueryResults = intermediateResults?.allQueryResults || []

  // 배치 분석 판별
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

  // 배치 분석인 경우 - 기본 쿼리 결과를 기준으로 표시
  const baseQueryResult = isBatchAnalysis
    ? (allQueryResults.find(r => r.queryType === 'base') || allQueryResults[0])
    : null

  // 배치 분석 시 전체 쿼리 결과를 집계한 results 생성
  const aggregatedResults: AnalysisResults = (() => {
    if (!isBatchAnalysis || allQueryResults.length === 0) {
      return baseQueryResult?.results || analysis.results
    }

    // 모든 쿼리의 citations를 합쳐서 집계
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

          // 중복 제거하면서 citations 병합
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

  // 배치 분석 시 전체 쿼리 결과를 집계한 summary 생성
  const aggregatedSummary: AnalysisSummary = (() => {
    if (!isBatchAnalysis || allQueryResults.length === 0) {
      return baseQueryResult?.summary || analysis.summary || createDefaultSummary()
    }

    // 전체 쿼리에서 브랜드 언급 집계
    const brandMap = new Map<string, BrandMention>()
    let myBrandMention: BrandMention | null = null
    let totalMyDomainCitations = 0
    let totalCitations = 0
    const uniqueDomains = new Set<string>()
    const _myBrand = analysis.my_brand?.toLowerCase()
    const _myDomain = analysis.my_domain?.toLowerCase().replace(/^www\./, '')

    for (const queryResult of allQueryResults) {
      const querySummary = queryResult.summary

      // 총 인용 수 집계
      totalCitations += querySummary.totalCitations || 0

      // 내 도메인 인용 수 집계
      if (querySummary.myDomainCited) {
        totalMyDomainCitations += querySummary.myDomainCitationCount || 1
      }

      // 도메인 수집
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

      // 브랜드 언급 분석 집계
      const bma = querySummary.brandMentionAnalysis
      if (bma) {
        // 내 브랜드 집계
        if (bma.myBrand && bma.myBrand.mentionCount > 0) {
          if (!myBrandMention) {
            myBrandMention = {
              brand: bma.myBrand.brand,
              aliases: [...(bma.myBrand.aliases || [])],
              mentionCount: 0,
              mentionedInLLMs: [],
              contexts: [],
            }
          }
          myBrandMention.mentionCount += bma.myBrand.mentionCount
          for (const llm of bma.myBrand.mentionedInLLMs) {
            if (!myBrandMention.mentionedInLLMs.includes(llm)) {
              myBrandMention.mentionedInLLMs.push(llm)
            }
          }
          if (bma.myBrand.contexts) {
            myBrandMention.contexts.push(...bma.myBrand.contexts.slice(0, 2))
          }
        }

        // 경쟁사 브랜드 집계
        for (const competitor of bma.competitors) {
          const existing = brandMap.get(competitor.brand)
          if (existing) {
            existing.mentionCount += competitor.mentionCount
            for (const llm of competitor.mentionedInLLMs) {
              if (!existing.mentionedInLLMs.includes(llm)) {
                existing.mentionedInLLMs.push(llm)
              }
            }
            if (competitor.contexts) {
              existing.contexts.push(...competitor.contexts.slice(0, 2))
            }
          } else {
            brandMap.set(competitor.brand, {
              brand: competitor.brand,
              aliases: [...(competitor.aliases || [])],
              mentionCount: competitor.mentionCount,
              mentionedInLLMs: [...competitor.mentionedInLLMs],
              contexts: competitor.contexts ? [...competitor.contexts.slice(0, 2)] : [],
            })
          }
        }
      }
    }

    // 경쟁사 목록을 언급 수 기준 정렬
    const competitors = Array.from(brandMap.values())
      .sort((a, b) => b.mentionCount - a.mentionCount)

    // 총 브랜드 언급 수
    const totalBrandMentions = (myBrandMention?.mentionCount || 0) +
      competitors.reduce((sum, c) => sum + c.mentionCount, 0)

    // 성공/실패 LLM 집계
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

  // 배치 분석 시 전체 쿼리 결과를 집계한 CrossValidation 생성
  const aggregatedCrossValidation: CrossValidation | undefined = (() => {
    if (!isBatchAnalysis || allQueryResults.length === 0) {
      return analysis.cross_validation || undefined
    }

    // 도메인별 LLM 인용 정보 집계
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

    // CrossValidationItem 배열 생성
    const items: CrossValidationItem[] = Array.from(domainLLMMap.entries()).map(([domain, llmSet]) => {
      const citedBy = Array.from(llmSet)
      const llmCount = citedBy.length

      // 등급 계산: 3+ LLM = A, 2 LLM = B, 1 LLM = C, 0 = D
      let grade: 'A' | 'B' | 'C' | 'D'
      let reliability: number
      if (llmCount >= 3) {
        grade = 'A'
        reliability = 95
      } else if (llmCount >= 2) {
        grade = 'B'
        reliability = 80
      } else if (llmCount >= 1) {
        grade = 'C'
        reliability = 60
      } else {
        grade = 'D'
        reliability = 30
      }

      return {
        domain,
        citedBy,
        grade,
        reliability,
      }
    })

    // 등급 및 LLM 수 기준 정렬
    items.sort((a, b) => {
      const gradeOrder = { A: 0, B: 1, C: 2, D: 3 }
      if (gradeOrder[a.grade] !== gradeOrder[b.grade]) {
        return gradeOrder[a.grade] - gradeOrder[b.grade]
      }
      return b.citedBy.length - a.citedBy.length
    })

    // 내 도메인 등급 찾기
    const myDomainItem = myDomain ? items.find(item => item.domain === myDomain) : null
    const myDomainGrade = myDomainItem?.grade || null

    return {
      items,
      myDomainGrade,
    }
  })()

  const results = aggregatedResults
  const summary = aggregatedSummary
  const crossValidation = aggregatedCrossValidation

  // 단일/배치 분석 통합: AllQueryResultsView에 전달할 데이터
  // 배치 분석이면 allQueryResults 사용, 단일 분석이면 가상의 1개 배열 생성
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
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Link href="/analysis">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            분석 이력으로 돌아가기
          </Button>
        </Link>
        <Badge variant="outline" className="text-sm">
          {isBatchAnalysis
            ? `${analysis.total_queries_analyzed || allQueryResults.length}개 쿼리 분석 완료`
            : new Date(analysis.created_at).toLocaleString('ko-KR')}
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
              <p className="text-2xl font-semibold">{analysis.base_query || analysis.query_text}</p>
              {isBatchAnalysis && (
                <p className="text-sm text-muted-foreground mt-1">
                  + {(analysis.query_variations_count || allQueryResults.length - 1)}개 변형 쿼리
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

      {/* 핵심 지표: 내 도메인/브랜드 노출 현황 */}
      <VisibilityDashboard
        summary={summary}
        results={results}
        myDomain={analysis.my_domain || undefined}
        myBrand={analysis.my_brand || undefined}
        onDomainCitationClick={() => {
          allQueryResultsRef.current?.setFilterAndScroll('myDomain')
        }}
        onBrandMentionClick={() => {
          allQueryResultsRef.current?.setFilterAndScroll('brandMention')
        }}
      />

      {/* 브랜드 노출 비교 차트 */}
      <LLMComparisonChart
        results={results}
        summary={summary}
        myDomain={analysis.my_domain || undefined}
        myBrand={analysis.my_brand || undefined}
        brandMentionAnalysis={summary.brandMentionAnalysis}
      />

      {/* 내 도메인 경쟁력 분석 (독립 행) */}
      <CompetitorComparison
        results={results}
        myDomain={analysis.my_domain || undefined}
        crossValidation={crossValidation}
        section="myDomain"
      />

      {/* 상위 경쟁사 분석 + 브랜드 언급 분석 (2컬럼) */}
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

      {/* 전체 도메인 순위 */}
      <CompetitorComparison
        results={results}
        myDomain={analysis.my_domain || undefined}
        crossValidation={crossValidation}
        section="ranking"
      />

      {/* GEO 최적화 권장사항 */}
      <CompetitorComparison
        results={results}
        myDomain={analysis.my_domain || undefined}
        crossValidation={crossValidation}
        section="recommendations"
      />

      {/* 전체 쿼리 분석 결과 (단일/배치 통합) */}
      {displayQueryResults.length > 0 && (
        <AllQueryResultsView
          ref={allQueryResultsRef}
          allQueryResults={displayQueryResults}
          myDomain={analysis.my_domain || undefined}
          myBrand={analysis.my_brand || undefined}
        />
      )}

      {/* 부분 실패 경고 (활성화된 LLM만 표시) */}
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

      {/* AI 최종 검토 의견 */}
      <FinalReview
        analysisId={analysis.id}
        query={analysis.base_query || analysis.query_text}
        results={results}
        summary={summary}
        myDomain={analysis.my_domain || undefined}
        myBrand={analysis.my_brand || undefined}
        savedReview={analysis.final_review}
        savedReviewCreatedAt={analysis.final_review_created_at}
      />
    </div>
  )
}
