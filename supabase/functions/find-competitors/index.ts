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

interface FindCompetitorsRequest {
  brand?: string
  domain?: string
  query?: string
}

interface CompetitorBrand {
  name: string
  aliases: string[]
}

interface FindCompetitorsResponse {
  success: boolean
  competitors?: CompetitorBrand[]
  error?: string
}

/**
 * find-competitors Edge Function
 * Gemini 2.0 Flash + 웹검색을 사용하여 경쟁사 브랜드를 자동 찾기
 */
Deno.serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    })
  }

  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')

  try {
    const { brand, domain, query }: FindCompetitorsRequest = await req.json()

    if (!brand && !domain) {
      return new Response(JSON.stringify({
        success: false,
        error: '브랜드명 또는 도메인을 입력해주세요',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'GOOGLE_AI_API_KEY not found in environment',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 검색어에서 업종 추론
    const industryContext = query
      ? `검색어 "${query}"를 기반으로 해당 업종/분야를 파악하고, 그 업종의 경쟁사만 찾으세요.`
      : ''

    // 브랜드/도메인 정보
    const targetInfo = brand && domain
      ? `브랜드: "${brand}", 도메인: "${domain}"`
      : brand
        ? `브랜드: "${brand}"`
        : `도메인: "${domain}"`

    // Gemini 2.0 Flash + Google Search 호출
    const prompt = `당신은 시장 조사 전문가입니다. 다음 정보를 기반으로 경쟁사 브랜드를 찾아주세요.

대상 정보: ${targetInfo}
${industryContext}

다음 작업을 수행하세요:

1. 웹 검색을 통해 해당 브랜드/도메인이 속한 업종을 파악하세요.
2. 같은 업종에서 경쟁 관계에 있는 주요 브랜드 5-10개를 찾으세요.
3. 각 경쟁사 브랜드에 대해 다양한 별칭(한글명, 영문명, 줄임말, 정식명칭)을 제공하세요.

중요:
- 실제로 해당 업종에서 경쟁하는 브랜드만 포함하세요.
- 대상 브랜드(${brand || domain})는 경쟁사 목록에서 제외하세요.
- 각 브랜드별로 최소 2개 이상의 별칭을 제공하세요.
- 가장 유명하고 점유율이 높은 경쟁사를 우선으로 포함하세요.

다음 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 반환:
{
  "industry": "업종명",
  "competitors": [
    {"name": "브랜드명1", "aliases": ["별칭1", "별칭2", "영문명"]},
    {"name": "브랜드명2", "aliases": ["별칭1", "별칭2", "영문명"]}
  ]
}`

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
          tools: [
            {
              googleSearch: {},
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('[DEBUG find-competitors] Gemini response:', JSON.stringify(data))

    const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') || ''

    // JSON 추출 (마크다운 코드 블록 제거)
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    let competitors: CompetitorBrand[] = []
    try {
      const parsed = JSON.parse(cleanText)

      if (parsed.competitors && Array.isArray(parsed.competitors)) {
        competitors = parsed.competitors
          .filter((c: { name?: string; aliases?: string[] }) =>
            c.name && typeof c.name === 'string' && c.name.trim().length > 0
          )
          .map((c: { name: string; aliases?: string[] }) => {
            const name = c.name.trim()
            const rawAliases = Array.isArray(c.aliases)
              ? [...new Set([name, ...c.aliases.filter((a: string) => typeof a === 'string' && a.trim().length > 0).map((a: string) => a.trim())])]
              : [name]

            // 단독 그룹명/짧은 별칭 필터링
            const filteredAliases = filterInvalidAliases(rawAliases, name)

            return {
              name,
              aliases: filteredAliases.length > 0 ? filteredAliases : [name],
            }
          })
          // 대상 브랜드 제외
          .filter((c: CompetitorBrand) => {
            const targetLower = (brand || domain || '').toLowerCase()
            return !c.name.toLowerCase().includes(targetLower) &&
                   !targetLower.includes(c.name.toLowerCase())
          })
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      return new Response(JSON.stringify({
        success: false,
        error: '경쟁사 분석 결과를 파싱할 수 없습니다',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      competitors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error finding competitors:', error)

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * 너무 짧거나 일반적인 별칭 필터링
 * 단독 그룹명, 업종 키워드 등을 제외
 */
function filterInvalidAliases(aliases: string[], originalBrand: string): string[] {
  // 제외할 일반적인 그룹명/단어 목록
  // 주의: 단독 브랜드(라이나, AIA, 캐롯, 처브, 악사 등)는 제외하지 않음
  const excludedWords = new Set([
    // 한글 그룹명 (다수 계열사가 있는 그룹만)
    '삼성', '현대', '한화', '롯데', '신한', 'lg', '엘지', 'sk', '에스케이',
    'kb', '케이비', 'nh', '농협', 'db', '디비', 'mg', '카카오', '네이버',
    '교보', '동양', '흥국', '미래에셋', '하나', '우리', '기업', '국민', '메리츠',
    // 영문 그룹명
    'samsung', 'hyundai', 'hanwha', 'lotte', 'shinhan', 'kakao', 'naver',
    'kyobo', 'hana', 'woori', 'meritz',
    // 업종 키워드 단독
    '보험', '생명', '화재', '손해', '손보', '증권', '은행', '캐피탈',
    '자산운용', '투자', '금융', '카드', '저축은행',
    'insurance', 'life', 'fire', 'marine', 'securities', 'bank', 'capital',
    'asset', 'investment', 'finance', 'card',
    // 일반적인 단어
    'direct', 'online', 'mobile', 'smart', 'plus', 'pro', 'new',
    '다이렉트', '온라인', '모바일', '스마트', '플러스',
  ])

  return aliases.filter(alias => {
    const lowerAlias = alias.toLowerCase().trim()

    // 1. 너무 짧은 별칭 제외 (한글 2자, 영문 4자 미만)
    const koreanOnly = alias.replace(/[a-zA-Z0-9\s]/g, '')
    const englishOnly = alias.replace(/[^a-zA-Z]/g, '')

    if (koreanOnly.length > 0 && koreanOnly.length < 2) {
      return false
    }
    if (koreanOnly.length === 0 && englishOnly.length < 4) {
      return false
    }

    // 2. 제외 목록에 있는 단어와 정확히 일치하면 제외
    if (excludedWords.has(lowerAlias)) {
      return false
    }

    // 3. 원본 브랜드명은 유지 (정확히 일치하는 경우)
    if (lowerAlias === originalBrand.toLowerCase()) {
      return true
    }

    // 4. 공백/특수문자 제거 후에도 제외 목록과 일치하면 제외
    const normalizedAlias = lowerAlias.replace(/[\s\-_]/g, '')
    if (excludedWords.has(normalizedAlias)) {
      return false
    }

    return true
  })
}
