/**
 * Generate Query Variations Edge Function
 * GPT-4o를 사용하여 쿼리 변형 생성
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface GenerateVariationsRequest {
  baseQuery: string
  productCategory?: string
  productName?: string
  count: number
}

interface GeneratedVariation {
  query: string
  type: 'demographic' | 'informational' | 'comparison' | 'recommendation'
  reasoning: string
}

serve(async (req) => {
  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  }

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { baseQuery, productCategory, productName, count } =
      (await req.json()) as GenerateVariationsRequest

    // 입력 검증
    if (!baseQuery || count < 5 || count > 30) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input. baseQuery required, count must be 5-30',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // GPT-4o 프롬프트 구성
    const systemPrompt = `당신은 SEO와 검색 쿼리 전문가입니다.
사용자의 기본 검색 쿼리를 바탕으로 실제 사용자가 검색할 만한 다양한 변형 쿼리를 생성하세요.

변형 타입:
- demographic: 연령대, 성별, 직업 등 (예: "50대 여자 암보험")
- informational: 정보성 (예: "암보험이란")
- comparison: 비교/순위 (예: "암보험 비교")
- recommendation: 추천 (예: "암보험 추천해줘")

요구사항:
1. 자연스러운 한국어
2. 4가지 타입 골고루 분포
3. 중복 없이 다양하게`

    const userPrompt = `기본 쿼리: "${baseQuery}"
${productCategory ? `상품 카테고리: "${productCategory}"` : ''}
${productName ? `상품명: "${productName}"` : ''}

${count}개의 다양한 검색 쿼리를 생성하세요.

JSON 형식:
{
  "variations": [
    {"query": "...", "type": "...", "reasoning": "..."}
  ]
}`

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // OpenAI API 호출
    const openaiResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 2000,
        }),
      }
    )

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const responseText = openaiData.choices[0].message.content
    const parsed = JSON.parse(responseText)

    // 응답 반환
    return new Response(
      JSON.stringify({
        variations: parsed.variations || [],
        modelUsed: openaiData.model,
        tokensUsed: openaiData.usage?.total_tokens || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Error generating variations:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
