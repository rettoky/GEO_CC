'use client'

import { useState } from 'react'
import { useAnalysis } from '@/hooks/useAnalysis'
import { QueryInput, type QueryInputData } from '@/components/analysis/QueryInput'
import { ErrorMessage } from '@/components/analysis/ErrorMessage'
import { LLMResultCard } from '@/components/analysis/LLMResultCard'
import { AnalysisProgress } from '@/components/analysis/AnalysisProgress'
import { VisibilityDashboard } from '@/components/analysis/VisibilityDashboard'
import { CompetitorComparison } from '@/components/analysis/CompetitorComparison'
import { QueryVariationGenerator } from '@/components/analysis/QueryVariationGenerator'
import { VariationList } from '@/components/analysis/VariationList'
import { BatchAnalysisProgressTracker } from '@/components/analysis/BatchAnalysisProgress'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { analyzeBatchVariations, type BatchAnalysisProgress } from '@/lib/analysis/variation-orchestrator'
import type { GeneratedVariation } from '@/types/queryVariations'

/**
 * 메인 페이지 - 쿼리 입력 및 분석 결과 표시 (T041)
 */
export default function Home() {
  const { analyze, isLoading, isSuccess, data, error, logs, progress } = useAnalysis()
  const { toast } = useToast()
  const [queryData, setQueryData] = useState<QueryInputData | null>(null)
  const [variations, setVariations] = useState<GeneratedVariation[]>([])
  const [showVariationGenerator, setShowVariationGenerator] = useState(false)
  const [batchProgress, setBatchProgress] = useState<BatchAnalysisProgress | null>(null)
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false)

  const handleQueryInput = (inputData: QueryInputData) => {
    setQueryData(inputData)
    setVariations([]) // 쿼리 변경 시 기존 변형 초기화
    setShowVariationGenerator(false)
  }

  const handleStartAnalysis = async () => {
    if (!queryData) return

    // 변형이 있으면 배치 분석, 없으면 단일 분석
    if (variations.length > 0) {
      await handleBatchAnalysis()
    } else {
      await handleSingleAnalysis()
    }
  }

  const handleSingleAnalysis = async () => {
    if (!queryData) return

    try {
      await analyze({
        query: queryData.query,
        domain: queryData.domain,
        brand: queryData.brand,
      })

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

  const handleBatchAnalysis = async () => {
    if (!queryData) return

    setIsBatchAnalyzing(true)
    setBatchProgress(null)

    try {
      // 임시 분석 ID 생성 (실제로는 서버에서 생성해야 함)
      const tempAnalysisId = crypto.randomUUID()

      await analyzeBatchVariations(
        tempAnalysisId,
        queryData.query,
        variations,
        queryData.domain || '',
        queryData.brand || '',
        (progress) => {
          setBatchProgress(progress)
        }
      )

      toast({
        title: '배치 분석 완료',
        description: `${variations.length}개 변형에 대한 분석이 완료되었습니다`,
      })
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
      <QueryInput onSubmit={handleQueryInput} isLoading={isAnalyzing} />

      {/* 쿼리 변형 생성 버튼 */}
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

      {/* 쿼리 변형 생성기 */}
      {showVariationGenerator && queryData && (
        <QueryVariationGenerator
          baseQuery={queryData.query}
          onVariationsGenerated={(vars) => {
            setVariations(vars)
            setShowVariationGenerator(false)
            toast({
              title: '변형 생성 완료',
              description: `${vars.length}개의 쿼리 변형이 생성되었습니다`,
            })
          }}
        />
      )}

      {/* 생성된 변형 목록 */}
      {variations.length > 0 && !isAnalyzing && (
        <VariationList variations={variations} onChange={setVariations} />
      )}

      {/* 분석 시작 버튼 */}
      {queryData && !isAnalyzing && !showVariationGenerator && (
        <div className="flex justify-center">
          <Button onClick={handleStartAnalysis} size="lg" className="min-w-[200px]">
            {variations.length > 0
              ? `${variations.length + 1}개 쿼리 분석 시작`
              : '분석 시작'}
          </Button>
        </div>
      )}

      {/* 배치 분석 진행률 */}
      {isBatchAnalyzing && batchProgress && queryData && (
        <BatchAnalysisProgressTracker
          progress={batchProgress}
          baseQuery={queryData.query}
        />
      )}

      {/* 단일 분석 진행률 및 로그 */}
      {isLoading && !isBatchAnalyzing && (
        <AnalysisProgress isLoading={isLoading} logs={logs} progress={progress} />
      )}

      {/* 에러 상태 (T042 - 부분 실패 처리) */}
      {error && !isLoading && (
        <ErrorMessage
          title="분석 중 오류가 발생했습니다"
          message={error.message}
        />
      )}

      {/* 성공 상태 - 결과 표시 */}
      {isSuccess && data?.data && (
        <div className="space-y-6">
          {/* 핵심 지표: 내 도메인/브랜드 노출 현황 */}
          <VisibilityDashboard
            summary={data.data.summary}
            results={data.data.results}
            myDomain={queryData?.domain}
            myBrand={queryData?.brand}
          />

          {/* 경쟁사 비교 분석 */}
          <CompetitorComparison
            results={data.data.results}
            myDomain={queryData?.domain}
          />

          {/* LLM별 상세 결과 (접어둔 상태) */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">LLM별 상세 결과</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LLMResultCard
                llmName="Perplexity"
                result={data.data.results.perplexity}
                targetDomain={queryData?.domain}
              />
              <LLMResultCard
                llmName="ChatGPT"
                result={data.data.results.chatgpt}
                targetDomain={queryData?.domain}
              />
              <LLMResultCard
                llmName="Gemini"
                result={data.data.results.gemini}
                targetDomain={queryData?.domain}
              />
              <LLMResultCard
                llmName="Claude"
                result={data.data.results.claude}
                targetDomain={queryData?.domain}
              />
            </div>
          </div>

          {/* 부분 실패 경고 */}
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
