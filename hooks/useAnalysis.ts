import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AnalyzeRequest, AnalyzeResponse, AnalysisState } from '@/types'
import type { AnalysisLog } from '@/components/analysis/AnalysisProgress'

/**
 * 분석 요청 훅 (진행률 및 로그 추적 포함)
 */
export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    data: null,
    error: null,
  })
  const [logs, setLogs] = useState<AnalysisLog[]>([])
  const [progress, setProgress] = useState(0)

  const supabase = createClient()

  const addLog = (message: string, type: AnalysisLog['type'], llm?: string) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date(),
        message,
        type,
        llm,
      },
    ])
  }

  const analyze = async (request: AnalyzeRequest) => {
    setState({ status: 'loading', data: null, error: null })
    setLogs([])
    setProgress(0)

    addLog('분석 요청 시작', 'info')
    setProgress(10)

    try {
      addLog('Edge Function 호출 중...', 'warning')
      setProgress(30)

      // Edge Function 호출
      const { data, error } = await supabase.functions.invoke('smart-task', {
        body: request,
      })

      setProgress(50)
      addLog('응답 수신 완료', 'success')

      if (error) {
        addLog(`오류 발생: ${error.message}`, 'error')
        throw new Error(error.message || 'Failed to analyze')
      }

      const response: AnalyzeResponse = data

      if (!response.success) {
        addLog(`분석 실패: ${response.error?.message}`, 'error')
        throw new Error(response.error?.message || 'Analysis failed')
      }

      setProgress(70)
      addLog('결과 처리 중...', 'info')

      // 각 LLM 결과 로깅
      if (response.data) {
        const { results, summary } = response.data

        summary.successfulLLMs.forEach((llm) => {
          addLog(`분석 성공`, 'success', llm)
        })

        summary.failedLLMs.forEach((llm) => {
          addLog(`분석 실패`, 'error', llm)
        })
      }

      setProgress(100)
      addLog('분석 완료!', 'success')

      setState({
        status: 'success',
        data: response,
        error: null,
      })

      return response
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setProgress(0)
      addLog(`치명적 오류: ${error.message}`, 'error')

      setState({
        status: 'error',
        data: null,
        error,
      })

      throw error
    }
  }

  const reset = () => {
    setState({
      status: 'idle',
      data: null,
      error: null,
    })
    setLogs([])
    setProgress(0)
  }

  return {
    analyze,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    data: state.data,
    error: state.error,
    logs,
    progress,
  }
}
