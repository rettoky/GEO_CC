'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LLMType, AnalysisSummary, AnalysisResults } from '@/lib/supabase/types'
import { LLM_COLORS } from '@/lib/types/visualization'

const LLM_LABELS: Record<LLMType, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
}

interface DrilldownAnalysis {
  id: string
  query: string
  results: AnalysisResults
  summary: AnalysisSummary
  createdAt: string
}

interface DrilldownModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean
  /** 모달 닫기 */
  onClose: () => void
  /** 선택된 날짜 */
  date?: string
  /** 선택된 LLM */
  llm?: LLMType
  /** 드릴다운 분석 데이터 */
  analyses: DrilldownAnalysis[]
  /** 로딩 상태 */
  isLoading?: boolean
  /** 분석 상세 보기 클릭 */
  onViewAnalysis?: (analysisId: string) => void
}

/**
 * 드릴다운 모달 컴포넌트
 * 히트맵 셀 클릭 시 해당 날짜/LLM의 상세 분석 목록 표시
 */
export function DrilldownModal({
  isOpen,
  onClose,
  date,
  llm,
  analyses,
  isLoading = false,
  onViewAnalysis,
}: DrilldownModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 인용률 계산 헬퍼
  const calculateCitationRate = (summary: AnalysisSummary): number => {
    const rates = summary.citationRateByLLM
    const values = [rates.perplexity, rates.chatgpt, rates.gemini, rates.claude]
      .filter((v): v is number => v !== null)
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
  }

  // 통계 계산
  const stats = useMemo(() => {
    if (analyses.length === 0) return null

    const citationRates = analyses.map(a => calculateCitationRate(a.summary))
    const avgCitationRate = citationRates.reduce((a, b) => a + b, 0) / citationRates.length

    const brandMentioned = analyses.filter(a =>
      a.summary?.brandMentionAnalysis?.myBrand?.mentionCount &&
      a.summary.brandMentionAnalysis.myBrand.mentionCount > 0
    ).length

    return {
      totalAnalyses: analyses.length,
      avgCitationRate: Math.round(avgCitationRate),
      brandMentionedCount: brandMentioned,
      brandMentionRate: Math.round((brandMentioned / analyses.length) * 100),
    }
  }, [analyses])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            상세 분석 결과
            {llm && (
              <Badge
                style={{ backgroundColor: LLM_COLORS[llm], color: 'white' }}
              >
                {LLM_LABELS[llm]}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {date && formatDate(date)}
          </DialogDescription>
        </DialogHeader>

        {/* 통계 요약 */}
        {stats && !isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 border-b">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
              <div className="text-xs text-muted-foreground">총 분석</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.avgCitationRate}%
              </div>
              <div className="text-xs text-muted-foreground">평균 인용률</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {stats.brandMentionedCount}
              </div>
              <div className="text-xs text-muted-foreground">브랜드 언급</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.brandMentionRate}%
              </div>
              <div className="text-xs text-muted-foreground">언급률</div>
            </div>
          </div>
        )}

        {/* 분석 목록 */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">분석 데이터가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {analyses.map((analysis) => {
                const isExpanded = expandedId === analysis.id
                const citationRate = Math.round(calculateCitationRate(analysis.summary))
                const brandMentioned = analysis.summary?.brandMentionAnalysis?.myBrand?.mentionCount ?? 0

                return (
                  <Card
                    key={analysis.id}
                    className={cn(
                      'transition-shadow',
                      isExpanded && 'shadow-md'
                    )}
                  >
                    <CardHeader
                      className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : analysis.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-medium truncate">
                            {analysis.query}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(analysis.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* 인용률 표시 */}
                          <div className="flex items-center gap-1">
                            {citationRate >= 50 ? (
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                            ) : citationRate > 0 ? (
                              <Minus className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium">
                              {citationRate}%
                            </span>
                          </div>
                          {/* 브랜드 언급 배지 */}
                          {brandMentioned > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              언급 {brandMentioned}회
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {/* 확장 영역 */}
                    {isExpanded && (
                      <CardContent className="pt-0 pb-4 border-t">
                        <div className="space-y-3 pt-3">
                          {/* LLM별 인용률 */}
                          {analysis.summary?.citationRateByLLM && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                LLM별 인용률
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {(Object.entries(analysis.summary.citationRateByLLM) as [LLMType, number | null][])
                                  .filter(([_, rate]) => rate !== null)
                                  .map(([llmKey, rate]) => (
                                    <div
                                      key={llmKey}
                                      className="flex items-center justify-between bg-muted/50 rounded px-2 py-1"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: LLM_COLORS[llmKey] }}
                                        />
                                        <span className="text-xs">
                                          {LLM_LABELS[llmKey]}
                                        </span>
                                      </div>
                                      <span className="text-xs font-medium">
                                        {rate}%
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* 상세 보기 버튼 */}
                          {onViewAnalysis && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewAnalysis(analysis.id)
                              }}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              전체 분석 결과 보기
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* 닫기 버튼 */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
