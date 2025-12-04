'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Trash2, Loader2, Layers, Globe, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Analysis } from '@/lib/supabase/types'

interface AnalysisListItemProps {
  analysis: Analysis
  onDelete?: (id: string) => Promise<boolean>
  isDeleting?: boolean
}

/**
 * 분석 목록 아이템 컴포넌트 (T054)
 * 단일 쿼리 분석과 배치 분석(변형 포함) 모두 지원
 */
export function AnalysisListItem({ analysis, onDelete, isDeleting }: AnalysisListItemProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 배치 분석 여부 확인
  const isBatchAnalysis = (analysis.query_variations_count && analysis.query_variations_count > 0) ||
                          (analysis.total_queries_analyzed && analysis.total_queries_analyzed > 1)

  const totalQueries = analysis.total_queries_analyzed || 1
  const variationsCount = analysis.query_variations_count || 0

  // 집계 메트릭 파싱
  const citationMetrics = analysis.citation_metrics as {
    myDomainStats?: {
      citationRate: number
      queriesWithCitation: number
    }
    brandMentionStats?: {
      mentionRate: number
    }
  } | null

  const statusColors = {
    pending: 'bg-gray-500',
    processing: 'bg-blue-500',
    completed: 'bg-green-600',
    failed: 'bg-red-600',
  }

  const statusLabels = {
    pending: '대기',
    processing: '처리중',
    completed: '완료',
    failed: '실패',
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    console.log('[handleDelete] Called for analysis:', analysis.id)

    if (onDelete) {
      console.log('[handleDelete] Calling onDelete...')
      const success = await onDelete(analysis.id)
      console.log('[handleDelete] Result:', success)
      if (success) {
        setIsDialogOpen(false)
      }
    } else {
      console.log('[handleDelete] onDelete is undefined')
    }
  }

  return (
    <Card className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <Link href={`/analysis/${analysis.id}`} className="flex-1 min-w-0">
            <div className="space-y-2">
              {/* 상단: 쿼리 및 상태 */}
              <div className="flex items-center gap-2 flex-wrap">
                {isBatchAnalysis && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {totalQueries}개 쿼리
                  </Badge>
                )}
                <h3 className="font-medium text-lg line-clamp-1">
                  {analysis.base_query || analysis.query_text}
                </h3>
                <Badge className={statusColors[analysis.status]}>
                  {statusLabels[analysis.status]}
                </Badge>
              </div>

              {/* 중단: 도메인, 브랜드, 시간 */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {analysis.my_domain && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {analysis.my_domain}
                  </span>
                )}
                {analysis.my_brand && (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {analysis.my_brand}
                  </span>
                )}
                <span>{new Date(analysis.created_at).toLocaleString('ko-KR')}</span>
              </div>

              {/* 하단: 결과 요약 - 배치 분석 vs 단일 분석 */}
              {isBatchAnalysis && citationMetrics ? (
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="text-muted-foreground">
                    기본 + {variationsCount}개 변형
                  </span>
                  {citationMetrics.myDomainStats && citationMetrics.myDomainStats.citationRate > 0 && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Globe className="h-3 w-3 mr-1" />
                      인용률 {citationMetrics.myDomainStats.citationRate}%
                    </Badge>
                  )}
                  {citationMetrics.brandMentionStats && citationMetrics.brandMentionStats.mentionRate > 0 && (
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      <Tag className="h-3 w-3 mr-1" />
                      언급률 {citationMetrics.brandMentionStats.mentionRate}%
                    </Badge>
                  )}
                </div>
              ) : analysis.summary ? (
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span>전체 인용: {analysis.summary.totalCitations}</span>
                  <span>
                    성공: {analysis.summary.successfulLLMs.length} / 4 LLM
                  </span>
                  {analysis.summary.myDomainCited && (
                    <Badge variant="default" className="bg-green-600">
                      내 도메인 인용됨
                    </Badge>
                  )}
                </div>
              ) : null}
            </div>
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onDelete && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsDialogOpen(true)
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>분석 결과 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        이 분석 결과를 삭제하시겠습니까?
                        <br />
                        <span className="font-medium text-foreground mt-2 block">
                          &quot;{analysis.query_text}&quot;
                        </span>
                        <br />
                        삭제된 데이터는 복구할 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        type="button"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            삭제 중...
                          </>
                        ) : (
                          '삭제'
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <Link href={`/analysis/${analysis.id}`}>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
