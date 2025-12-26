'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
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

interface QueryResultHistory {
  id: string
  query: string
  domain?: string
  brand?: string
  results: AnalysisResults
  summary: AnalysisSummary
  timestamp: Date
}

export function NewAnalysisTab() {
  const router = useRouter()
  const { selectAnalysis, setActiveTab } = useDashboard()
  const { sections, selectSection } = useTrackingSection()
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

  const handleQueryInput = (inputData: QueryInputData) => {
    setQueryData(inputData)
    setVariations([])
    setShowVariationGenerator(false)
  }

  const handleStartAnalysis = async () => {
    if (!queryData) return

    if (variations.length > 0) {
      await handleBatchAnalysis()
    } else {
      await handleSingleAnalysis()
    }
  }

  const handleSingleAnalysis = async () => {
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
        setQueryHistory((prev) => [...prev, historyEntry])
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
  }

  const handleRemoveFromHistory = (id: string) => {
    setQueryHistory((prev) => prev.filter((q) => q.id !== id))
  }

  const handleBatchAnalysis = async () => {
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
  }

  const isAnalyzing = isLoading || isBatchAnalyzing

  return (
    <div className="space-y-6">
      {/* 섹션 선택기 */}
      <SectionSelector
        selectedSectionId={selectedSectionId}
        onSectionChange={setSelectedSectionId}
        onSectionCreated={(sectionId) => {
          setSelectedSectionId(sectionId)
          selectSection(sectionId)
          toast({
            title: '섹션 생성 완료',
            description: '새 트래킹 섹션이 생성되었습니다.',
          })
        }}
        defaultDomain={queryData?.domain}
        defaultBrand={queryData?.brand}
      />

      <QueryInput onSubmit={handleQueryInput} isLoading={isAnalyzing} initialData={queryData} />

      {queryData && !showVariationGenerator && variations.length === 0 && !isAnalyzing && (
        <div className="flex justify-center">
          <Button
            onClick={() => setShowVariationGenerator(true)}
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
          onVariationsGenerated={(vars) => {
            setVariations(vars)
            toast({
              title: '변형 생성 완료',
              description: `${vars.length}개의 쿼리 변형이 생성되었습니다`,
            })
          }}
        />
      )}

      {queryData && variations.length > 0 && !isAnalyzing && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <QueryVariationGenerator
              baseQuery={queryData.query}
              onVariationsGenerated={(vars) => {
                setVariations(vars)
                toast({
                  title: '변형 재생성 완료',
                  description: `${vars.length}개의 쿼리 변형이 생성되었습니다`,
                })
              }}
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
        <div className="flex justify-center">
          <Button onClick={handleStartAnalysis} size="lg" className="min-w-[200px]">
            {variations.length > 0
              ? `${variations.length + 1}개 쿼리 분석 시작`
              : '분석 시작'}
          </Button>
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
                  onClick={() => setShowComparison(!showComparison)}
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
            onDomainCitationClick={() => {
              allQueryResultsRef.current?.setFilterAndScroll('myDomain')
            }}
            onBrandMentionClick={() => {
              allQueryResultsRef.current?.setFilterAndScroll('brandMention')
            }}
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
