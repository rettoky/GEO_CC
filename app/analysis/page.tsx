'use client'

import { useInfiniteAnalyses } from '@/hooks/useInfiniteAnalyses'
import { AnalysisListItem } from '@/components/analysis/AnalysisListItem'
import { EmptyState } from '@/components/analysis/EmptyState'
import { LoadingSkeleton } from '@/components/analysis/LoadingSkeleton'
import { ErrorMessage } from '@/components/analysis/ErrorMessage'
import { Button } from '@/components/ui/button'

/**
 * 분석 이력 페이지 (T057-T059)
 */
export default function AnalysisHistoryPage() {
  const { analyses, isLoading, isLoadingMore, hasMore, error, loadMore } =
    useInfiniteAnalyses(20)

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return <ErrorMessage message={error.message} />
  }

  if (analyses.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">분석 이력</h1>
        <p className="text-muted-foreground mt-2">
          과거 분석 결과를 확인하세요
        </p>
      </div>

      {/* 분석 목록 (T058) */}
      <div className="space-y-3">
        {analyses.map((analysis) => (
          <AnalysisListItem key={analysis.id} analysis={analysis} />
        ))}
      </div>

      {/* 더 보기 버튼 */}
      {hasMore && (
        <div className="flex justify-center">
          <Button onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? '로딩 중...' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  )
}
