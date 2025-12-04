/**
 * Generate Query Variations API Route
 * Next.js API route for generating query variations via GPT-4o
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateQueryVariations } from '@/lib/ai/query-generator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { baseQuery, productCategory, productName, count } = body

    // 입력 검증
    if (!baseQuery) {
      return NextResponse.json({ error: 'baseQuery is required' }, { status: 400 })
    }

    if (count < 5 || count > 30) {
      return NextResponse.json(
        { error: 'count must be between 5 and 30' },
        { status: 400 }
      )
    }

    // GPT-4o를 사용하여 변형 생성
    const result = await generateQueryVariations({
      baseQuery,
      productCategory,
      productName,
      count,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error in generate-variations API:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
