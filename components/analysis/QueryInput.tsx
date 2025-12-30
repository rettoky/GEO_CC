'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { z } from 'zod'
import { Search, Globe, Tag, HelpCircle, Wand2, Loader2, Users, X, Plus, Settings2, ChevronRight } from 'lucide-react'
import { LABELS, PLACEHOLDERS } from '@/lib/constants/labels'

// 도움말 데이터
const HELP_CONTENT = {
  query: {
    title: '검색어란?',
    description: 'AI 검색 엔진에 입력할 검색어입니다.',
    examples: ['암보험 추천해줘', '2024년 최고의 노트북'],
  },
  domain: {
    title: '내 도메인',
    description: 'AI 응답에서 인용 여부를 확인할 웹사이트 도메인입니다.',
    examples: ['example.com', 'naver.com'],
    tip: 'www 없이 도메인만 입력',
  },
  brand: {
    title: '브랜드명',
    description: 'AI 응답에서 언급 여부를 확인할 브랜드명입니다.',
    examples: ['삼성전자', '메리츠화재'],
  },
  brandAliases: {
    title: '브랜드 별칭',
    description: '브랜드의 다양한 표기 방식을 추가하세요.',
    examples: ['메리츠, Meritz', 'KB, KB손보'],
    tip: '쉼표로 구분',
  },
  competitors: {
    title: '경쟁사 브랜드',
    description: '비교 분석할 경쟁사를 입력하세요.',
    examples: ['삼성화재, 현대해상'],
    tip: 'AI가 자동으로 찾아줍니다',
  },
}

function HelpTooltip({ content }: { content: typeof HELP_CONTENT.query }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <p className="font-medium text-xs mb-1">{content.title}</p>
        <p className="text-xs text-muted-foreground">{content.description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export interface CompetitorBrand {
  name: string
  aliases: string[]
}

export const queryInputSchema = z.object({
  query: z.string().min(1, '쿼리를 입력해주세요').max(500, '500자 이하'),
  domain: z.string().optional(),
  brand: z.string().optional(),
  brandAliases: z.array(z.string()).optional(),
  competitors: z.array(z.object({
    name: z.string(),
    aliases: z.array(z.string()),
  })).optional(),
})

export type QueryInputData = z.infer<typeof queryInputSchema>

interface QueryInputProps {
  onSubmit: (data: QueryInputData) => void
  isLoading: boolean
  initialData?: QueryInputData | null
}

export function QueryInput({ onSubmit, isLoading, initialData }: QueryInputProps) {
  const [query, setQuery] = useState(initialData?.query || '')
  const [domain, setDomain] = useState(initialData?.domain || '')
  const [brand, setBrand] = useState(initialData?.brand || '')
  const [brandAliasesInput, setBrandAliasesInput] = useState(initialData?.brandAliases?.join(', ') || '')
  const [competitors, setCompetitors] = useState<CompetitorBrand[]>(initialData?.competitors || [])
  const [newCompetitorInput, setNewCompetitorInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isGeneratingAliases, setIsGeneratingAliases] = useState(false)
  const [isFindingCompetitors, setIsFindingCompetitors] = useState(false)
  const [isGeneratingAllCompetitorAliases, setIsGeneratingAllCompetitorAliases] = useState(false)

  useEffect(() => {
    if (initialData) {
      setQuery(initialData.query || '')
      setDomain(initialData.domain || '')
      setBrand(initialData.brand || '')
      setBrandAliasesInput(initialData.brandAliases?.join(', ') || '')
      setCompetitors(initialData.competitors || [])
    }
  }, [initialData])

  const parseBrandAliases = (input: string): string[] => {
    if (!input.trim()) return []
    return input.split(',').map(s => s.trim()).filter(s => s.length > 0)
  }

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
        body: JSON.stringify({ brand: brand.trim(), query: query.trim() || undefined }),
      })
      const data = await response.json()
      if (data.success && data.aliases) {
        setBrandAliasesInput(data.aliases.join(', '))
      }
    } catch (error) {
      console.error('Error generating aliases:', error)
    } finally {
      setIsGeneratingAliases(false)
    }
  }

  const findCompetitors = async () => {
    if (!brand.trim() && !domain.trim()) return
    setIsFindingCompetitors(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/find-competitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          brand: brand.trim() || undefined,
          domain: domain.trim() || undefined,
          query: query.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (data.success && data.competitors) {
        const existingNames = new Set(competitors.map(c => c.name.toLowerCase()))
        const newCompetitors = data.competitors.filter(
          (c: CompetitorBrand) => !existingNames.has(c.name.toLowerCase())
        )
        setCompetitors([...competitors, ...newCompetitors])
      }
    } catch (error) {
      console.error('Error finding competitors:', error)
    } finally {
      setIsFindingCompetitors(false)
    }
  }

  const addCompetitor = () => {
    const name = newCompetitorInput.trim()
    if (!name || competitors.some(c => c.name.toLowerCase() === name.toLowerCase())) return
    setCompetitors([...competitors, { name, aliases: [name] }])
    setNewCompetitorInput('')
  }

  const removeCompetitor = (name: string) => {
    setCompetitors(competitors.filter(c => c.name !== name))
  }

  const updateCompetitorAliases = (competitorName: string, aliasesInput: string) => {
    const aliases = aliasesInput.split(',').map(s => s.trim()).filter(s => s.length > 0)
    setCompetitors(competitors.map(c => {
      if (c.name === competitorName) {
        return { ...c, aliases: aliases.length > 0 ? aliases : [competitorName] }
      }
      return c
    }))
  }

  const generateAllCompetitorAliases = async () => {
    if (competitors.length === 0) return
    setIsGeneratingAllCompetitorAliases(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const results = await Promise.allSettled(
        competitors.map(async (competitor) => {
          const response = await fetch(`${supabaseUrl}/functions/v1/generate-brand-aliases`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ brand: competitor.name, query: query.trim() || undefined }),
          })
          const data = await response.json()
          return { name: competitor.name, aliases: data.success ? data.aliases : null }
        })
      )
      setCompetitors(competitors.map(competitor => {
        const result = results.find((r, i) =>
          r.status === 'fulfilled' && competitors[i].name === competitor.name
        )
        if (result?.status === 'fulfilled' && result.value.aliases) {
          return { ...competitor, aliases: result.value.aliases }
        }
        return competitor
      }))
    } catch (error) {
      console.error('Error generating all competitor aliases:', error)
    } finally {
      setIsGeneratingAllCompetitorAliases(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    const brandAliases = parseBrandAliases(brandAliasesInput)
    const result = queryInputSchema.safeParse({
      query, domain, brand, brandAliases,
      competitors: competitors.length > 0 ? competitors : undefined,
    })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message
      })
      setErrors(fieldErrors)
      return
    }
    onSubmit(result.data)
  }

  const hasAdvancedSettings = domain || brand || competitors.length > 0

  return (
    <TooltipProvider>
      <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 overflow-hidden">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit}>
            {/* 메인 검색어 영역 - 히어로 스타일 */}
            <div className="relative px-6 py-8 bg-gradient-to-r from-primary/5 via-primary/10 to-violet-500/5">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

              <div className="relative max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary/80">
                  <Search className="h-4 w-4" />
                  <span>AI 검색 엔진 분석</span>
                </div>

                <div className="relative group">
                  <Input
                    id="query"
                    type="text"
                    placeholder={PLACEHOLDERS.QUERY}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isLoading}
                    className={`h-14 text-lg pl-5 pr-12 rounded-xl border-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg transition-all duration-300 ${
                      errors.query
                        ? 'border-destructive'
                        : 'border-transparent focus:border-primary/50 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <HelpTooltip content={HELP_CONTENT.query} />
                    {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  </div>
                </div>
                {errors.query && (
                  <p className="text-sm text-destructive">{errors.query}</p>
                )}
              </div>
            </div>

            {/* 컴팩트 설정 영역 */}
            <div className="px-6 py-4">
              <Accordion type="single" collapsible defaultValue="settings">
                <AccordionItem value="settings" className="border-0">
                  <AccordionTrigger className="py-3 px-4 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors [&[data-state=open]]:rounded-b-none">
                    <div className="flex items-center gap-3 text-sm">
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">분석 설정</span>
                      {hasAdvancedSettings && (
                        <div className="flex items-center gap-1.5 ml-2">
                          {domain && <Badge variant="secondary" className="text-xs py-0 h-5">{domain}</Badge>}
                          {brand && <Badge variant="secondary" className="text-xs py-0 h-5">{brand}</Badge>}
                          {competitors.length > 0 && (
                            <Badge variant="secondary" className="text-xs py-0 h-5">경쟁사 {competitors.length}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="bg-slate-50/50 dark:bg-slate-900/30 rounded-b-lg px-4 pt-4 pb-5">
                    <div className="space-y-5">
                      {/* 도메인 & 브랜드 - 2열 그리드 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5" />
                            내 도메인
                            <HelpTooltip content={HELP_CONTENT.domain} />
                          </label>
                          <Input
                            type="text"
                            placeholder="example.com"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            disabled={isLoading}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" />
                            브랜드명
                            <HelpTooltip content={HELP_CONTENT.brand} />
                          </label>
                          <Input
                            type="text"
                            placeholder="브랜드명"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            disabled={isLoading}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>

                      {/* 브랜드 별칭 - 브랜드 입력 시 표시 */}
                      {brand && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Tag className="h-3.5 w-3.5" />
                              브랜드 별칭
                              <HelpTooltip content={HELP_CONTENT.brandAliases} />
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={generateBrandAliases}
                              disabled={isLoading || isGeneratingAliases}
                              className="h-7 text-xs gap-1 text-primary hover:text-primary"
                            >
                              {isGeneratingAliases ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Wand2 className="h-3 w-3" />
                              )}
                              AI 생성
                            </Button>
                          </div>
                          <Input
                            type="text"
                            placeholder="메리츠, Meritz (쉼표로 구분)"
                            value={brandAliasesInput}
                            onChange={(e) => setBrandAliasesInput(e.target.value)}
                            disabled={isLoading || isGeneratingAliases}
                            className="h-10 text-sm"
                          />
                        </div>
                      )}

                      {/* 경쟁사 섹션 - 도메인 또는 브랜드 입력 시 표시 */}
                      {(brand || domain) && (
                        <div className="space-y-3 pt-2 border-t border-dashed">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              경쟁사 브랜드
                              <HelpTooltip content={HELP_CONTENT.competitors} />
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={findCompetitors}
                              disabled={isLoading || isFindingCompetitors}
                              className="h-7 text-xs gap-1 text-orange-600 hover:text-orange-600"
                            >
                              {isFindingCompetitors ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Wand2 className="h-3 w-3" />
                              )}
                              AI 찾기
                            </Button>
                          </div>

                          {/* 경쟁사 추가 */}
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              placeholder="경쟁사 브랜드명"
                              value={newCompetitorInput}
                              onChange={(e) => setNewCompetitorInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addCompetitor()
                                }
                              }}
                              disabled={isLoading}
                              className="h-9 text-sm flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addCompetitor}
                              disabled={isLoading || !newCompetitorInput.trim()}
                              className="h-9 px-3"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* 경쟁사 목록 - 컴팩트 뷰 */}
                          {competitors.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={generateAllCompetitorAliases}
                                  disabled={isLoading || isGeneratingAllCompetitorAliases}
                                  className="h-7 text-xs gap-1 text-violet-600 hover:text-violet-600"
                                >
                                  {isGeneratingAllCompetitorAliases ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Wand2 className="h-3 w-3" />
                                  )}
                                  별칭 일괄 생성
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-1">
                                {competitors.map((competitor) => (
                                  <div
                                    key={competitor.name}
                                    className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-2 shadow-sm"
                                  >
                                    <Badge variant="outline" className="shrink-0 text-xs">
                                      {competitor.name}
                                    </Badge>
                                    <Input
                                      type="text"
                                      placeholder="별칭"
                                      value={competitor.aliases.join(', ')}
                                      onChange={(e) => updateCompetitorAliases(competitor.name, e.target.value)}
                                      disabled={isLoading || isGeneratingAllCompetitorAliases}
                                      className="h-7 text-xs flex-1 border-0 bg-transparent"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeCompetitor(competitor.name)}
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* 제출 버튼 */}
            <div className="px-6 pb-6">
              <Button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all group"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {LABELS.ANALYSIS.SET_QUERY}
                    <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
