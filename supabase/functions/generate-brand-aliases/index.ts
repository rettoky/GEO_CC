// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

/**
 * CORS 헤더 설정
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GenerateAliasesRequest {
  brand: string
}

interface GenerateAliasesResponse {
  success: boolean
  aliases?: string[]
  error?: string
}

/**
 * generate-brand-aliases Edge Function
 * Gemini 2.0 Flash를 사용하여 브랜드 별칭을 자동 생성
 */
Deno.serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const { brand }: GenerateAliasesRequest = await req.json()

    if (!brand || brand.trim().length === 0) {
      const errorResponse: GenerateAliasesResponse = {
        success: false,
        error: '브랜드명을 입력해주세요',
      }
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not found')
    }

    // Gemini 2.0 Flash 호출
    const prompt = `당신은 브랜드명 전문가입니다. 다음 브랜드명에 대해 AI 검색 엔진에서 감지할 수 있는 다양한 별칭(alias)을 생성해주세요.

브랜드명: "${brand}"

다음 유형의 별칭을 포함해주세요:
1. 한글 정식 명칭
2. 한글 줄임말/약칭
3. 영문 정식 명칭 (있는 경우)
4. 영문 줄임말/약칭
5. 흔히 사용되는 별명이나 속칭
6. 띄어쓰기 변형 (예: "삼성 화재" vs "삼성화재")
7. 대소문자 변형 (영문의 경우)

중요:
- 실제로 사람들이 검색하거나 언급할 때 사용하는 표현만 포함
- 너무 일반적인 단어는 제외 (예: "보험", "생명" 단독 사용 제외)
- 최소 3개, 최대 10개의 별칭 생성
- 중복 제거

JSON 배열 형식으로만 응답해주세요. 다른 텍스트 없이 배열만 반환:
["별칭1", "별칭2", "별칭3", ...]`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3, // 일관성 있는 결과를 위해 낮은 temperature
            maxOutputTokens: 500,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('[DEBUG] Gemini response:', JSON.stringify(data))

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // JSON 배열 추출 (마크다운 코드 블록 제거)
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    let aliases: string[] = []
    try {
      aliases = JSON.parse(cleanText)

      // 유효성 검증
      if (!Array.isArray(aliases)) {
        throw new Error('Invalid response format')
      }

      // 문자열만 필터링하고 중복 제거
      aliases = [...new Set(aliases.filter(a => typeof a === 'string' && a.trim().length > 0))]

      // 원본 브랜드명이 없으면 추가
      if (!aliases.some(a => a.toLowerCase() === brand.toLowerCase())) {
        aliases.unshift(brand)
      }

    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      // 파싱 실패 시 기본 별칭 반환
      aliases = [brand]
    }

    const successResponse: GenerateAliasesResponse = {
      success: true,
      aliases,
    }

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error generating aliases:', error)

    const errorResponse: GenerateAliasesResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
