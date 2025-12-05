'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { z } from 'zod'
import { Search, Globe, Tag, ArrowRight, Sparkles, HelpCircle, Wand2, Loader2 } from 'lucide-react'
import { LABELS, PLACEHOLDERS } from '@/lib/constants/labels'

// 도움말 툴팁 데이터
const HELP_CONTENT = {
  query: {
    title: '검색어란?',
    description: 'AI 검색 엔진에 입력할 검색어입니다. 실제 사용자가 검색할 것 같은 자연스러운 문장을 입력하세요.',
    examples: [
      '암보험 추천해줘',
      '2024년 최고의 노트북',
      '서울 강남 맛집 추천',
      '프로그래밍 배우는 방법',
    ],
  },
  domain: {
    title: '내 도메인이란?',
    description: 'AI 응답에서 인용 여부를 확인할 웹사이트 도메인입니다. 해당 도메인이 AI 응답에 인용되는지 분석합니다.',
    examples: [
      'example.com',
      'naver.com',
      'tistory.com',
    ],
    tip: 'www 없이 도메인만 입력하세요',
  },
  brand: {
    title: '브랜드명이란?',
    description: 'AI 응답 텍스트에서 언급 여부를 확인할 브랜드나 회사명입니다. 도메인 인용과 별개로 텍스트에서 브랜드명이 언급되는지 확인합니다.',
    examples: [
      '삼성전자',
      '메리츠화재',
      '카카오',
      'Apple',
    ],
    tip: '정확한 브랜드명을 입력하세요',
  },
  brandAliases: {
    title: '브랜드 별칭이란?',
    description: '브랜드의 다양한 표기 방식을 추가하면 더 정확한 언급 감지가 가능합니다. 한글, 영문, 줄임말 등을 입력하세요.',
    examples: [
      '메리츠, Meritz, 메리츠화재',
      '삼성, Samsung, 삼성전자',
      'KB, KB손보, KB손해보험',
    ],
    tip: '쉼표(,)로 구분하여 여러 별칭을 입력하세요',
  },
}

// 도움말 툴팁 컴포넌트
function HelpTooltip({ content }: { content: typeof HELP_CONTENT.query }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-0 overflow-hidden">
        <div className="bg-popover">
          <div className="bg-primary/10 px-3 py-2 border-b">
            <p className="font-semibold text-sm">{content.title}</p>
          </div>
          <div className="p-3 space-y-2">
            <p className="text-sm text-muted-foreground">{content.description}</p>
            <div>
              <p className="text-xs font-medium mb-1">예시:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {content.examples.map((example, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="text-primary">•</span> {example}
                  </li>
                ))}
              </ul>
            </div>
            {'tip' in content && (content as { tip?: string }).tip && (
              <p className="text-xs text-primary font-medium mt-2">
                💡 {(content as { tip?: string }).tip}
              </p>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * 쿼리 입력 검증 스키마 (T034)
 */
export const queryInputSchema = z.object({
  query: z.string().min(1, '쿼리를 입력해주세요').max(500, '쿼리는 500자 이하여야 합니다'),
  domain: z.string().optional(),
  brand: z.string().optional(),
  brandAliases: z.array(z.string()).optional(),
})

export type QueryInputData = z.infer<typeof queryInputSchema>

interface QueryInputProps {
  onSubmit: (data: QueryInputData) => void
  isLoading: boolean
  initialData?: QueryInputData | null
}

/**
 * 쿼리 입력 폼 컴포넌트 (T033)
 */
export function QueryInput({ onSubmit, isLoading, initialData }: QueryInputProps) {
  const [query, setQuery] = useState(initialData?.query || '')
  const [domain, setDomain] = useState(initialData?.domain || '')
  const [brand, setBrand] = useState(initialData?.brand || '')
  const [brandAliasesInput, setBrandAliasesInput] = useState(initialData?.brandAliases?.join(', ') || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isFocused, setIsFocused] = useState(false)
  const [isGeneratingAliases, setIsGeneratingAliases] = useState(false)

  // initialData가 변경될 때 (탭 이동 후 복귀 시) 상태 업데이트
  useEffect(() => {
    if (initialData) {
      setQuery(initialData.query || '')
      setDomain(initialData.domain || '')
      setBrand(initialData.brand || '')
      setBrandAliasesInput(initialData.brandAliases?.join(', ') || '')
    }
  }, [initialData])

  // 브랜드 별칭 문자열을 배열로 변환
  const parseBrandAliases = (input: string): string[] => {
    if (!input.trim()) return []
    return input.split(',').map(s => s.trim()).filter(s => s.length > 0)
  }

  // Gemini를 사용하여 브랜드 별칭 자동 생성 (검색어 컨텍스트 포함)
  const generateBrandAliases = async () => {
    if (!brand.trim()) return

    setIsGeneratingAliases(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-brand-aliases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        // 검색어 컨텍스트를 함께 전달하여 관련 업종의 별칭만 생성
        body: JSON.stringify({ brand: brand.trim(), query: query.trim() || undefined }),
      })

      const data = await response.json()

      if (data.success && data.aliases) {
        // 기존 별칭과 새로 생성된 별칭 병합 (중복 제거)
        const existingAliases = parseBrandAliases(brandAliasesInput)
        const allAliases = [...new Set([...existingAliases, ...data.aliases])]
        setBrandAliasesInput(allAliases.join(', '))
      } else {
        console.error('Failed to generate aliases:', data.error)
      }
    } catch (error) {
      console.error('Error generating aliases:', error)
    } finally {
      setIsGeneratingAliases(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const brandAliases = parseBrandAliases(brandAliasesInput)

    // 유효성 검증 (T034)
    const result = queryInputSchema.safeParse({ query, domain, brand, brandAliases })

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
    <TooltipProvider>
      <Card className={`border-none shadow-lg transition-all duration-300 ${isFocused ? 'ring-2 ring-primary/20' : ''}`}>
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">AI 검색 엔진 인용 분석</CardTitle>
          <CardDescription className="text-lg mt-2 max-w-2xl mx-auto">
            Perplexity, ChatGPT, Gemini, Claude 4개 AI 검색 엔진에서<br className="hidden sm:block" />
            내 도메인이 어떻게 인용되는지 한눈에 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
            <div className="space-y-2">
              <label htmlFor="query" className="text-sm font-semibold flex items-center gap-2 ml-1">
                <Search className="h-4 w-4 text-primary" />
                {LABELS.ANALYSIS.QUERY_INPUT} <span className="text-destructive">*</span>
                <HelpTooltip content={HELP_CONTENT.query} />
              </label>
              <div className="relative">
                <Input
                  id="query"
                  type="text"
                  placeholder={PLACEHOLDERS.QUERY}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  disabled={isLoading}
                  className={`h-14 text-lg px-4 shadow-sm transition-all ${errors.query ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`}
                />
                {isLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              {errors.query && (
                <p className="text-sm text-destructive font-medium ml-1 animate-in slide-in-from-top-1">{errors.query}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="domain" className="text-sm font-semibold flex items-center gap-2 ml-1 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  {LABELS.ANALYSIS.DOMAIN_INPUT}
                  <HelpTooltip content={HELP_CONTENT.domain} />
                </label>
                <Input
                  id="domain"
                  type="text"
                  placeholder={PLACEHOLDERS.DOMAIN}
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={isLoading}
                  className={`h-12 ${errors.domain ? 'border-destructive' : ''}`}
                />
                {errors.domain && (
                  <p className="text-sm text-destructive ml-1">{errors.domain}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="brand" className="text-sm font-semibold flex items-center gap-2 ml-1 text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  {LABELS.ANALYSIS.BRAND_INPUT}
                  <HelpTooltip content={HELP_CONTENT.brand} />
                </label>
                <Input
                  id="brand"
                  type="text"
                  placeholder={PLACEHOLDERS.BRAND}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  disabled={isLoading}
                  className={`h-12 ${errors.brand ? 'border-destructive' : ''}`}
                />
                {errors.brand && (
                  <p className="text-sm text-destructive ml-1">{errors.brand}</p>
                )}
              </div>
            </div>

            {/* 브랜드 별칭 입력 (브랜드 입력 시 표시) */}
            {brand && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="brandAliases" className="text-sm font-semibold flex items-center gap-2 ml-1 text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    브랜드 별칭 (선택)
                    <HelpTooltip content={HELP_CONTENT.brandAliases} />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateBrandAliases}
                    disabled={isLoading || isGeneratingAliases || !brand.trim()}
                    className="h-8 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                  >
                    {isGeneratingAliases ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3.5 w-3.5" />
                        AI 자동 생성
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  id="brandAliases"
                  type="text"
                  placeholder="메리츠, Meritz, 메리츠화재 (쉼표로 구분)"
                  value={brandAliasesInput}
                  onChange={(e) => setBrandAliasesInput(e.target.value)}
                  disabled={isLoading || isGeneratingAliases}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground ml-1">
                  한글, 영문, 줄임말 등 다양한 표기를 추가하면 더 정확한 분석이 가능합니다
                </p>
              </div>
            )}

            <div className="pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">{LABELS.ANALYSIS.ANALYZING}</span>
                  </>
                ) : (
                  <>
                    {LABELS.ANALYSIS.SET_QUERY}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                다음 단계에서 쿼리 변형 생성 또는 바로 분석을 시작할 수 있습니다
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
