/**
 * GPT-4o Query Variation Generator
 * 기본 쿼리에서 다양한 검색 쿼리 변형을 생성
 */

import OpenAI from 'openai'
import type {
  VariationGenerationInput,
  GeneratedVariation,
  VariationGenerationResult,
} from '@/types/queryVariations'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * GPT-4o를 사용하여 쿼리 변형 생성
 */
export async function generateQueryVariations(
  input: VariationGenerationInput
): Promise<VariationGenerationResult> {
  const { baseQuery, productCategory, productName, count } = input

  // 프롬프트 구성
  const systemPrompt = `당신은 SEO와 검색 쿼리 전문가입니다.
사용자의 기본 검색 쿼리를 바탕으로 실제 사용자가 검색할 만한 다양한 변형 쿼리를 생성하세요.

변형 타입:
- demographic: 연령대, 성별, 직업 등 demographic 정보 포함 (예: "50대 여자 암보험", "직장인 암보험")
- informational: 정보를 찾는 쿼리 (예: "암보험이란", "암보험 종류", "암보험 보장 내용")
- comparison: 비교/순위를 찾는 쿼리 (예: "암보험 비교", "암보험 순위", "암보험 추천 순위")
- recommendation: 추천을 요청하는 쿼리 (예: "암보험 추천해줘", "암보험 어떤게 좋아", "암보험 best")

요구사항:
1. 자연스러운 한국어 구어체 사용
2. 검색 의도가 명확해야 함
3. 4가지 타입을 골고루 분포
4. 실제 사용자가 입력할 법한 쿼리
5. 중복 없이 다양한 변형`

  const userPrompt = `기본 쿼리: "${baseQuery}"
${productCategory ? `상품 카테고리: "${productCategory}"` : ''}
${productName ? `상품명: "${productName}"` : ''}

위 정보를 바탕으로 ${count}개의 다양한 검색 쿼리를 생성하세요.

JSON 형식으로 반환:
{
  "variations": [
    {
      "query": "생성된 쿼리",
      "type": "demographic | informational | comparison | recommendation",
      "reasoning": "이 변형을 생성한 이유"
    }
  ]
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8, // 다양성을 위해 약간 높게
      max_tokens: 2000,
    })

    const responseText = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(responseText)

    return {
      variations: parsed.variations || [],
      modelUsed: completion.model,
      tokensUsed: completion.usage?.total_tokens || 0,
      rawResponse: responseText,
    }
  } catch (error: any) {
    console.error('Query variation generation failed:', error)
    throw new Error(`GPT-4o API 오류: ${error.message}`)
  }
}

/**
 * 변형 품질 검증
 */
export function validateVariations(
  variations: GeneratedVariation[],
  baseQuery: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (variations.length === 0) {
    errors.push('생성된 변형이 없습니다')
  }

  // 중복 체크
  const queries = variations.map((v) => v.query.toLowerCase().trim())
  const uniqueQueries = new Set(queries)
  if (uniqueQueries.size !== queries.length) {
    errors.push('중복된 쿼리가 있습니다')
  }

  // 기본 쿼리와 너무 유사한지 체크
  const tooSimilar = variations.filter(
    (v) => v.query.toLowerCase() === baseQuery.toLowerCase()
  )
  if (tooSimilar.length > 0) {
    errors.push('기본 쿼리와 동일한 변형이 있습니다')
  }

  // 타입 분포 체크
  const typeCount: Record<string, number> = {}
  variations.forEach((v) => {
    typeCount[v.type] = (typeCount[v.type] || 0) + 1
  })

  // 최소 2개 타입은 있어야 함
  if (Object.keys(typeCount).length < 2) {
    errors.push('변형 타입이 너무 편중되어 있습니다')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
