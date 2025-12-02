/**
 * Analysis API Route
 * 4개 LLM을 병렬로 분석하는 API 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeWithAllLLMsWithTimeout, getAnalysisSummary } from '@/lib/llm/orchestrator'
import type { AnalysisResults } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel Pro: 60초 타임아웃

interface AnalyzeRequest {
  query: string
  domain?: string
  brand?: string
}

interface AnalyzeResponse {
  success: boolean
  data?: {
    results: AnalysisResults
    summary: {
      successfulLLMs: string[]
      failedLLMs: string[]
      totalCitations: number
      successRate: number
    }
  }
  error?: string
}

/**
 * POST /api/analyze
 * 쿼리를 받아 4개 LLM으로 분석
 */
export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const body = (await request.json()) as AnalyzeRequest
    const { query } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '검색어를 입력해주세요.',
        },
        { status: 400 }
      )
    }

    // 환경 변수에서 API Keys 가져오기
    const apiKeys = {
      perplexity: process.env.PERPLEXITY_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
    }

    // 최소 하나의 API Key는 있어야 함
    const hasAnyKey = Object.values(apiKeys).some((key) => key && key.length > 0)
    if (!hasAnyKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'LLM API Keys가 설정되지 않았습니다. 환경 변수를 확인해주세요.',
        },
        { status: 500 }
      )
    }

    console.log(`[Analysis] Starting analysis for query: "${query}"`)
    console.log(`[Analysis] Available APIs: ${Object.entries(apiKeys)
      .filter(([, key]) => key)
      .map(([name]) => name)
      .join(', ')
    }`)

    // 4개 LLM 병렬 분석 (타임아웃 포함)
    const results = await analyzeWithAllLLMsWithTimeout({
      query,
      apiKeys,
      onProgress: (llm, status) => {
        console.log(`[Analysis] ${llm}: ${status}`)
      },
    })

    // 요약 정보 생성
    const summary = getAnalysisSummary(results)

    console.log(`[Analysis] Completed: ${summary.successfulLLMs.length}/${4} LLMs succeeded`)
    console.log(`[Analysis] Total citations: ${summary.totalCitations}`)

    // 모든 LLM이 실패한 경우
    if (summary.successfulLLMs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '모든 LLM 분석이 실패했습니다. API Keys와 네트워크 연결을 확인해주세요.',
        },
        { status: 500 }
      )
    }

    // 부분 성공 또는 완전 성공
    return NextResponse.json({
      success: true,
      data: {
        results,
        summary,
      },
    })
  } catch (error) {
    console.error('[Analysis] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analyze/health
 * API 상태 확인
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const apiKeys = {
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  }

  return NextResponse.json({
    status: 'ok',
    availableAPIs: Object.entries(apiKeys)
      .filter(([, hasKey]) => hasKey)
      .map(([name]) => name),
    timestamp: new Date().toISOString(),
  })
}
