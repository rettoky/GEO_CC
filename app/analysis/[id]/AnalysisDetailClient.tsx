'use client'

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
import { LLMResultCard } from '@/components/analysis/LLMResultCard'
import { FinalReview } from '@/components/analysis/FinalReview'
import { BrandMentionCard } from '@/components/analysis/BrandMentionCard'
import type { Analysis } from '@/lib/supabase/types'
import type { LLMType, AnalysisResults, AnalysisSummary } from '@/types'

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
  const results = baseQueryResult?.results || analysis.results
  const summary: AnalysisSummary = baseQueryResult?.summary || analysis.summary || {
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
      />

      {/* LLM 성능 비교 차트 */}
      <LLMComparisonChart
        results={results}
        summary={summary}
        myDomain={analysis.my_domain || undefined}
      />

      {/* 내 도메인 경쟁력 분석 (독립 행) */}
      <CompetitorComparison
        results={results}
        myDomain={analysis.my_domain || undefined}
        crossValidation={analysis.cross_validation || undefined}
        section="myDomain"
      />

      {/* 상위 경쟁사 분석 + 브랜드 언급 분석 (2컬럼) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompetitorComparison
          results={results}
          myDomain={analysis.my_domain || undefined}
          crossValidation={analysis.cross_validation || undefined}
          section="topCompetitors"
        />
        <BrandMentionCard
          brandMentionAnalysis={summary.brandMentionAnalysis}
          myBrand={analysis.my_brand || undefined}
        />
      </div>

      {/* 전체 도메인 순위 */}
      <CompetitorComparison
        results={results}
        myDomain={analysis.my_domain || undefined}
        crossValidation={analysis.cross_validation || undefined}
        section="ranking"
      />

      {/* GEO 최적화 권장사항 */}
      <CompetitorComparison
        results={results}
        myDomain={analysis.my_domain || undefined}
        crossValidation={analysis.cross_validation || undefined}
        section="recommendations"
      />

      {/* LLM별 상세 결과 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">LLM별 상세 결과</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LLMResultCard
            llmName="Perplexity"
            result={results.perplexity}
            targetDomain={analysis.my_domain || undefined}
          />
          <LLMResultCard
            llmName="ChatGPT"
            result={results.chatgpt}
            targetDomain={analysis.my_domain || undefined}
          />
          <LLMResultCard
            llmName="Gemini"
            result={results.gemini}
            targetDomain={analysis.my_domain || undefined}
          />
          <LLMResultCard
            llmName="Claude"
            result={results.claude}
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
