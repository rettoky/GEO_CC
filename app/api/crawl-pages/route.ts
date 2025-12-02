/**
 * Crawl Pages API Route
 * Next.js API route for triggering page crawling
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { urls, analysisId } = body

    // 입력 검증
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 })
    }

    if (urls.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 URLs per request' },
        { status: 400 }
      )
    }

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 })
    }

    // Supabase Edge Function 호출
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured')
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/crawl-pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ urls, analysisId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Crawling failed')
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in crawl-pages API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
