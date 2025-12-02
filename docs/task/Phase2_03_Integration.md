# Phase 2 설계서
## 03. 분석-프로젝트 연동

---

## Phase 정보
| 항목 | 내용 |
|------|------|
| Phase | 2 - 분석 확장 |
| 문서 | 03/03 |
| 예상 기간 | 2-3일 |
| 선행 작업 | Phase2_02_Dashboard 완료 |

---

## 1. 개요

### 1.1 목표
- 분석 실행 시 프로젝트 연동
- 저장된 쿼리로 분석 실행
- 분석 결과에 프로젝트/쿼리 정보 저장
- 경쟁사 인용 분석 추가

### 1.2 산출물
- [ ] 메인 페이지 프로젝트 선택 기능
- [ ] 저장된 쿼리 선택 기능
- [ ] Edge Function 경쟁사 분석 추가
- [ ] 분석 결과에 경쟁사 인용 정보 포함

---

## 2. 작업 상세

### Task 2.3.1: 메인 페이지 개선

#### 작업 내용

**app/page.tsx** 수정:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QueryInput } from '@/components/analysis/QueryInput'
import { LLMResultCard } from '@/components/analysis/LLMResultCard'
import { AnalysisSummary } from '@/components/analysis/AnalysisSummary'
import { ProjectSelector } from '@/components/analysis/ProjectSelector'
import { SavedQuerySelector } from '@/components/analysis/SavedQuerySelector'
import { useAnalysis } from '@/hooks/useAnalysis'
import { useToast } from '@/hooks/use-toast'
import { getProjects } from '@/lib/supabase/queries/projects'
import { getQueriesByProject } from '@/lib/supabase/queries/queries'
import type { Analysis, LLMType, Project, Query } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { analyze, isLoading, error } = useAnalysis()
  
  const [result, setResult] = useState<Analysis | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [queries, setQueries] = useState<Query[]>([])
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null)

  // 프로젝트 목록 로드
  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await getProjects()
      setProjects(data || [])
      
      // URL에서 projectId가 있으면 선택
      const projectIdFromUrl = searchParams.get('projectId')
      if (projectIdFromUrl && data) {
        const project = data.find(p => p.id === projectIdFromUrl)
        if (project) setSelectedProject(project)
      }
    }
    fetchProjects()
  }, [searchParams])

  // 선택된 프로젝트의 쿼리 로드
  useEffect(() => {
    if (!selectedProject) {
      setQueries([])
      setSelectedQuery(null)
      return
    }

    const fetchQueries = async () => {
      const { data } = await getQueriesByProject(selectedProject.id, true)
      setQueries(data || [])
      
      // URL에서 query가 있으면 매칭
      const queryFromUrl = searchParams.get('query')
      if (queryFromUrl && data) {
        const query = data.find(q => q.text === queryFromUrl)
        if (query) setSelectedQuery(query)
      }
    }
    fetchQueries()
  }, [selectedProject, searchParams])

  const handleSubmit = async (data: {
    query: string
    myDomain: string
    myBrand: string
  }) => {
    const analysis = await analyze({
      query: data.query,
      myDomain: data.myDomain || selectedProject?.domain,
      myBrand: data.myBrand || selectedProject?.brand_name,
      brandAliases: selectedProject?.brand_aliases,
      projectId: selectedProject?.id,
      queryId: selectedQuery?.id,
    })

    if (analysis) {
      setResult(analysis)
      toast({
        title: '분석 완료',
        description: '4개 LLM에서 분석이 완료되었습니다.',
      })
    } else {
      toast({
        title: '분석 실패',
        description: error || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project)
    setSelectedQuery(null)
  }

  const handleQuerySelect = (query: Query | null) => {
    setSelectedQuery(query)
  }

  // 4개 LLM 타입
  const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">GEO Analyzer</h1>
        <p className="text-muted-foreground">
          AI 검색 엔진에서 당신의 콘텐츠가 어떻게 인용되는지 분석하세요.
        </p>
      </div>

      {/* 프로젝트 선택 (선택적) */}
      {projects.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <ProjectSelector
            projects={projects}
            selected={selectedProject}
            onSelect={handleProjectSelect}
          />
          
          {selectedProject && queries.length > 0 && (
            <SavedQuerySelector
              queries={queries}
              selected={selectedQuery}
              onSelect={handleQuerySelect}
            />
          )}
        </div>
      )}

      {/* 쿼리 입력 */}
      <QueryInput 
        onSubmit={handleSubmit} 
        isLoading={isLoading}
        defaultQuery={selectedQuery?.text}
        defaultDomain={selectedProject?.domain}
        defaultBrand={selectedProject?.brand_name}
      />

      {/* 결과 표시 */}
      {result && (
        <div className="space-y-6">
          {result.summary && (
            <AnalysisSummary summary={result.summary} />
          )}

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
- [ ] 메인 페이지 수정 완료
- [ ] 프로젝트 선택 연동

---

### Task 2.3.2: 프로젝트/쿼리 선택 컴포넌트

#### 작업 내용

**components/analysis/ProjectSelector.tsx**:

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FolderOpen } from 'lucide-react'
import type { Project } from '@/types'

interface ProjectSelectorProps {
  projects: Project[]
  selected: Project | null
  onSelect: (project: Project | null) => void
}

export function ProjectSelector({ projects, selected, onSelect }: ProjectSelectorProps) {
  const handleChange = (value: string) => {
    if (value === 'none') {
      onSelect(null)
    } else {
      const project = projects.find(p => p.id === value)
      onSelect(project || null)
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">프로젝트 선택 (선택사항)</span>
        </div>
        <Select value={selected?.id || 'none'} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="프로젝트 없이 분석" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">프로젝트 없이 분석</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name} ({project.domain})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <p className="text-xs text-muted-foreground mt-2">
            브랜드: {selected.brand_name} · 도메인: {selected.domain}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

**components/analysis/SavedQuerySelector.tsx**:

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import type { Query } from '@/types'

interface SavedQuerySelectorProps {
  queries: Query[]
  selected: Query | null
  onSelect: (query: Query | null) => void
}

export function SavedQuerySelector({ queries, selected, onSelect }: SavedQuerySelectorProps) {
  const handleChange = (value: string) => {
    if (value === 'custom') {
      onSelect(null)
    } else {
      const query = queries.find(q => q.id === value)
      onSelect(query || null)
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">저장된 쿼리 선택</span>
        </div>
        <Select value={selected?.id || 'custom'} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="직접 입력" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">직접 입력</SelectItem>
            {queries.map(query => (
              <SelectItem key={query.id} value={query.id}>
                {query.text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}
```

#### 체크리스트
- [ ] ProjectSelector.tsx 생성 완료
- [ ] SavedQuerySelector.tsx 생성 완료

---

### Task 2.3.3: QueryInput 수정

#### 작업 내용

**components/analysis/QueryInput.tsx** 수정:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface QueryInputProps {
  onSubmit: (data: {
    query: string
    myDomain: string
    myBrand: string
  }) => void
  isLoading?: boolean
  defaultQuery?: string
  defaultDomain?: string
  defaultBrand?: string
}

export function QueryInput({ 
  onSubmit, 
  isLoading,
  defaultQuery,
  defaultDomain,
  defaultBrand,
}: QueryInputProps) {
  const [query, setQuery] = useState(defaultQuery || '')
  const [myDomain, setMyDomain] = useState(defaultDomain || '')
  const [myBrand, setMyBrand] = useState(defaultBrand || '')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // 기본값 업데이트
  useEffect(() => {
    if (defaultQuery) setQuery(defaultQuery)
  }, [defaultQuery])

  useEffect(() => {
    if (defaultDomain) setMyDomain(defaultDomain)
  }, [defaultDomain])

  useEffect(() => {
    if (defaultBrand) setMyBrand(defaultBrand)
  }, [defaultBrand])

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
          Perplexity, ChatGPT, Gemini, Claude 4개 LLM에서 인용 현황을 분석합니다.
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

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full">
                {showAdvanced ? (
                  <ChevronUp className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                고급 설정 {defaultDomain || defaultBrand ? '(프로젝트에서 자동 입력됨)' : ''}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">내 도메인</label>
                  <Input
                    placeholder="예: meritzfire.com"
                    value={myDomain}
                    onChange={(e) => setMyDomain(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">브랜드명</label>
                  <Input
                    placeholder="예: 메리츠화재"
                    value={myBrand}
                    onChange={(e) => setMyBrand(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          
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

shadcn 컴포넌트 추가:
```bash
npx shadcn@latest add collapsible
```

#### 체크리스트
- [ ] QueryInput.tsx 수정 완료
- [ ] 기본값 연동 동작

---

### Task 2.3.4: useAnalysis 훅 수정

#### 작업 내용

**hooks/useAnalysis.ts** 수정:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Analysis, AnalyzeRequest } from '@/types'

// 확장된 분석 요청 타입
interface ExtendedAnalyzeRequest extends AnalyzeRequest {
  projectId?: string
  queryId?: string
}

export function useAnalysis() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 분석 실행
  const analyze = useCallback(async (request: ExtendedAnalyzeRequest): Promise<Analysis | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Edge Function 호출
      const { data, error: fnError } = await supabase.functions.invoke('analyze-query', {
        body: {
          query: request.query,
          myDomain: request.myDomain,
          myBrand: request.myBrand,
          brandAliases: request.brandAliases,
          projectId: request.projectId,
          queryId: request.queryId,
        },
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

  // ... (기존 함수들 유지)

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
- [ ] useAnalysis.ts 수정 완료

---

### Task 2.3.5: Edge Function 수정

#### 작업 내용

**supabase/functions/analyze-query/index.ts** 수정 (일부):

```typescript
// 요청 타입 확장
interface AnalyzeRequest {
  query: string
  myDomain?: string
  myBrand?: string
  brandAliases?: string[]
  projectId?: string  // 추가
  queryId?: string    // 추가
}

// 메인 핸들러 내
serve(async (req) => {
  // ... (기존 코드)

  try {
    const body: AnalyzeRequest = await req.json()
    const { query, myDomain, myBrand, brandAliases, projectId, queryId } = body

    // ... (기존 검증 코드)

    // 분석 레코드 생성 (projectId, queryId 추가)
    const { data: analysis, error: insertError } = await supabase
      .from('analyses')
      .insert({
        query_text: query,
        my_domain: myDomain || null,
        my_brand: myBrand || null,
        brand_aliases: brandAliases || null,
        project_id: projectId || null,  // 추가
        query_id: queryId || null,       // 추가
        status: 'processing',
        results: {},
      })
      .select()
      .single()

    // ... (기존 LLM 호출 코드)

    // 쿼리 통계 업데이트 (queryId가 있는 경우)
    if (queryId) {
      const citationRate = summary.myDomainCitedCount / summary.totalLlms * 100
      await supabase
        .from('queries')
        .update({
          last_analysis_id: analysisId,
          last_analysis_at: new Date().toISOString(),
          avg_citation_rate: citationRate,
        })
        .eq('id', queryId)
    }

    // ... (기존 반환 코드)
  } catch (error) {
    // ... (기존 에러 처리)
  }
})
```

#### 체크리스트
- [ ] Edge Function 수정 완료
- [ ] projectId, queryId 저장 동작

---

## 3. 검증 체크리스트

### 최종 확인 사항

| 항목 | 확인 |
|------|------|
| 프로젝트 선택 후 분석 | [ ] |
| 저장된 쿼리 선택 후 분석 | [ ] |
| 분석 결과에 project_id 저장 | [ ] |
| 분석 결과에 query_id 저장 | [ ] |
| 쿼리 통계 자동 업데이트 | [ ] |
| 프로젝트 없이 분석 (기존 기능 유지) | [ ] |

---

## 4. 다음 단계

Phase 2 완료 후:
- **Phase3_01_PageAnalysis.md**: 페이지 구조 분석 기능

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
| 2.0 | 2025-12-01 | 4개 LLM 지원 (Claude 추가) |
