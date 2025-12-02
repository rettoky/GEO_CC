'use client'

import { useState } from 'react'
import { useAnalysis } from '@/hooks/useAnalysis'
import { QueryInput, type QueryInputData } from '@/components/analysis/QueryInput'
import { ErrorMessage } from '@/components/analysis/ErrorMessage'
import { LLMResultCard } from '@/components/analysis/LLMResultCard'
import { AnalysisProgress } from '@/components/analysis/AnalysisProgress'
import { VisibilityDashboard } from '@/components/analysis/VisibilityDashboard'
import { CompetitorComparison } from '@/components/analysis/CompetitorComparison'
import { useToast } from '@/hooks/use-toast'

/**
 * 메인 페이지 - 쿼리 입력 및 분석 결과 표시 (T041)
 */
export default function Home() {
  const { analyze, isLoading, isSuccess, data, error, logs, progress } = useAnalysis()
  const { toast } = useToast()
  const [queryData, setQueryData] = useState<QueryInputData | null>(null)

  const handleSubmit = async (inputData: QueryInputData) => {
    setQueryData(inputData)

    try {
      await analyze({
        query: inputData.query,
        domain: inputData.domain,
        brand: inputData.brand,
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

  return (
    <div className="space-y-6">
      <QueryInput onSubmit={handleSubmit} isLoading={isLoading} />

      {/* 진행률 및 로그 (로딩 중이거나 로그가 있을 때 표시) */}
      <AnalysisProgress isLoading={isLoading} logs={logs} progress={progress} />

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
