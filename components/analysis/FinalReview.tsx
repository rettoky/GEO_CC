'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react'
import type { AnalysisResults, AnalysisSummary, UnifiedCitation } from '@/types'
import ReactMarkdown from 'react-markdown'
import { ACTIVE_LLMS } from '@/lib/constants/labels'

interface FinalReviewProps {
  analysisId?: string  // 분석 ID (저장용)
  query: string
  results: AnalysisResults
  summary: AnalysisSummary
  myDomain?: string
  myBrand?: string
  savedReview?: string | null  // 기존 저장된 리뷰
  savedReviewCreatedAt?: string | null  // 저장 시간
}

type LLMKey = 'perplexity' | 'chatgpt' | 'gemini' | 'claude'

/**
 * Gemini를 사용한 최종 검토 의견 컴포넌트
 */
export function FinalReview({
  analysisId,
  query,
  results,
  summary,
  myDomain,
  myBrand,
  savedReview,
  savedReviewCreatedAt,
}: FinalReviewProps) {
  const [review, setReview] = useState<string | null>(savedReview || null)
  const [isSaved, setIsSaved] = useState(!!savedReview)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [hasGenerated, setHasGenerated] = useState(!!savedReview)

  // savedReview가 변경되면 상태 업데이트
  useEffect(() => {
    if (savedReview) {
      setReview(savedReview)
      setIsSaved(true)
      setHasGenerated(true)
    }
  }, [savedReview])

  // 상위 인용 도메인 추출
  const getTopDomains = () => {
    const domainCounts = new Map<string, number>()

    Object.values(results).forEach((result) => {
      if (result?.success && result.citations) {
        result.citations.forEach((citation: UnifiedCitation) => {
          const count = domainCounts.get(citation.domain) || 0
          domainCounts.set(citation.domain, count + 1)
        })
      }
    })

    return Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  // LLM별 결과 요약
  const getLLMResults = () => {
    const llmResults: Record<string, {
      success: boolean
      citationCount: number
      hasDomainCitation: boolean
      hasBrandMention: boolean
    }> = {}

    const llmKeys: LLMKey[] = ACTIVE_LLMS as LLMKey[]

    llmKeys.forEach((llm) => {
      const result = results[llm]
      if (!result) {
        llmResults[llm] = {
          success: false,
          citationCount: 0,
          hasDomainCitation: false,
          hasBrandMention: false,
        }
        return
      }

      // 도메인 매칭 (서브도메인 고려)
      const isDomainMatch = (citedDomain: string, targetDomain: string) => {
        const cited = citedDomain.toLowerCase()
        const target = targetDomain.toLowerCase().replace(/^www\./, '')
        return cited === target || cited.endsWith('.' + target) || target.endsWith('.' + cited)
      }
      const hasDomainCitation = myDomain
        ? result.citations.some(
            (c: UnifiedCitation) => isDomainMatch(c.domain, myDomain)
          )
        : false

      const hasBrandMention = myBrand
        ? result.answer.toLowerCase().includes(myBrand.toLowerCase())
        : false

      llmResults[llm] = {
        success: result.success,
        citationCount: result.citations.length,
        hasDomainCitation,
        hasBrandMention,
      }
    })

    return llmResults
  }

  // 검토 의견 생성
  const generateReview = async () => {
    setIsLoading(true)
    setError(null)
    setIsSaved(false)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          analysisId,  // DB 저장을 위한 분석 ID
          query,
          myDomain,
          myBrand,
          summary: {
            totalCitations: summary.totalCitations,
            uniqueDomains: summary.uniqueDomains,
            myDomainCited: summary.myDomainCited,
            myDomainCitationCount: summary.myDomainCitationCount,
            brandMentioned: summary.brandMentioned,
            brandMentionCount: summary.brandMentionCount,
            successfulLLMs: summary.successfulLLMs,
            failedLLMs: summary.failedLLMs,
            // 브랜드 언급 분석 데이터 추가
            brandMentionAnalysis: summary.brandMentionAnalysis ? {
              myBrand: summary.brandMentionAnalysis.myBrand ? {
                mentionCount: summary.brandMentionAnalysis.myBrand.mentionCount,
                mentionedInLLMs: summary.brandMentionAnalysis.myBrand.mentionedInLLMs,
              } : null,
              competitors: summary.brandMentionAnalysis.competitors?.map(c => ({
                brand: c.brand,
                mentionCount: c.mentionCount,
                mentionedInLLMs: c.mentionedInLLMs,
              })) || [],
            } : undefined,
          },
          topDomains: getTopDomains(),
          llmResults: getLLMResults(),
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '검토 의견 생성에 실패했습니다.')
      }

      setReview(data.review)
      setHasGenerated(true)
      // analysisId가 있으면 저장됨 표시
      if (analysisId) {
        setIsSaved(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 자동 생성 시도하지 않음 (사용자가 버튼 클릭 시 생성)
  // 필요하다면 아래 useEffect 주석 해제
  // useEffect(() => {
  //   if (!hasGenerated) {
  //     generateReview()
  //   }
  // }, [])

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/30 dark:via-gray-900 dark:to-purple-950/30 overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            AI 최종 검토 의견
            <span className="text-xs font-normal text-muted-foreground bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full ml-2">
              Powered by Gemini
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasGenerated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={generateReview}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {hasGenerated ? '다시 생성' : '검토 의견 생성'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {(isExpanded || !hasGenerated) && (
        <CardContent className="pt-6">
          {/* 로딩 상태 */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-20" />
                <Sparkles className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>
              <p className="mt-4 text-lg font-medium text-foreground">
                AI가 분석 결과를 검토하고 있습니다...
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Gemini가 종합적인 검토 의견을 생성 중입니다
              </p>
            </div>
          )}

          {/* 에러 상태 */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-lg font-medium text-destructive mb-2">
                검토 의견 생성 실패
              </p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={generateReview}>
                다시 시도
              </Button>
            </div>
          )}

          {/* 초기 상태 (아직 생성하지 않음) */}
          {!review && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
                <Sparkles className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">
                AI 검토 의견을 생성해보세요
              </p>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Gemini AI가 분석 결과를 종합하여 강점, 개선점, 경쟁사 분석 및
                구체적인 권장사항을 제공합니다.
              </p>
              <Button onClick={generateReview} className="gap-2">
                <Sparkles className="h-4 w-4" />
                검토 의견 생성하기
              </Button>
            </div>
          )}

          {/* 검토 의견 표시 */}
          {review && !isLoading && (
            <div className="space-y-4">
              {/* 생성 완료 및 저장 상태 표시 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>AI 검토 완료</span>
                </div>
                {isSaved && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      <Save className="h-3 w-3" />
                      저장됨
                    </Badge>
                    {savedReviewCreatedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(savedReviewCreatedAt).toLocaleString('ko-KR')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 마크다운 렌더링 */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold text-foreground mt-6 mb-3 flex items-center gap-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold text-foreground mt-5 mb-2 border-b border-border/50 pb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-2 my-3">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="space-y-2 my-3 list-decimal pl-5">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                        <span>{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">
                        {children}
                      </strong>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-r-lg">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {review}
                </ReactMarkdown>
              </div>

              {/* 면책 조항 */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  이 검토 의견은 AI(Gemini)가 생성한 것으로, 참고용으로만 활용해주세요.
                  실제 의사결정 시에는 전문가의 조언을 구하시기 바랍니다.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
