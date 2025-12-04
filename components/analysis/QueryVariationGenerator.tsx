/**
 * Query Variation Generator Component
 * AI를 사용하여 쿼리 변형을 생성하는 UI
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, Sparkles, RefreshCw } from 'lucide-react'
import type { GeneratedVariation } from '@/types/queryVariations'

interface QueryVariationGeneratorProps {
  baseQuery: string
  onVariationsGenerated: (variations: GeneratedVariation[]) => void
  compact?: boolean
  hasVariations?: boolean
}

export function QueryVariationGenerator({
  baseQuery,
  onVariationsGenerated,
  compact = false,
  hasVariations = false,
}: QueryVariationGeneratorProps) {
  const [count, setCount] = useState<'small' | 'medium' | 'large'>('medium')
  const [productCategory, setProductCategory] = useState('')
  const [productName, setProductName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const countMap = {
    small: 10,
    medium: 15,
    large: 30,
  }

  const countOptions = [
    { value: 'small' as const, label: '5-10개', desc: '빠름' },
    { value: 'medium' as const, label: '15-20개', desc: '권장' },
    { value: 'large' as const, label: '30개+', desc: '포괄적' },
  ]

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
          count: countMap[count],
        }),
      })

      if (!response.ok) {
        throw new Error('변형 생성 실패')
      }

      const data = await response.json()
      onVariationsGenerated(data.variations)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  // 컴팩트 모드 UI
  if (compact) {
    return (
      <Card className="p-4 h-full">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">쿼리 변형 생성</h3>
          </div>

          {/* 기본 쿼리 */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">기본 쿼리</label>
            <div className="text-sm font-medium bg-muted/50 p-2 rounded truncate">{baseQuery}</div>
          </div>

          {/* 상품 정보 - 2컬럼 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">카테고리</label>
              <Input
                placeholder="예: 보험"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">상품명</label>
              <Input
                placeholder="예: 암보험"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* 변형 개수 - 가로 버튼 */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">생성 개수</label>
            <div className="flex gap-1">
              {countOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCount(option.value)}
                  className={`flex-1 text-center py-2 px-2 text-xs border rounded-md transition-colors ${
                    count === option.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : hasVariations ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 생성
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {countMap[count]}개 생성
              </>
            )}
          </Button>
        </div>
      </Card>
    )
  }

  // 기본 모드 UI (변형 없을 때)
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">쿼리 변형 생성</h3>
          <p className="text-sm text-gray-600">
            AI가 기본 쿼리를 바탕으로 다양한 검색 쿼리를 자동 생성합니다.
          </p>
        </div>

        <div className="space-y-4">
          {/* 기본 쿼리 (읽기 전용) */}
          <div>
            <label className="block text-sm font-medium mb-1">기본 쿼리</label>
            <Input value={baseQuery} disabled />
          </div>

          {/* 상품 카테고리 (선택) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              상품 카테고리 (선택사항)
            </label>
            <Input
              placeholder="예: 보험, 금융상품"
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
            />
          </div>

          {/* 상품명 (선택) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              상품명 (선택사항)
            </label>
            <Input
              placeholder="예: 메리츠화재 암보험"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          {/* 변형 개수 선택 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              생성할 변형 개수
            </label>
            <div className="space-y-2">
              {countOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCount(option.value)}
                  className={`w-full text-left p-3 border rounded-lg transition-colors ${
                    count === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.desc}</div>
                </button>
              ))}
            </div>
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
    </Card>
  )
}
