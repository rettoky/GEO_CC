import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  AnalyzeRequest,
  AnalyzeResponse,
} from '@/supabase/functions/analyze-query/llm/types'

/**
 * POST /api/analyze
 * Supabase Edge Function (analyze-query) 호출을 위한 Next.js API Proxy
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 파싱
    const body: AnalyzeRequest = await request.json()

    // 입력 검증
    if (!body.query || body.query.trim().length === 0) {
      const errorResponse: AnalyzeResponse = {
        success: false,
        analysisId: '',
        error: {
          message: 'Query is required',
          code: 'INVALID_INPUT',
        },
      }

      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Supabase 클라이언트 생성
    const supabase = await createClient()

    // Edge Function 호출
    const { data, error } = await supabase.functions.invoke<AnalyzeResponse>(
      'analyze-query',
      {
        body: {
          query: body.query,
          domain: body.domain,
          brand: body.brand,
        },
      }
    )

    // Edge Function 호출 실패
    if (error) {
      console.error('Edge Function invocation error:', error)

      const errorResponse: AnalyzeResponse = {
        success: false,
        analysisId: '',
        error: {
          message: error.message || 'Failed to invoke Edge Function',
          code: 'EDGE_FUNCTION_ERROR',
        },
      }

      return NextResponse.json(errorResponse, { status: 500 })
    }

    // Edge Function 응답 반환
    return NextResponse.json(data)
  } catch (error) {
    console.error('API route error:', error)

    const errorResponse: AnalyzeResponse = {
      success: false,
      analysisId: '',
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
