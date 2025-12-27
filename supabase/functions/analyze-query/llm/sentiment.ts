/**
 * Sentiment Analysis Module
 * Gemini 2.0 Flash를 사용한 브랜드 언급 감성 분석
 */

import type { LLMType, SentimentType, SentimentResult, BrandMentionSentiment } from './types.ts'

/**
 * 감성 분석에 사용할 문맥 정보
 */
interface ContextWithSource {
  context: string
  llmSource: LLMType
}

/**
 * 브랜드 언급의 감성을 분석
 * @param contexts 분석할 문맥과 출처 LLM 목록
 * @param brand 브랜드명
 * @param apiKey Google AI API 키
 * @returns 감성 분석 결과 배열
 */
export async function analyzeBrandSentiments(
  contexts: ContextWithSource[],
  brand: string,
  apiKey: string
): Promise<BrandMentionSentiment[]> {
  if (contexts.length === 0 || !apiKey) {
    return []
  }

  try {
    // 프롬프트 생성
    const prompt = buildSentimentPrompt(contexts, brand)

    // Gemini API 호출
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
            temperature: 0.1, // 일관된 결과를 위해 낮은 temperature
            maxOutputTokens: 2000,
          },
        }),
      }
    )

    if (!response.ok) {
      console.error('[Sentiment] Gemini API error:', response.status)
      return []
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') || ''

    // JSON 파싱
    const results = parseSentimentResponse(text, contexts)
    console.log('[Sentiment] Analysis completed:', {
      brand,
      contextsCount: contexts.length,
      resultsCount: results.length
    })

    return results
  } catch (error) {
    console.error('[Sentiment] Analysis failed:', error)
    return []
  }
}

/**
 * 감성 분석 프롬프트 생성
 */
function buildSentimentPrompt(contexts: ContextWithSource[], brand: string): string {
  const contextList = contexts.map((c, i) =>
    `[${i + 1}] "${c.context}" (출처: ${c.llmSource})`
  ).join('\n')

  return `당신은 브랜드 감성 분석 전문가입니다. 다음 문맥에서 "${brand}" 브랜드가 어떻게 언급되었는지 분석하세요.

분석 기준:
- positive (긍정): 추천, 칭찬, 장점 강조, 긍정적 평가, 만족 표현
- negative (부정): 비판, 불만, 단점 지적, 부정적 평가, 경고
- neutral (중립): 단순 정보 제공, 객관적 비교, 중립적 설명

분석할 문맥:
${contextList}

다음 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 반환:
{
  "analyses": [
    {
      "index": 1,
      "sentiment": "positive" | "negative" | "neutral",
      "confidence": 0.0-1.0,
      "reason": "간단한 이유 (20자 이내)"
    }
  ]
}

각 문맥에 대해 반드시 분석 결과를 제공하세요.`
}

/**
 * Gemini 응답 파싱
 */
function parseSentimentResponse(
  text: string,
  originalContexts: ContextWithSource[]
): BrandMentionSentiment[] {
  try {
    // JSON 추출
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(cleanText)

    if (!parsed.analyses || !Array.isArray(parsed.analyses)) {
      console.error('[Sentiment] Invalid response format:', cleanText.substring(0, 200))
      return createDefaultResults(originalContexts)
    }

    const results: BrandMentionSentiment[] = []

    for (const analysis of parsed.analyses) {
      const index = analysis.index - 1 // 1-based to 0-based
      if (index < 0 || index >= originalContexts.length) continue

      const originalContext = originalContexts[index]
      const sentiment = validateSentiment(analysis.sentiment)
      const confidence = validateConfidence(analysis.confidence)

      results.push({
        context: originalContext.context,
        sentiment,
        confidence,
        reason: analysis.reason || getDefaultReason(sentiment),
        llmSource: originalContext.llmSource,
      })
    }

    // 누락된 문맥에 대해 기본값 추가
    if (results.length < originalContexts.length) {
      const analyzedIndices = new Set(parsed.analyses.map((a: { index: number }) => a.index - 1))
      for (let i = 0; i < originalContexts.length; i++) {
        if (!analyzedIndices.has(i)) {
          results.push({
            context: originalContexts[i].context,
            sentiment: 'neutral',
            confidence: 0.5,
            reason: '분석 불가',
            llmSource: originalContexts[i].llmSource,
          })
        }
      }
    }

    return results
  } catch (error) {
    console.error('[Sentiment] Parse error:', error)
    return createDefaultResults(originalContexts)
  }
}

/**
 * 감성 유형 유효성 검사
 */
function validateSentiment(value: unknown): SentimentType {
  if (value === 'positive' || value === 'negative' || value === 'neutral') {
    return value
  }
  return 'neutral'
}

/**
 * 신뢰도 유효성 검사
 */
function validateConfidence(value: unknown): number {
  if (typeof value === 'number' && value >= 0 && value <= 1) {
    return Math.round(value * 100) / 100 // 소수점 2자리
  }
  return 0.5
}

/**
 * 기본 이유 메시지
 */
function getDefaultReason(sentiment: SentimentType): string {
  switch (sentiment) {
    case 'positive':
      return '긍정적 언급'
    case 'negative':
      return '부정적 언급'
    case 'neutral':
    default:
      return '중립적 정보'
  }
}

/**
 * 기본 결과 생성 (파싱 실패 시)
 */
function createDefaultResults(contexts: ContextWithSource[]): BrandMentionSentiment[] {
  return contexts.map((c) => ({
    context: c.context,
    sentiment: 'neutral' as SentimentType,
    confidence: 0.5,
    reason: '분석 불가',
    llmSource: c.llmSource,
  }))
}

/**
 * 감성 분석 요약 통계 계산
 */
export function calculateSentimentSummary(
  sentiments: BrandMentionSentiment[]
): {
  positiveCount: number
  negativeCount: number
  neutralCount: number
  positiveRate: number
  negativeRate: number
  avgConfidence: number
  sentimentScore: number
} {
  const total = sentiments.length
  if (total === 0) {
    return {
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      positiveRate: 0,
      negativeRate: 0,
      avgConfidence: 0,
      sentimentScore: 0,
    }
  }

  const positiveCount = sentiments.filter(s => s.sentiment === 'positive').length
  const negativeCount = sentiments.filter(s => s.sentiment === 'negative').length
  const neutralCount = sentiments.filter(s => s.sentiment === 'neutral').length

  const avgConfidence = sentiments.reduce((sum, s) => sum + s.confidence, 0) / total

  // 감성 점수: -100 ~ +100
  // 긍정 +1, 부정 -1, 중립 0으로 가중 평균
  const sentimentScore = Math.round(
    ((positiveCount - negativeCount) / total) * 100
  )

  return {
    positiveCount,
    negativeCount,
    neutralCount,
    positiveRate: Math.round((positiveCount / total) * 100),
    negativeRate: Math.round((negativeCount / total) * 100),
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    sentimentScore,
  }
}
