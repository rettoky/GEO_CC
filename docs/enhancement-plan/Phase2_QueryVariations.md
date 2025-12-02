# Phase 2: 쿼리 변형 생성 (AI)

**기간**: 1주차 후반 - 2주차 초반
**상태**: 📋 계획 완료
**의존성**: Phase 1 (데이터베이스) 완료 필요

## 목표

GPT-4o를 활용하여 기본 쿼리에서 다양한 검색 쿼리 변형을 자동 생성하고, 생성된 모든 변형에 대해 4개 LLM 분석을 수행합니다.

## 범위

### 포함 사항
- ✅ GPT-4o API 통합 (쿼리 변형 생성)
- ✅ `generate-query-variations` Edge Function
- ✅ UI 컴포넌트 (변형 생성, 선택, 승인)
- ✅ 배치 분석 오케스트레이션
- ✅ 진행 상황 실시간 표시

### 제외 사항
- ❌ 페이지 크롤링 (Phase 3)
- ❌ 경쟁사 자동 감지 (Phase 4)
- ❌ 고급 시각화 (Phase 5)

## 작업 항목

### 1. GPT-4o 통합 라이브러리

#### 파일: `lib/ai/query-generator.ts`

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface VariationGenerationInput {
  baseQuery: string
  productCategory?: string
  productName?: string
  count: number // 5-30
}

export interface GeneratedVariation {
  query: string
  type: 'demographic' | 'informational' | 'comparison' | 'recommendation'
  reasoning: string
}

export interface VariationGenerationResult {
  variations: GeneratedVariation[]
  modelUsed: string
  tokensUsed: number
  rawResponse: string
}

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
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8, // 다양성을 위해 약간 높게
      max_tokens: 2000
    })

    const responseText = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(responseText)

    return {
      variations: parsed.variations || [],
      modelUsed: completion.model,
      tokensUsed: completion.usage?.total_tokens || 0,
      rawResponse: responseText
    }
  } catch (error) {
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
  const queries = variations.map(v => v.query.toLowerCase().trim())
  const uniqueQueries = new Set(queries)
  if (uniqueQueries.size !== queries.length) {
    errors.push('중복된 쿼리가 있습니다')
  }

  // 기본 쿼리와 너무 유사한지 체크
  const tooSimilar = variations.filter(v =>
    v.query.toLowerCase() === baseQuery.toLowerCase()
  )
  if (tooSimilar.length > 0) {
    errors.push('기본 쿼리와 동일한 변형이 있습니다')
  }

  // 타입 분포 체크
  const typeCount: Record<string, number> = {}
  variations.forEach(v => {
    typeCount[v.type] = (typeCount[v.type] || 0) + 1
  })

  // 최소 2개 타입은 있어야 함
  if (Object.keys(typeCount).length < 2) {
    errors.push('변형 타입이 너무 편중되어 있습니다')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
```

### 2. Edge Function: generate-query-variations

#### 파일: `supabase/functions/generate-query-variations/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Note: Deno에서는 OpenAI를 직접 import할 수 없으므로 fetch 사용
interface GenerateVariationsRequest {
  baseQuery: string
  productCategory?: string
  productName?: string
  count: number
}

serve(async (req) => {
  try {
    const { baseQuery, productCategory, productName, count } = await req.json() as GenerateVariationsRequest

    if (!baseQuery || count < 5 || count > 30) {
      return new Response(
        JSON.stringify({ error: 'Invalid input. baseQuery required, count must be 5-30' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // GPT-4o 호출
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

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 2000
      })
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const responseText = openaiData.choices[0].message.content
    const parsed = JSON.parse(responseText)

    return new Response(
      JSON.stringify({
        variations: parsed.variations || [],
        modelUsed: openaiData.model,
        tokensUsed: openaiData.usage?.total_tokens || 0
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating variations:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### 3. UI 컴포넌트

#### 파일: `components/analysis/QueryVariationGenerator.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2 } from 'lucide-react'
import type { GeneratedVariation } from '@/lib/ai/query-generator'

interface QueryVariationGeneratorProps {
  baseQuery: string
  onVariationsGenerated: (variations: GeneratedVariation[]) => void
}

export function QueryVariationGenerator({
  baseQuery,
  onVariationsGenerated
}: QueryVariationGeneratorProps) {
  const [count, setCount] = useState<'small' | 'medium' | 'large'>('medium')
  const [productCategory, setProductCategory] = useState('')
  const [productName, setProductName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const countMap = {
    small: 10,
    medium: 15,
    large: 30
  }

  const countLabels = {
    small: '5-10개 (빠름, 약 2-3분 소요)',
    medium: '15-20개 (권장, 약 5-7분 소요)',
    large: '30개 이상 (포괄적, 약 10-15분 소요)'
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseQuery,
          productCategory: productCategory || undefined,
          productName: productName || undefined,
          count: countMap[count]
        })
      })

      if (!response.ok) {
        throw new Error('변형 생성 실패')
      }

      const data = await response.json()
      onVariationsGenerated(data.variations)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6 p-6 border rounded-lg">
      <div>
        <h3 className="text-lg font-semibold mb-2">쿼리 변형 생성</h3>
        <p className="text-sm text-gray-600">
          AI가 기본 쿼리를 바탕으로 다양한 검색 쿼리를 자동 생성합니다.
        </p>
      </div>

      <div className="space-y-4">
        {/* 기본 쿼리 (읽기 전용) */}
        <div>
          <Label>기본 쿼리</Label>
          <Input value={baseQuery} disabled />
        </div>

        {/* 상품 카테고리 (선택) */}
        <div>
          <Label>상품 카테고리 (선택사항)</Label>
          <Input
            placeholder="예: 보험, 금융상품"
            value={productCategory}
            onChange={(e) => setProductCategory(e.target.value)}
          />
        </div>

        {/* 상품명 (선택) */}
        <div>
          <Label>상품명 (선택사항)</Label>
          <Input
            placeholder="예: 메리츠화재 암보험"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </div>

        {/* 변형 개수 선택 */}
        <div>
          <Label>생성할 변형 개수</Label>
          <RadioGroup value={count} onValueChange={(v) => setCount(v as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="small" id="small" />
              <Label htmlFor="small">{countLabels.small}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="medium" />
              <Label htmlFor="medium">{countLabels.medium}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="large" id="large" />
              <Label htmlFor="large">{countLabels.large}</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            AI가 변형을 생성하는 중...
          </>
        ) : (
          `${countMap[count]}개 변형 생성하기`
        )}
      </Button>
    </div>
  )
}
```

#### 파일: `components/analysis/VariationList.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Edit2, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { GeneratedVariation } from '@/lib/ai/query-generator'

interface VariationListProps {
  variations: GeneratedVariation[]
  onChange: (variations: GeneratedVariation[]) => void
}

const typeLabels = {
  demographic: '연령/성별',
  informational: '정보성',
  comparison: '비교',
  recommendation: '추천'
}

const typeColors = {
  demographic: 'bg-blue-100 text-blue-800',
  informational: 'bg-green-100 text-green-800',
  comparison: 'bg-yellow-100 text-yellow-800',
  recommendation: 'bg-purple-100 text-purple-800'
}

export function VariationList({ variations, onChange }: VariationListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleDelete = (index: number) => {
    const newVariations = variations.filter((_, i) => i !== index)
    onChange(newVariations)
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditValue(variations[index].query)
  }

  const saveEdit = () => {
    if (editingIndex !== null) {
      const newVariations = [...variations]
      newVariations[editingIndex] = {
        ...newVariations[editingIndex],
        query: editValue
      }
      onChange(newVariations)
      setEditingIndex(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">생성된 변형 ({variations.length}개)</h4>
        <p className="text-sm text-gray-500">
          변형을 수정하거나 삭제할 수 있습니다
        </p>
      </div>

      <div className="space-y-2">
        {variations.map((variation, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex-1">
              {editingIndex === index ? (
                <div className="flex gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={saveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="font-medium">{variation.query}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {variation.reasoning}
                  </div>
                </>
              )}
            </div>

            <Badge className={typeColors[variation.type]}>
              {typeLabels[variation.type]}
            </Badge>

            <div className="flex gap-1">
              {editingIndex !== index && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit(index)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(index)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 4. 배치 분석 오케스트레이션

#### 파일: `lib/analysis/variation-orchestrator.ts`

```typescript
import { createQueryVariations } from '@/lib/supabase/queries/variations'
import type { GeneratedVariation } from '@/lib/ai/query-generator'

export interface BatchAnalysisProgress {
  stage: 'variations' | 'llm_analysis' | 'completed'
  currentVariation: number
  totalVariations: number
  currentLLM?: string
  percentage: number
}

export type ProgressCallback = (progress: BatchAnalysisProgress) => void

/**
 * 여러 쿼리 변형에 대해 순차적으로 분석 수행
 */
export async function analyzeBatchVariations(
  analysisId: string,
  baseQuery: string,
  variations: GeneratedVariation[],
  myDomain: string,
  myBrand: string,
  onProgress?: ProgressCallback
) {
  const totalSteps = variations.length * 4 // 4 LLMs per variation

  // 1. 변형을 DB에 저장
  await createQueryVariations(
    variations.map(v => ({
      analysis_id: analysisId,
      base_query: baseQuery,
      variation: v.query,
      variation_type: v.type
    }))
  )

  // 2. 각 변형에 대해 분석 수행
  const results: any[] = []

  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i]

    onProgress?.({
      stage: 'llm_analysis',
      currentVariation: i + 1,
      totalVariations: variations.length,
      percentage: (i / variations.length) * 100
    })

    // analyze-query Edge Function 호출
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          query: variation.query,
          myDomain,
          myBrand,
          analysisId // 같은 analysis_id로 저장
        })
      }
    )

    const result = await response.json()
    results.push({
      variation: variation.query,
      type: variation.type,
      result
    })
  }

  onProgress?.({
    stage: 'completed',
    currentVariation: variations.length,
    totalVariations: variations.length,
    percentage: 100
  })

  return results
}
```

### 5. API Route (Next.js)

#### 파일: `app/api/generate-variations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateQueryVariations } from '@/lib/ai/query-generator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { baseQuery, productCategory, productName, count } = body

    if (!baseQuery) {
      return NextResponse.json(
        { error: 'baseQuery is required' },
        { status: 400 }
      )
    }

    if (count < 5 || count > 30) {
      return NextResponse.json(
        { error: 'count must be between 5 and 30' },
        { status: 400 }
      )
    }

    const result = await generateQueryVariations({
      baseQuery,
      productCategory,
      productName,
      count
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in generate-variations API:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

## 통합: 메인 분석 페이지 수정

#### 파일: `app/page.tsx` (수정)

기존 파일에 쿼리 변형 생성 UI 통합:

```typescript
'use client'

import { useState } from 'react'
import { QueryVariationGenerator } from '@/components/analysis/QueryVariationGenerator'
import { VariationList } from '@/components/analysis/VariationList'
import { Button } from '@/components/ui/button'
import type { GeneratedVariation } from '@/lib/ai/query-generator'

export default function HomePage() {
  const [baseQuery, setBaseQuery] = useState('')
  const [variations, setVariations] = useState<GeneratedVariation[]>([])
  const [showGenerator, setShowGenerator] = useState(false)

  const handleStartAnalysis = async () => {
    // variations가 있으면 배치 분석
    // 없으면 단일 쿼리 분석
    if (variations.length > 0) {
      // 배치 분석 시작
      // analyzeBatchVariations() 호출
    } else {
      // 기존 단일 분석
    }
  }

  return (
    <div className="container mx-auto py-8">
      {/* 기존 쿼리 입력 UI */}

      {/* 쿼리 변형 생성 버튼 */}
      {baseQuery && !showGenerator && (
        <Button onClick={() => setShowGenerator(true)}>
          + 쿼리 변형 생성 (AI)
        </Button>
      )}

      {/* 쿼리 변형 생성기 */}
      {showGenerator && (
        <QueryVariationGenerator
          baseQuery={baseQuery}
          onVariationsGenerated={(vars) => {
            setVariations(vars)
            setShowGenerator(false)
          }}
        />
      )}

      {/* 생성된 변형 목록 */}
      {variations.length > 0 && (
        <VariationList
          variations={variations}
          onChange={setVariations}
        />
      )}

      {/* 분석 시작 버튼 */}
      <Button onClick={handleStartAnalysis}>
        {variations.length > 0
          ? `${variations.length + 1}개 쿼리 분석 시작`
          : '분석 시작'}
      </Button>
    </div>
  )
}
```

## 검증 방법

### 1. GPT-4o API 테스트

```bash
# 환경 변수 설정
export OPENAI_API_KEY=sk-...

# 테스트 스크립트 실행
node -e "
const { generateQueryVariations } = require('./lib/ai/query-generator.ts');
generateQueryVariations({
  baseQuery: '암보험',
  count: 10
}).then(result => console.log(result));
"
```

### 2. Edge Function 로컬 테스트

```bash
# Edge Function 로컬 실행
supabase functions serve generate-query-variations

# 테스트 요청
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-query-variations' \
  --header 'Content-Type: application/json' \
  --data '{"baseQuery":"암보험","count":10}'
```

### 3. UI 컴포넌트 테스트

```bash
npm run dev
# http://localhost:3000 접속
# 1. 기본 쿼리 입력
# 2. "쿼리 변형 생성" 버튼 클릭
# 3. 변형 개수 선택 후 생성
# 4. 생성된 변형 확인 (수정/삭제 테스트)
```

## 체크리스트

- [ ] `lib/ai/query-generator.ts` 생성 및 GPT-4o 통합
- [ ] `supabase/functions/generate-query-variations/index.ts` 생성
- [ ] `app/api/generate-variations/route.ts` 생성
- [ ] `QueryVariationGenerator` 컴포넌트 생성
- [ ] `VariationList` 컴포넌트 생성
- [ ] `variation-orchestrator.ts` 생성
- [ ] `app/page.tsx` 수정 (변형 생성 UI 통합)
- [ ] GPT-4o API 키 환경 변수 설정
- [ ] 변형 생성 테스트 (5개, 15개, 30개)
- [ ] 변형 품질 확인 (다양성, 타입 분포)
- [ ] 배치 분석 테스트

## 다음 단계

Phase 2 완료 후 → **Phase 3: 페이지 크롤러**로 진행

---

**예상 소요 시간**: 3-4일
**난이도**: ⭐⭐⭐ (높음 - AI 통합)
