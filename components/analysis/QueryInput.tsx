'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { z } from 'zod'

/**
 * 쿼리 입력 검증 스키마 (T034)
 */
export const queryInputSchema = z.object({
  query: z.string().min(1, '쿼리를 입력해주세요').max(500, '쿼리는 500자 이하여야 합니다'),
  domain: z.string().optional(),
  brand: z.string().optional(),
})

export type QueryInputData = z.infer<typeof queryInputSchema>

interface QueryInputProps {
  onSubmit: (data: QueryInputData) => void
  isLoading: boolean
}

/**
 * 쿼리 입력 폼 컴포넌트 (T033)
 */
export function QueryInput({ onSubmit, isLoading }: QueryInputProps) {
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState('')
  const [brand, setBrand] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // 유효성 검증 (T034)
    const result = queryInputSchema.safeParse({ query, domain, brand })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    onSubmit(result.data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 검색 엔진 인용 분석</CardTitle>
        <CardDescription>
          Perplexity, ChatGPT, Gemini, Claude 4개 AI 검색 엔진에서 내 도메인이 어떻게 인용되는지 확인하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="query" className="text-sm font-medium">
              검색 쿼리 <span className="text-red-500">*</span>
            </label>
            <Input
              id="query"
              type="text"
              placeholder="예: Next.js 서버 사이드 렌더링 방법"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              className={errors.query ? 'border-red-500' : ''}
            />
            {errors.query && (
              <p className="text-sm text-red-500">{errors.query}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="domain" className="text-sm font-medium">
              타겟 도메인 (선택)
            </label>
            <Input
              id="domain"
              type="text"
              placeholder="예: example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={isLoading}
              className={errors.domain ? 'border-red-500' : ''}
            />
            {errors.domain && (
              <p className="text-sm text-red-500">{errors.domain}</p>
            )}
            <p className="text-sm text-muted-foreground">
              내 도메인을 입력하면 인용 여부를 강조 표시합니다
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="brand" className="text-sm font-medium">
              브랜드명 (선택)
            </label>
            <Input
              id="brand"
              type="text"
              placeholder="예: MyBrand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={isLoading}
              className={errors.brand ? 'border-red-500' : ''}
            />
            {errors.brand && (
              <p className="text-sm text-red-500">{errors.brand}</p>
            )}
            <p className="text-sm text-muted-foreground">
              브랜드명을 입력하면 답변 내 언급 횟수를 확인할 수 있습니다
            </p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? '분석 중...' : '분석 시작'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
