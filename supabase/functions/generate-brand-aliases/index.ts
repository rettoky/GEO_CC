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
  query?: string  // 검색어 컨텍스트 (선택)
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

  // 디버그 정보 수집
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
  const debugInfo = {
    GOOGLE_AI_API_KEY_exists: !!apiKey,
    GOOGLE_AI_API_KEY_length: apiKey?.length || 0,
    GOOGLE_AI_API_KEY_prefix: apiKey ? apiKey.substring(0, 8) + '...' : 'N/A',
    timestamp: new Date().toISOString(),
  }

  console.log('[DEBUG] API Key Status:', JSON.stringify(debugInfo))

  try {
    const { brand, query }: GenerateAliasesRequest = await req.json()

    if (!brand || brand.trim().length === 0) {
      const errorResponse = {
        success: false,
        error: '브랜드명을 입력해주세요',
        _debug: debugInfo,
      }
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!apiKey) {
      const errorResponse = {
        success: false,
        error: 'GOOGLE_AI_API_KEY not found in environment',
        _debug: debugInfo,
      }
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 검색어 컨텍스트가 있으면 업종/분야 추론 및 관련 별칭만 생성
    const contextSection = query
      ? `
검색어 컨텍스트: "${query}"

**매우 중요한 규칙:**
1. 위 검색어를 기반으로 해당 브랜드가 어떤 업종/분야(보험, 증권, 은행 등)에서 언급되는지 추론하세요.
2. 반드시 해당 업종/분야와 결합된 별칭만 생성하세요.
3. 브랜드명 단독(예: "삼성", "samsung", "현대", "hyundai")은 절대 포함하지 마세요.
4. 업종 키워드와 결합된 형태만 허용합니다.

예시:
- 검색어: "암보험 상품 추천해줘", 브랜드: "삼성생명"
  ✅ 올바른 별칭: ["삼성생명", "Samsung Life", "삼성생명보험", "삼성 생명", "삼성생명 암보험"]
  ❌ 잘못된 별칭: ["삼성", "samsung", "Samsung"] (브랜드명 단독 - 제외해야 함)

- 검색어: "자동차보험 비교", 브랜드: "현대해상"
  ✅ 올바른 별칭: ["현대해상", "Hyundai Marine", "현대해상화재", "현대 해상", "하이카다이렉트"]
  ❌ 잘못된 별칭: ["현대", "hyundai", "Hyundai"] (브랜드명 단독 - 제외해야 함)`
      : ''

    // Gemini 2.0 Flash 호출
    const prompt = `당신은 브랜드명 전문가입니다. 다음 브랜드명에 대해 AI 검색 엔진에서 감지할 수 있는 다양한 별칭(alias)을 생성해주세요.

브랜드명: "${brand}"
${contextSection}

다음 유형의 별칭을 포함해주세요:
1. 한글 정식 명칭 (업종 포함)
2. 한글 줄임말/약칭 (업종 포함)
3. 영문 정식 명칭 (업종 포함)
4. 영문 줄임말/약칭 (업종 포함)
5. 흔히 사용되는 별명이나 속칭
6. 띄어쓰기 변형 (예: "삼성 생명" vs "삼성생명")
7. 검색어 컨텍스트와 결합된 형태 (예: "삼성생명 암보험")

**절대 포함하지 말아야 할 것:**
- 그룹명/모회사명 단독 (예: "삼성", "현대", "한화", "롯데", "신한")
- 영문 그룹명 단독 (예: "samsung", "hyundai", "hanwha", "lotte", "shinhan")
- 업종 키워드 단독 (예: "보험", "생명", "화재", "증권")
- 너무 짧거나 일반적인 단어 (3글자 미만 또는 일반 명사)
${query ? '- 검색어 컨텍스트와 관련 없는 업종의 별칭' : ''}

생성 규칙:
- 최소 3개, 최대 10개의 별칭 생성
- 모든 별칭은 해당 브랜드를 특정할 수 있어야 함
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

      console.log('[DEBUG] Before filtering:', JSON.stringify(aliases))

      // 후처리: 너무 짧거나 일반적인 별칭 필터링
      aliases = filterInvalidAliases(aliases, brand)

      console.log('[DEBUG] After filtering:', JSON.stringify(aliases))

      // 원본 브랜드명이 없으면 추가
      if (!aliases.some(a => a.toLowerCase() === brand.toLowerCase())) {
        aliases.unshift(brand)
      }

    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      // 파싱 실패 시 기본 별칭 반환
      aliases = [brand]
    }

    const successResponse = {
      success: true,
      aliases,
      _debug: debugInfo,
    }

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error generating aliases:', error)

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      _debug: debugInfo,
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * 너무 짧거나 일반적인 별칭 필터링
 * LLM이 잘못 생성한 별칭을 후처리로 제거
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
      console.log(`[DEBUG] Filtered (too short Korean): ${alias}`)
      return false
    }
    if (koreanOnly.length === 0 && englishOnly.length < 4) {
      console.log(`[DEBUG] Filtered (too short English): ${alias}`)
      return false
    }

    // 2. 제외 목록에 있는 단어와 정확히 일치하면 제외
    if (excludedWords.has(lowerAlias)) {
      console.log(`[DEBUG] Filtered (excluded word): ${alias}`)
      return false
    }

    // 3. 원본 브랜드명은 유지 (정확히 일치하는 경우)
    if (lowerAlias === originalBrand.toLowerCase()) {
      return true
    }

    // 4. 공백/특수문자 제거 후에도 제외 목록과 일치하면 제외
    const normalizedAlias = lowerAlias.replace(/[\s\-_]/g, '')
    if (excludedWords.has(normalizedAlias)) {
      console.log(`[DEBUG] Filtered (normalized excluded word): ${alias}`)
      return false
    }

    return true
  })
}
