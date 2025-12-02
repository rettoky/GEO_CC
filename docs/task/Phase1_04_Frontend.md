# Phase 1 설계서
## 04. 프론트엔드 개발

---

## Phase 정보
| 항목 | 내용 |
|------|------|
| Phase | 1 - Core MVP |
| 문서 | 04/04 |
| 예상 기간 | 5-7일 |
| 선행 작업 | Phase1_03_EdgeFunction 완료 |

---

## 1. 개요

### 1.1 목표
- 쿼리 분석 요청 UI 구현
- 분석 결과 표시 UI 구현
- 분석 히스토리 목록 UI 구현
- 실시간 분석 상태 표시

### 1.2 산출물
- [ ] 메인 페이지 (쿼리 입력)
- [ ] 분석 결과 표시 컴포넌트
- [ ] 분석 히스토리 목록 페이지
- [ ] 분석 상세 페이지
- [ ] 로딩/에러 상태 처리

---

## 2. 페이지 구조

```
/                     → 메인 (쿼리 분석 요청)
/analysis             → 분석 히스토리 목록
/analysis/[id]        → 분석 결과 상세
```

---

## 3. 작업 상세

### Task 1.4.1: 공통 타입 및 훅 정의

#### 작업 내용

**types/index.ts**:

```typescript
// LLM 타입
export type LLMType = 'chatgpt' | 'gemini' | 'perplexity'

// 분석 상태
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

// 인용 정보
export interface Citation {
  position: number
  url: string
  title: string
  domain: string
  snippet?: string
}

// LLM별 결과
export interface LLMResult {
  success: boolean
  answer: string
  citations: Citation[]
  myDomainCited: boolean
  myDomainPositions: number[]
  brandMentioned: boolean
  brandMentionContext: string | null
  responseTimeMs: number
  model: string
  error: string | null
}

// 분석 결과
export interface AnalysisResults {
  chatgpt?: LLMResult
  gemini?: LLMResult
  perplexity?: LLMResult
}

// 분석 요약
export interface AnalysisSummary {
  totalLlms: number
  successfulLlms: number
  failedLlms: number
  myDomainCitedCount: number
  myDomainCitedBy: LLMType[]
  brandMentionedCount: number
  brandMentionedBy: LLMType[]
  totalCitations: number
  uniqueDomainsCited: number
  avgResponseTimeMs: number
}

// 분석 데이터
export interface Analysis {
  id: string
  query_text: string
  my_domain: string | null
  my_brand: string | null
  brand_aliases: string[] | null
  results: AnalysisResults
  summary: AnalysisSummary | null
  status: AnalysisStatus
  error_message: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

// 분석 요청
export interface AnalyzeRequest {
  query: string
  myDomain?: string
  myBrand?: string
  brandAliases?: string[]
}
```

**hooks/useAnalysis.ts**:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Analysis, AnalyzeRequest } from '@/types'

export function useAnalysis() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 분석 실행
  const analyze = useCallback(async (request: AnalyzeRequest): Promise<Analysis | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Edge Function 호출
      const { data, error: fnError } = await supabase.functions.invoke('analyze-query', {
        body: request,
      })

      if (fnError) {
        throw new Error(fnError.message)
      }

      return data as Analysis
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 분석 목록 조회
  const getAnalyses = useCallback(async (limit = 10): Promise<Analysis[]> => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch analyses:', error)
      return []
    }

    return data || []
  }, [])

  // 단일 분석 조회
  const getAnalysis = useCallback(async (id: string): Promise<Analysis | null> => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to fetch analysis:', error)
      return null
    }

    return data
  }, [])

  return {
    isLoading,
    error,
    analyze,
    getAnalyses,
    getAnalysis,
  }
}
```

#### 체크리스트
- [ ] types/index.ts 생성 완료
- [ ] hooks/useAnalysis.ts 생성 완료
- [ ] TypeScript 에러 없음

---

### Task 1.4.2: 쿼리 입력 컴포넌트

#### 작업 내용

**components/analysis/QueryInput.tsx**:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search } from 'lucide-react'

interface QueryInputProps {
  onSubmit: (data: {
    query: string
    myDomain: string
    myBrand: string
  }) => void
  isLoading?: boolean
}

export function QueryInput({ onSubmit, isLoading }: QueryInputProps) {
  const [query, setQuery] = useState('')
  const [myDomain, setMyDomain] = useState('')
  const [myBrand, setMyBrand] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    
    onSubmit({
      query: query.trim(),
      myDomain: myDomain.trim(),
      myBrand: myBrand.trim(),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          AI 검색 분석
        </CardTitle>
        <CardDescription>
          ChatGPT, Gemini, Perplexity에서 당신의 콘텐츠가 어떻게 인용되는지 분석합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">검색 쿼리 *</label>
            <Input
              placeholder="예: 암보험 추천해줘"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">내 도메인 (선택)</label>
              <Input
                placeholder="예: meritzfire.com"
                value={myDomain}
                onChange={(e) => setMyDomain(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">브랜드명 (선택)</label>
              <Input
                placeholder="예: 메리츠화재"
                value={myBrand}
                onChange={(e) => setMyBrand(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!query.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                분석 중... (약 30-60초 소요)
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                분석 시작
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

#### 체크리스트
- [ ] QueryInput.tsx 생성 완료
- [ ] 폼 유효성 검사 동작
- [ ] 로딩 상태 표시 동작

---

### Task 1.4.3: LLM 결과 카드 컴포넌트

#### 작업 내용

**components/analysis/LLMResultCard.tsx**:

```typescript
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle, ExternalLink, Clock } from 'lucide-react'
import type { LLMResult, LLMType } from '@/types'

interface LLMResultCardProps {
  llmType: LLMType
  result: LLMResult
  myDomain?: string
}

const llmNames: Record<LLMType, string> = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
}

const llmColors: Record<LLMType, string> = {
  chatgpt: 'bg-green-100 text-green-800',
  gemini: 'bg-blue-100 text-blue-800',
  perplexity: 'bg-purple-100 text-purple-800',
}

export function LLMResultCard({ llmType, result, myDomain }: LLMResultCardProps) {
  if (!result.success) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className={`px-2 py-1 rounded text-sm ${llmColors[llmType]}`}>
              {llmNames[llmType]}
            </span>
            <Badge variant="destructive">실패</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{result.error || '알 수 없는 오류'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded text-sm ${llmColors[llmType]}`}>
            {llmNames[llmType]}
          </span>
          <div className="flex items-center gap-2">
            {result.myDomainCited ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="mr-1 h-3 w-3" />
                인용됨
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="mr-1 h-3 w-3" />
                미인용
              </Badge>
            )}
            {result.brandMentioned && (
              <Badge variant="outline">브랜드 언급</Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {(result.responseTimeMs / 1000).toFixed(1)}초
          </span>
          <span>모델: {result.model}</span>
          <span>인용: {result.citations.length}개</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 답변 요약 */}
        <div>
          <h4 className="text-sm font-medium mb-2">답변</h4>
          <p className="text-sm text-muted-foreground line-clamp-4">
            {result.answer.substring(0, 300)}
            {result.answer.length > 300 && '...'}
          </p>
        </div>

        {/* 내 도메인 인용 위치 */}
        {result.myDomainCited && result.myDomainPositions.length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ {myDomain}이(가) {result.myDomainPositions.join(', ')}번째로 인용됨
            </p>
          </div>
        )}

        {/* 브랜드 언급 컨텍스트 */}
        {result.brandMentioned && result.brandMentionContext && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              브랜드 언급: {result.brandMentionContext}
            </p>
          </div>
        )}

        {/* 인용 목록 */}
        {result.citations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">인용 출처</h4>
            <div className="space-y-2">
              {result.citations.slice(0, 5).map((citation, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-2 text-xs p-2 rounded ${
                    myDomain && citation.domain.includes(myDomain.replace('www.', ''))
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-muted'
                  }`}
                >
                  <span className="font-medium">[{citation.position}]</span>
                  <span className="flex-1 truncate">
                    {citation.title || citation.domain}
                  </span>
                  <a 
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {citation.domain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
              {result.citations.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{result.citations.length - 5}개 더...
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

#### 체크리스트
- [ ] LLMResultCard.tsx 생성 완료
- [ ] 성공/실패 상태 표시
- [ ] 인용 목록 표시
- [ ] 내 도메인 하이라이트

---

### Task 1.4.4: 분석 요약 컴포넌트

#### 작업 내용

**components/analysis/AnalysisSummary.tsx**:

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, MessageSquare, Link2, Clock } from 'lucide-react'
import type { AnalysisSummary as SummaryType, LLMType } from '@/types'

interface AnalysisSummaryProps {
  summary: SummaryType
}

const llmNames: Record<LLMType, string> = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
}

export function AnalysisSummary({ summary }: AnalysisSummaryProps) {
  const citationRate = summary.totalLlms > 0
    ? Math.round((summary.myDomainCitedCount / summary.totalLlms) * 100)
    : 0

  const brandRate = summary.totalLlms > 0
    ? Math.round((summary.brandMentionedCount / summary.totalLlms) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>분석 요약</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 인용률 */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {citationRate}%
            </div>
            <div className="text-sm text-muted-foreground">도메인 인용률</div>
            <div className="text-xs mt-1">
              {summary.myDomainCitedCount}/{summary.totalLlms} LLM
            </div>
          </div>

          {/* 브랜드 언급률 */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-bold text-blue-600">
              {brandRate}%
            </div>
            <div className="text-sm text-muted-foreground">브랜드 언급률</div>
            <div className="text-xs mt-1">
              {summary.brandMentionedCount}/{summary.totalLlms} LLM
            </div>
          </div>

          {/* 총 인용 */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-bold">
              {summary.totalCitations}
            </div>
            <div className="text-sm text-muted-foreground">총 인용 수</div>
            <div className="text-xs mt-1">
              {summary.uniqueDomainsCited}개 도메인
            </div>
          </div>

          {/* 응답 시간 */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-3xl font-bold">
              {(summary.avgResponseTimeMs / 1000).toFixed(1)}s
            </div>
            <div className="text-sm text-muted-foreground">평균 응답 시간</div>
            <div className="text-xs mt-1">
              {summary.successfulLlms}/{summary.totalLlms} 성공
            </div>
          </div>
        </div>

        {/* 인용된 LLM 목록 */}
        {summary.myDomainCitedBy.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                인용된 LLM: {summary.myDomainCitedBy.map(llm => llmNames[llm]).join(', ')}
              </span>
            </div>
          </div>
        )}

        {summary.myDomainCitedCount === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">
                아직 어떤 LLM에서도 인용되지 않았습니다. GEO 최적화가 필요합니다.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

#### 체크리스트
- [ ] AnalysisSummary.tsx 생성 완료
- [ ] 지표 카드 표시
- [ ] 인용 상태 메시지 표시

---

### Task 1.4.5: 메인 페이지 구현

#### 작업 내용

**app/page.tsx**:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QueryInput } from '@/components/analysis/QueryInput'
import { LLMResultCard } from '@/components/analysis/LLMResultCard'
import { AnalysisSummary } from '@/components/analysis/AnalysisSummary'
import { useAnalysis } from '@/hooks/useAnalysis'
import { useToast } from '@/hooks/use-toast'
import type { Analysis, LLMType } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { analyze, isLoading, error } = useAnalysis()
  const [result, setResult] = useState<Analysis | null>(null)

  const handleSubmit = async (data: {
    query: string
    myDomain: string
    myBrand: string
  }) => {
    const analysis = await analyze({
      query: data.query,
      myDomain: data.myDomain || undefined,
      myBrand: data.myBrand || undefined,
    })

    if (analysis) {
      setResult(analysis)
      toast({
        title: '분석 완료',
        description: '3개 LLM에서 분석이 완료되었습니다.',
      })
    } else {
      toast({
        title: '분석 실패',
        description: error || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const llmTypes: LLMType[] = ['chatgpt', 'gemini', 'perplexity']

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">GEO Analyzer</h1>
        <p className="text-muted-foreground">
          AI 검색 엔진에서 당신의 콘텐츠가 어떻게 인용되는지 분석하세요.
        </p>
      </div>

      <QueryInput onSubmit={handleSubmit} isLoading={isLoading} />

      {result && (
        <div className="space-y-6">
          {/* 분석 요약 */}
          {result.summary && (
            <AnalysisSummary summary={result.summary} />
          )}

          {/* LLM별 결과 */}
          <div>
            <h2 className="text-xl font-semibold mb-4">LLM별 분석 결과</h2>
            <div className="grid gap-4">
              {llmTypes.map((llmType) => {
                const llmResult = result.results[llmType]
                if (!llmResult) return null
                
                return (
                  <LLMResultCard
                    key={llmType}
                    llmType={llmType}
                    result={llmResult}
                    myDomain={result.my_domain || undefined}
                  />
                )
              })}
            </div>
          </div>

          {/* 상세 보기 링크 */}
          <div className="text-center">
            <button
              onClick={() => router.push(`/analysis/${result.id}`)}
              className="text-blue-600 hover:underline text-sm"
            >
              상세 분석 결과 보기 →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

#### 체크리스트
- [ ] page.tsx 수정 완료
- [ ] 분석 요청 동작
- [ ] 결과 표시 동작
- [ ] 토스트 알림 동작

---

### Task 1.4.6: 분석 히스토리 페이지

#### 작업 내용

**app/analysis/page.tsx**:

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAnalysis } from '@/hooks/useAnalysis'
import type { Analysis } from '@/types'

export default function AnalysisListPage() {
  const { getAnalyses } = useAnalysis()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalyses = async () => {
      const data = await getAnalyses(20)
      setAnalyses(data)
      setIsLoading(false)
    }
    fetchAnalyses()
  }, [getAnalyses])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">분석 기록</h1>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">분석 기록</h1>
        <p className="text-muted-foreground">
          총 {analyses.length}개의 분석 기록이 있습니다.
        </p>
      </div>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              아직 분석 기록이 없습니다.
            </p>
            <Link href="/" className="text-blue-600 hover:underline text-sm mt-2 block">
              첫 분석 시작하기 →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {analyses.map((analysis) => (
            <Link key={analysis.id} href={`/analysis/${analysis.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      "{analysis.query_text}"
                    </CardTitle>
                    <Badge variant={
                      analysis.status === 'completed' ? 'default' :
                      analysis.status === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {analysis.status === 'completed' ? '완료' :
                       analysis.status === 'failed' ? '실패' : '처리중'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(analysis.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                    {analysis.my_domain && (
                      <span>도메인: {analysis.my_domain}</span>
                    )}
                    {analysis.summary && (
                      <>
                        <span>
                          인용률: {Math.round((analysis.summary.myDomainCitedCount / analysis.summary.totalLlms) * 100)}%
                        </span>
                        <span>
                          총 인용: {analysis.summary.totalCitations}개
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### 체크리스트
- [ ] analysis/page.tsx 생성 완료
- [ ] 목록 표시 동작
- [ ] 로딩 상태 표시
- [ ] 상세 페이지 링크 동작

---

### Task 1.4.7: 분석 상세 페이지

#### 작업 내용

**app/analysis/[id]/page.tsx**:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { LLMResultCard } from '@/components/analysis/LLMResultCard'
import { AnalysisSummary } from '@/components/analysis/AnalysisSummary'
import { useAnalysis } from '@/hooks/useAnalysis'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Analysis, LLMType } from '@/types'

export default function AnalysisDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { getAnalysis } = useAnalysis()
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (typeof params.id === 'string') {
        const data = await getAnalysis(params.id)
        setAnalysis(data)
      }
      setIsLoading(false)
    }
    fetchAnalysis()
  }, [params.id, getAnalysis])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">분석 결과를 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => router.push('/analysis')}>
          목록으로 돌아가기
        </Button>
      </div>
    )
  }

  const llmTypes: LLMType[] = ['chatgpt', 'gemini', 'perplexity']

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>
        
        <h1 className="text-2xl font-bold mb-2">
          "{analysis.query_text}"
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(analysis.created_at), {
              addSuffix: true,
              locale: ko,
            })}
          </span>
          {analysis.my_domain && (
            <span>분석 도메인: {analysis.my_domain}</span>
          )}
          {analysis.my_brand && (
            <span>브랜드: {analysis.my_brand}</span>
          )}
        </div>
      </div>

      {/* 분석 요약 */}
      {analysis.summary && (
        <AnalysisSummary summary={analysis.summary} />
      )}

      {/* LLM별 결과 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">LLM별 상세 결과</h2>
        <div className="space-y-4">
          {llmTypes.map((llmType) => {
            const llmResult = analysis.results[llmType]
            if (!llmResult) return null
            
            return (
              <LLMResultCard
                key={llmType}
                llmType={llmType}
                result={llmResult}
                myDomain={analysis.my_domain || undefined}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

#### 체크리스트
- [ ] analysis/[id]/page.tsx 생성 완료
- [ ] 상세 정보 표시 동작
- [ ] 뒤로 가기 동작
- [ ] 404 처리 동작

---

### Task 1.4.8: Toast 훅 추가

#### 작업 내용

shadcn/ui toast가 없다면 추가:

```bash
npx shadcn@latest add toast
```

**hooks/use-toast.ts**: shadcn이 자동 생성

#### 체크리스트
- [ ] Toast 컴포넌트 설치
- [ ] useToast 훅 사용 가능

---

## 4. 검증 체크리스트

### 최종 확인 사항

| 항목 | 확인 |
|------|------|
| 메인 페이지에서 쿼리 입력 가능 | [ ] |
| 분석 실행 시 로딩 표시 | [ ] |
| 분석 완료 후 결과 표시 | [ ] |
| LLM별 결과 카드 표시 | [ ] |
| 인용 목록 표시 | [ ] |
| 내 도메인 하이라이트 | [ ] |
| 분석 히스토리 목록 표시 | [ ] |
| 분석 상세 페이지 동작 | [ ] |
| 반응형 디자인 동작 | [ ] |

### E2E 테스트 시나리오

1. 메인 페이지 접속
2. 쿼리 입력: "암보험 추천해줘"
3. 도메인 입력: "meritzfire.com"
4. 브랜드 입력: "메리츠화재"
5. "분석 시작" 클릭
6. 로딩 표시 확인 (30-60초 대기)
7. 결과 표시 확인
8. 분석 기록 페이지로 이동
9. 방금 분석 결과 클릭
10. 상세 페이지 확인

---

## 5. 다음 단계

Phase 1 완료 후:
- **Phase2_01_ProjectManagement.md**: 프로젝트 및 쿼리 관리 기능
- **Phase2_02_Dashboard.md**: 대시보드 및 차트

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
