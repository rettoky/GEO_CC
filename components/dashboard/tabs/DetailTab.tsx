'use client'

import { useEffect, useState } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useTrackingSection } from '@/contexts/TrackingSectionContext'
import { useInfiniteAnalyses } from '@/hooks/useInfiniteAnalyses'
import { AnalysisListItem } from '@/components/analysis/AnalysisListItem'
import { EmptyState } from '@/components/analysis/EmptyState'
import { LoadingSkeleton } from '@/components/analysis/LoadingSkeleton'
import { ErrorMessage } from '@/components/analysis/ErrorMessage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { Analysis } from '@/lib/supabase/types'

// AnalysisDetailClient의 주요 로직을 가져옴
import { AnalysisDetailView } from './AnalysisDetailView'

export function DetailTab() {
  const { selectedAnalysisId, selectedAnalysis, selectAnalysis, searchQuery, filters } = useDashboard()
  const { sections } = useTrackingSection()
  const { analyses, isLoading, isLoadingMore, isDeleting, hasMore, error, loadMore, deleteAnalysis } =
    useInfiniteAnalyses(20)
  const { toast } = useToast()
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailAnalysis, setDetailAnalysis] = useState<Analysis | null>(selectedAnalysis)
  const [filterSectionId, setFilterSectionId] = useState<string | null>(null)

  // 선택된 분석 ID가 변경되면 상세 데이터 로드
  useEffect(() => {
    if (selectedAnalysisId && !selectedAnalysis) {
      loadAnalysisDetail(selectedAnalysisId)
    } else if (selectedAnalysis) {
      setDetailAnalysis(selectedAnalysis)
    }
  }, [selectedAnalysisId, selectedAnalysis])

  const loadAnalysisDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setDetailAnalysis(data)
    } catch (error) {
      console.error('분석 상세 로드 오류:', error)
      toast({
        title: '로드 실패',
        description: '분석 상세를 불러오는데 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleDelete = async (id: string): Promise<boolean> => {
    const success = await deleteAnalysis(id)
    if (success) {
      toast({
        title: '삭제 완료',
        description: '분석 결과가 삭제되었습니다.',
      })
      // 삭제된 항목이 현재 선택된 항목이면 선택 해제
      if (id === selectedAnalysisId) {
        selectAnalysis(null)
        setDetailAnalysis(null)
      }
    } else {
      toast({
        title: '삭제 실패',
        description: '분석 결과를 삭제하는데 실패했습니다.',
        variant: 'destructive',
      })
    }
    return success
  }

  const handleSelectAnalysis = (analysis: Analysis) => {
    selectAnalysis(analysis.id, analysis)
    setDetailAnalysis(analysis)
  }

  // 필터 적용
  const filteredAnalyses = analyses.filter((analysis) => {
    // 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchQuery = analysis.query_text?.toLowerCase().includes(query) ||
        analysis.base_query?.toLowerCase().includes(query)
      const matchDomain = analysis.my_domain?.toLowerCase().includes(query)
      const matchBrand = analysis.my_brand?.toLowerCase().includes(query)
      if (!matchQuery && !matchDomain && !matchBrand) return false
    }

    // 날짜 필터
    if (filters.dateRange !== 'all') {
      const analysisDate = new Date(analysis.created_at)
      const now = new Date()
      const daysDiff = (now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60 * 24)

      if (filters.dateRange === 'today' && daysDiff > 1) return false
      if (filters.dateRange === '7days' && daysDiff > 7) return false
      if (filters.dateRange === '30days' && daysDiff > 30) return false
    }

    // 상태 필터
    if (filters.status !== 'all') {
      if (filters.status === 'completed' && analysis.status !== 'completed') return false
      if (filters.status === 'failed' && analysis.status !== 'failed') return false
    }

    // 섹션 필터
    if (filterSectionId) {
      if (analysis.section_id !== filterSectionId) return false
    }

    return true
  })

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return <ErrorMessage message={error.message} />
  }

  // 분석 선택됨 - 상세 보기
  if (selectedAnalysisId && detailAnalysis) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            selectAnalysis(null)
            setDetailAnalysis(null)
          }}
        >
          &larr; 목록으로 돌아가기
        </Button>
        {loadingDetail ? (
          <LoadingSkeleton />
        ) : (
          <AnalysisDetailView analysis={detailAnalysis} />
        )}
      </div>
    )
  }

  // 분석 목록
  if (filteredAnalyses.length === 0) {
    if (analyses.length === 0) {
      return <EmptyState />
    }
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-center">
            검색 결과가 없습니다.
            <br />
            필터를 조정하거나 검색어를 변경해보세요.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAnalyses.length}개 분석
          {searchQuery && ` (검색: "${searchQuery}")`}
          {filterSectionId && sections.find(s => s.id === filterSectionId) &&
            ` (섹션: ${sections.find(s => s.id === filterSectionId)?.name})`}
        </p>
        <Select
          value={filterSectionId || 'all'}
          onValueChange={(value) => setFilterSectionId(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="모든 섹션" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 섹션</SelectItem>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: section.color }}
                  />
                  <span>{section.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[calc(100vh-400px)] pr-4">
        <div className="space-y-3">
          {filteredAnalyses.map((analysis) => (
            <div
              key={analysis.id}
              onClick={() => handleSelectAnalysis(analysis)}
              className="cursor-pointer"
            >
              <AnalysisListItem
                analysis={analysis}
                onDelete={handleDelete}
                isDeleting={isDeleting === analysis.id}
              />
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center py-4">
            <Button onClick={loadMore} disabled={isLoadingMore} variant="outline">
              {isLoadingMore ? '로딩 중...' : '더 보기'}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
