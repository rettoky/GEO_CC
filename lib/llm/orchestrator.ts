/**
 * LLM Analysis Orchestrator
 * 4개 LLM을 병렬로 호출하고 결과를 집계
 */

import type { AnalysisResults, LLMResult } from '@/types'
import { analyzeWithPerplexity } from './perplexity'
import { analyzeWithChatGPT } from './chatgpt'
import { analyzeWithGemini } from './gemini'
import { analyzeWithClaude } from './claude'

export interface AnalysisOptions {
  query: string
  apiKeys: {
    perplexity?: string
    openai?: string
    gemini?: string
    anthropic?: string
  }
  onProgress?: (llm: string, status: 'started' | 'completed' | 'failed') => void
}

/**
 * 4개 LLM을 병렬로 분석
 * Promise.allSettled를 사용하여 부분 실패 허용
 */
export async function analyzeWithAllLLMs(
  options: AnalysisOptions
): Promise<AnalysisResults> {
  const { query, apiKeys, onProgress } = options

  // 각 LLM 분석 프로미스 생성
  const analysisPromises: Record<string, Promise<LLMResult>> = {}

  if (apiKeys.perplexity) {
    onProgress?.('perplexity', 'started')
    analysisPromises.perplexity = analyzeWithPerplexity(query, apiKeys.perplexity)
      .then((result) => {
        onProgress?.('perplexity', result.success ? 'completed' : 'failed')
        return result
      })
      .catch((error) => {
        onProgress?.('perplexity', 'failed')
        return {
          success: false,
          query,
          answer: '',
          citations: [],
          error: error.message,
          metadata: { model: 'perplexity', responseTime: 0 },
        }
      })
  }

  if (apiKeys.openai) {
    onProgress?.('chatgpt', 'started')
    analysisPromises.chatgpt = analyzeWithChatGPT(query, apiKeys.openai)
      .then((result) => {
        onProgress?.('chatgpt', result.success ? 'completed' : 'failed')
        return result
      })
      .catch((error) => {
        onProgress?.('chatgpt', 'failed')
        return {
          success: false,
          query,
          answer: '',
          citations: [],
          error: error.message,
          metadata: { model: 'gpt-4o', responseTime: 0 },
        }
      })
  }

  if (apiKeys.gemini) {
    onProgress?.('gemini', 'started')
    analysisPromises.gemini = analyzeWithGemini(query, apiKeys.gemini)
      .then((result) => {
        onProgress?.('gemini', result.success ? 'completed' : 'failed')
        return result
      })
      .catch((error) => {
        onProgress?.('gemini', 'failed')
        return {
          success: false,
          query,
          answer: '',
          citations: [],
          error: error.message,
          metadata: { model: 'gemini', responseTime: 0 },
        }
      })
  }

  if (apiKeys.anthropic) {
    onProgress?.('claude', 'started')
    analysisPromises.claude = analyzeWithClaude(query, apiKeys.anthropic)
      .then((result) => {
        onProgress?.('claude', result.success ? 'completed' : 'failed')
        return result
      })
      .catch((error) => {
        onProgress?.('claude', 'failed')
        return {
          success: false,
          query,
          answer: '',
          citations: [],
          error: error.message,
          metadata: { model: 'claude', responseTime: 0 },
        }
      })
  }

  // 모든 LLM 분석 병렬 실행
  const results = await Promise.all(
    Object.entries(analysisPromises).map(async ([llm, promise]) => ({
      llm,
      result: await promise,
    }))
  )

  // AnalysisResults 형식으로 변환
  const analysisResults: AnalysisResults = {} as AnalysisResults

  for (const { llm, result } of results) {
    analysisResults[llm as keyof AnalysisResults] = result
  }

  return analysisResults
}

/**
 * 분석 결과에서 성공/실패한 LLM 목록 추출
 */
export function getAnalysisSummary(results: AnalysisResults) {
  const llms = ['perplexity', 'chatgpt', 'gemini', 'claude'] as const

  const successfulLLMs: string[] = []
  const failedLLMs: string[] = []
  let totalCitations = 0

  for (const llm of llms) {
    const result = results[llm]
    if (result) {
      if (result.success) {
        successfulLLMs.push(llm)
        totalCitations += result.citations.length
      } else {
        failedLLMs.push(llm)
      }
    }
  }

  return {
    successfulLLMs,
    failedLLMs,
    totalCitations,
    successRate: successfulLLMs.length / llms.length,
  }
}

/**
 * 각 LLM별 타임아웃 설정 (ms)
 */
export const LLM_TIMEOUTS = {
  perplexity: 30000, // 30초
  chatgpt: 30000,
  gemini: 30000,
  claude: 30000,
} as const

/**
 * 타임아웃이 있는 Promise wrapper
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
    ),
  ])
}

/**
 * 타임아웃을 적용한 분석
 */
export async function analyzeWithAllLLMsWithTimeout(
  options: AnalysisOptions
): Promise<AnalysisResults> {
  const { query, apiKeys, onProgress } = options

  // 타임아웃 적용된 분석 프로미스
  const analysisPromises: Record<string, Promise<LLMResult>> = {}

  if (apiKeys.perplexity) {
    onProgress?.('perplexity', 'started')
    analysisPromises.perplexity = withTimeout(
      analyzeWithPerplexity(query, apiKeys.perplexity),
      LLM_TIMEOUTS.perplexity,
      'Perplexity analysis timeout'
    )
      .then((result) => {
        onProgress?.('perplexity', 'completed')
        return result
      })
      .catch((error) => {
        onProgress?.('perplexity', 'failed')
        return {
          success: false,
          query,
          answer: '',
          citations: [],
          error: error.message,
          metadata: { model: 'perplexity', responseTime: LLM_TIMEOUTS.perplexity },
        }
      })
  }

  if (apiKeys.openai) {
    onProgress?.('chatgpt', 'started')
    analysisPromises.chatgpt = withTimeout(
      analyzeWithChatGPT(query, apiKeys.openai),
      LLM_TIMEOUTS.chatgpt,
      'ChatGPT analysis timeout'
    )
      .then((result) => {
        onProgress?.('chatgpt', 'completed')
        return result
      })
      .catch((error) => {
        onProgress?.('chatgpt', 'failed')
        return {
          success: false,
          query,
          answer: '',
          citations: [],
          error: error.message,
          metadata: { model: 'gpt-4o', responseTime: LLM_TIMEOUTS.chatgpt },
        }
      })
  }

  if (apiKeys.gemini) {
    onProgress?.('gemini', 'started')
    analysisPromises.gemini = withTimeout(
      analyzeWithGemini(query, apiKeys.gemini),
      LLM_TIMEOUTS.gemini,
      'Gemini analysis timeout'
    )
      .then((result) => {
        onProgress?.('gemini', 'completed')
        return result
      })
      .catch((error) => {
        onProgress?.('gemini', 'failed')
        return {
          success: false,
          query,
          answer: '',
          citations: [],
          error: error.message,
          metadata: { model: 'gemini', responseTime: LLM_TIMEOUTS.gemini },
        }
      })
  }

  if (apiKeys.anthropic) {
    onProgress?.('claude', 'started')
    analysisPromises.claude = withTimeout(
      analyzeWithClaude(query, apiKeys.anthropic),
      LLM_TIMEOUTS.claude,
      'Claude analysis timeout'
    )
      .then((result) => {
        onProgress?.('claude', 'completed')
        return result
      })
      .catch((error) => {
        onProgress?.('claude', 'failed')
        return {
          success: false,
          query,
          answer: '',
          citations: [],
          error: error.message,
          metadata: { model: 'claude', responseTime: LLM_TIMEOUTS.claude },
        }
      })
  }

  // 병렬 실행
  const results = await Promise.all(
    Object.entries(analysisPromises).map(async ([llm, promise]) => ({
      llm,
      result: await promise,
    }))
  )

  // AnalysisResults 형식으로 변환
  const analysisResults: AnalysisResults = {} as AnalysisResults

  for (const { llm, result } of results) {
    analysisResults[llm as keyof AnalysisResults] = result
  }

  return analysisResults
}
