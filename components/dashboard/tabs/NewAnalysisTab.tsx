'use client'

import { useState, useRef, useCallback } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useTrackingSection } from '@/contexts/TrackingSectionContext'
import { useAnalysis } from '@/hooks/useAnalysis'
import { useAnalysisForm } from '@/contexts/AnalysisFormContext'
import { QueryInput, type QueryInputData } from '@/components/analysis/QueryInput'
import { ErrorMessage } from '@/components/analysis/ErrorMessage'
import { AnalysisProgress } from '@/components/analysis/AnalysisProgress'
import { AllQueryResultsView, type AllQueryResultsViewHandle } from '@/components/analysis/AllQueryResultsView'
import { VisibilityDashboard } from '@/components/analysis/VisibilityDashboard'
import { CompetitorComparison } from '@/components/analysis/CompetitorComparison'
import { BrandMentionCard } from '@/components/analysis/BrandMentionCard'
import { QueryVariationGenerator } from '@/components/analysis/QueryVariationGenerator'
import { VariationList } from '@/components/analysis/VariationList'
import { BatchAnalysisProgressTracker } from '@/components/analysis/BatchAnalysisProgress'
import { LLMComparisonChart } from '@/components/analysis/LLMComparisonChart'
import { ShareButton } from '@/components/analysis/ShareButton'
import { QueryComparisonView } from '@/components/analysis/QueryComparisonView'
import { SectionSelector } from '@/components/analysis/SectionSelector'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { analyzeBatchVariations, type BatchAnalysisProgress } from '@/lib/analysis/variation-orchestrator'
import type { AnalysisResults, AnalysisSummary } from '@/types'
import type { GeneratedVariation } from '@/types/queryVariations'

interface QueryResultHistory {
  id: string
  query: string
  domain?: string
  brand?: string
  results: AnalysisResults
  summary: AnalysisSummary
  timestamp: Date
}

// Maximum number of query results to keep in history (prevents memory leaks)
const MAX_HISTORY_SIZE = 100

export function NewAnalysisTab() {
  const { selectAnalysis, setActiveTab } = useDashboard()
  const { selectSection } = useTrackingSection()
  const { analyze, isLoading, isSuccess, data, error, logs, progress } = useAnalysis()
  const { toast } = useToast()

  const {
    queryData,
    setQueryData,
    variations,
    setVariations,
    showVariationGenerator,
    setShowVariationGenerator,
  } = useAnalysisForm()

  const [batchProgress, setBatchProgress] = useState<BatchAnalysisProgress | null>(null)
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false)
  const [queryHistory, setQueryHistory] = useState<QueryResultHistory[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  const allQueryResultsRef = useRef<AllQueryResultsViewHandle>(null)

  const handleQueryInput = useCallback((inputData: QueryInputData) => {
    setQueryData(inputData)
    setVariations([])
    setShowVariationGenerator(false)
  }, [setQueryData, setVariations, setShowVariationGenerator])

  const handleSingleAnalysis = useCallback(async () => {
    if (!queryData) return

    try {
      const result = await analyze({
        query: queryData.query,
        domain: queryData.domain,
        brand: queryData.brand,
      })

      if (result?.data) {
        const historyEntry: QueryResultHistory = {
          id: crypto.randomUUID(),
          query: queryData.query,
          domain: queryData.domain,
          brand: queryData.brand,
          results: result.data.results,
          summary: result.data.summary,
          timestamp: new Date(),
        }
        setQueryHistory((prev) => {
          const updated = [...prev, historyEntry]
          // Keep only the most recent MAX_HISTORY_SIZE entries to prevent memory leaks
          return updated.length > MAX_HISTORY_SIZE
            ? updated.slice(-MAX_HISTORY_SIZE)
            : updated
        })
      }

      toast({
        title: '분석 완료',
        description: '4개 LLM의 분석 결과를 확인하세요',
      })
    } catch (err) {
      toast({
        title: '분석 실패',
        description: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
        variant: 'destructive',
      })
    }
  }, [queryData, analyze, toast])

  const handleRemoveFromHistory = useCallback((id: string) => {
    setQueryHistory((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const handleBatchAnalysis = useCallback(async () => {
    if (!queryData) return

    setIsBatchAnalyzing(true)
    setBatchProgress(null)

    try {
      const tempAnalysisId = crypto.randomUUID()

      const result = await analyzeBatchVariations(
        tempAnalysisId,
        queryData.query,
        variations,
        queryData.domain || '',
        queryData.brand || '',
        (progress) => {
          setBatchProgress(progress)
        },
        queryData.brandAliases,
        queryData.competitors,
        selectedSectionId
      )

      toast({
        title: '배치 분석 완료',
        description: `${variations.length + 1}개 쿼리에 대한 분석이 완료되었습니다.`,
      })

      // 분석 결과를 대시보드 상세 탭으로 이동
      if (result.analysisId) {
        setTimeout(() => {
          selectAnalysis(result.analysisId)
          setActiveTab('detail')
        }, 1000)
      }
    } catch (err) {
      toast({
        title: '배치 분석 실패',
        description: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다',
        variant: 'destructive',
      })
    } finally {
      setIsBatchAnalyzing(false)
    }
  }, [queryData, variations, toast, selectAnalysis, setActiveTab, selectedSectionId])

  const handleStartAnalysis = useCallback(async () => {
    if (!queryData) return

    if (variations.length > 0) {
      await handleBatchAnalysis()
    } else {
      await handleSingleAnalysis()
    }
  }, [queryData, variations, handleBatchAnalysis, handleSingleAnalysis])

  const handleSectionCreated = useCallback((sectionId: string) => {
    setSelectedSectionId(sectionId)
    selectSection(sectionId)
    toast({
      title: '섹션 생성 완료',
      description: '새 트래킹 섹션이 생성되었습니다.',
    })
  }, [selectSection, toast])

  const handleVariationsGenerated = useCallback((vars: GeneratedVariation[]) => {
    setVariations(vars)
    toast({
      title: '변형 생성 완료',
      description: `${vars.length}개의 쿼리 변형이 생성되었습니다`,
    })
  }, [setVariations, toast])

  const handleVariationsRegenerated = useCallback((vars: GeneratedVariation[]) => {
    setVariations(vars)
    toast({
      title: '변형 재생성 완료',
      description: `${vars.length}개의 쿼리 변형이 생성되었습니다`,
    })
  }, [setVariations, toast])

  const handleToggleVariationGenerator = useCallback(() => {
    setShowVariationGenerator(true)
  }, [setShowVariationGenerator])

  const handleDomainCitationClick = useCallback(() => {
    allQueryResultsRef.current?.setFilterAndScroll('myDomain')
  }, [])

  const handleBrandMentionClick = useCallback(() => {
    allQueryResultsRef.current?.setFilterAndScroll('brandMention')
  }, [])

  const handleToggleComparison = useCallback(() => {
    setShowComparison(!showComparison)
  }, [showComparison])

  const isAnalyzing = isLoading || isBatchAnalyzing

  return (
    <div className="space-y-6">
      {/* 섹션 선택기 */}
      <SectionSelector
        selectedSectionId={selectedSectionId}
        onSectionChange={setSelectedSectionId}
        onSectionCreated={handleSectionCreated}
        defaultDomain={queryData?.domain}
        defaultBrand={queryData?.brand}
      />

      <QueryInput onSubmit={handleQueryInput} isLoading={isAnalyzing} initialData={queryData} />

      {queryData && !showVariationGenerator && variations.length === 0 && !isAnalyzing && (
        <div className="flex justify-center">
          <Button
            onClick={handleToggleVariationGenerator}
            variant="outline"
            size="lg"
          >
            + 쿼리 변형 생성 (AI)
          </Button>
        </div>
      )}

      {showVariationGenerator && queryData && variations.length === 0 && (
        <QueryVariationGenerator
          baseQuery={queryData.query}
          onVariationsGenerated={handleVariationsGenerated}
        />
      )}

      {queryData && variations.length > 0 && !isAnalyzing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <QueryVariationGenerator
              baseQuery={queryData.query}
              onVariationsGenerated={handleVariationsRegenerated}
              compact
              hasVariations
            />
          </div>
          <div className="lg:col-span-2">
            <VariationList
              variations={variations}
              onChange={setVariations}
              compact
              maxHeight="350px"
            />
          </div>
        </div>
      )}

      {queryData && !isAnalyzing && !(showVariationGenerator && variations.length === 0) && (
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={handleStartAnalysis}
            size="lg"
            className="min-w-[200px]"
            disabled={!selectedSectionId}
          >
            {variations.length > 0
              ? `${variations.length + 1}개 쿼리 분석 시작`
              : '분석 시작'}
          </Button>
          {!selectedSectionId && (
            <p className="text-sm text-muted-foreground">
              분석을 시작하려면 먼저 트래킹 섹션을 선택하세요.
            </p>
          )}
        </div>
      )}

      {isBatchAnalyzing && batchProgress && queryData && (
        <BatchAnalysisProgressTracker
          progress={batchProgress}
          baseQuery={queryData.query}
        />
      )}

      {isLoading && !isBatchAnalyzing && (
        <AnalysisProgress isLoading={isLoading} logs={logs} progress={progress} />
      )}

      {error && !isLoading && (
        <ErrorMessage
          title="분석 중 오류가 발생했습니다"
          message={error.message}
        />
      )}

      {isSuccess && data?.data && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {queryHistory.length > 1 && (
                <Button
                  variant={showComparison ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleComparison}
                >
                  {showComparison ? '비교 숨기기' : `${queryHistory.length}개 쿼리 비교`}
                </Button>
              )}
            </div>
            <ShareButton
              query={queryData?.query || ''}
              domain={queryData?.domain}
              brand={queryData?.brand}
              results={data.data.results}
              summary={data.data.summary}
            />
          </div>

          {showComparison && queryHistory.length > 1 && (
            <QueryComparisonView
              queryResults={queryHistory}
              onRemoveQuery={handleRemoveFromHistory}
            />
          )}

          <VisibilityDashboard
            summary={data.data.summary}
            results={data.data.results}
            myDomain={queryData?.domain}
            myBrand={queryData?.brand}
            onDomainCitationClick={handleDomainCitationClick}
            onBrandMentionClick={handleBrandMentionClick}
          />

          <LLMComparisonChart
            results={data.data.results}
            summary={data.data.summary}
            myDomain={queryData?.domain}
            myBrand={queryData?.brand}
            brandMentionAnalysis={data.data.summary.brandMentionAnalysis}
          />

          <CompetitorComparison
            results={data.data.results}
            myDomain={queryData?.domain}
            crossValidation={data.data.crossValidation}
            section="myDomain"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CompetitorComparison
              results={data.data.results}
              myDomain={queryData?.domain}
              crossValidation={data.data.crossValidation}
              section="topCompetitors"
            />
            <BrandMentionCard
              brandMentionAnalysis={data.data.summary.brandMentionAnalysis}
              myBrand={queryData?.brand}
            />
          </div>

          <CompetitorComparison
            results={data.data.results}
            myDomain={queryData?.domain}
            crossValidation={data.data.crossValidation}
            section="ranking"
          />

          <CompetitorComparison
            results={data.data.results}
            myDomain={queryData?.domain}
            crossValidation={data.data.crossValidation}
            section="recommendations"
          />

          <AllQueryResultsView
            ref={allQueryResultsRef}
            allQueryResults={[{
              query: queryData?.query || '',
              queryType: 'base' as const,
              results: data.data.results,
              summary: data.data.summary,
            }]}
            myDomain={queryData?.domain}
            myBrand={queryData?.brand}
          />

          {data.data.summary.failedLLMs.length > 0 && (
            <ErrorMessage
              title="일부 LLM 분석 실패"
              message={`${data.data.summary.failedLLMs.join(', ')}에서 응답을 받지 못했습니다. 성공한 ${data.data.summary.successfulLLMs.length}개 LLM 결과는 위에서 확인할 수 있습니다.`}
            />
          )}
        </div>
      )}
    </div>
  )
}
