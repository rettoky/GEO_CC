# Phase 2 설계서
## 01. 프로젝트 및 쿼리 관리

---

## Phase 정보
| 항목 | 내용 |
|------|------|
| Phase | 2 - 분석 확장 |
| 문서 | 01/03 |
| 예상 기간 | 3-4일 |
| 선행 작업 | Phase 1 전체 완료 |

---

## 1. 개요

### 1.1 목표
- 프로젝트(브랜드) 생성 및 관리 기능
- 쿼리 저장 및 관리 기능
- 경쟁사 등록 및 관리 기능
- 분석 결과와 프로젝트 연결

### 1.2 산출물
- [ ] projects 테이블 생성
- [ ] queries 테이블 생성
- [ ] competitors 테이블 생성
- [ ] 프로젝트 관리 UI
- [ ] 쿼리 관리 UI
- [ ] 경쟁사 관리 UI

---

## 2. 데이터베이스 스키마

### Task 2.1.1: 테이블 생성

#### 작업 내용

Supabase SQL Editor에서 실행:

```sql
-- ============================================
-- GEO Analyzer: Phase 2 Database Schema
-- ============================================

-- projects 테이블: 프로젝트(브랜드) 관리
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    name TEXT NOT NULL,                    -- 프로젝트명
    brand_name TEXT NOT NULL,              -- 브랜드명
    domain TEXT NOT NULL,                  -- 주 도메인
    brand_aliases TEXT[] DEFAULT '{}',     -- 브랜드 별칭
    
    -- 추가 정보
    industry TEXT,                         -- 업종
    description TEXT,                      -- 설명
    logo_url TEXT,                         -- 로고 URL
    
    -- 설정
    settings JSONB DEFAULT '{}',           -- 프로젝트 설정
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- queries 테이블: 저장된 쿼리
CREATE TABLE IF NOT EXISTS queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 쿼리 정보
    text TEXT NOT NULL,                    -- 쿼리 텍스트
    type TEXT DEFAULT 'phrase' CHECK (type IN ('keyword', 'phrase', 'brand')),
    intent TEXT CHECK (intent IN ('informational', 'commercial', 'transactional', 'navigational')),
    
    -- 상태
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,            -- 0: 보통, 1: 높음, -1: 낮음
    
    -- 메타데이터
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    -- 통계 (캐시)
    last_analysis_id UUID,
    last_analysis_at TIMESTAMPTZ,
    avg_citation_rate DECIMAL(5,2),        -- 평균 인용률
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- competitors 테이블: 경쟁사
CREATE TABLE IF NOT EXISTS competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 경쟁사 정보
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    brand_aliases TEXT[] DEFAULT '{}',
    
    -- 추가 정보
    description TEXT,
    logo_url TEXT,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- analyses 테이블 확장 (project_id, query_id 추가)
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS query_id UUID REFERENCES queries(id) ON DELETE SET NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_queries_project_id ON queries(project_id);
CREATE INDEX IF NOT EXISTS idx_queries_is_active ON queries(is_active);
CREATE INDEX IF NOT EXISTS idx_competitors_project_id ON competitors(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_query_id ON analyses(query_id);

-- updated_at 트리거
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queries_updated_at 
    BEFORE UPDATE ON queries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 주석
COMMENT ON TABLE projects IS '프로젝트(브랜드) 관리 테이블';
COMMENT ON TABLE queries IS '저장된 쿼리 목록';
COMMENT ON TABLE competitors IS '경쟁사 정보';
```

#### 체크리스트
- [ ] SQL 실행 완료
- [ ] projects 테이블 생성 확인
- [ ] queries 테이블 생성 확인
- [ ] competitors 테이블 생성 확인
- [ ] analyses 테이블 컬럼 추가 확인

---

### Task 2.1.2: TypeScript 타입 추가

#### 작업 내용

**types/index.ts** 추가:

```typescript
// ============================================
// Phase 2 Types
// ============================================

// 쿼리 유형
export type QueryType = 'keyword' | 'phrase' | 'brand'

// 쿼리 의도
export type QueryIntent = 'informational' | 'commercial' | 'transactional' | 'navigational'

// 프로젝트
export interface Project {
  id: string
  name: string
  brand_name: string
  domain: string
  brand_aliases: string[]
  industry: string | null
  description: string | null
  logo_url: string | null
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ProjectInsert {
  name: string
  brand_name: string
  domain: string
  brand_aliases?: string[]
  industry?: string
  description?: string
  logo_url?: string
  settings?: Record<string, any>
}

export interface ProjectUpdate {
  name?: string
  brand_name?: string
  domain?: string
  brand_aliases?: string[]
  industry?: string
  description?: string
  logo_url?: string
  settings?: Record<string, any>
}

// 쿼리
export interface Query {
  id: string
  project_id: string
  text: string
  type: QueryType
  intent: QueryIntent | null
  is_active: boolean
  priority: number
  tags: string[]
  notes: string | null
  last_analysis_id: string | null
  last_analysis_at: string | null
  avg_citation_rate: number | null
  created_at: string
  updated_at: string
}

export interface QueryInsert {
  project_id: string
  text: string
  type?: QueryType
  intent?: QueryIntent
  is_active?: boolean
  priority?: number
  tags?: string[]
  notes?: string
}

export interface QueryUpdate {
  text?: string
  type?: QueryType
  intent?: QueryIntent
  is_active?: boolean
  priority?: number
  tags?: string[]
  notes?: string
}

// 경쟁사
export interface Competitor {
  id: string
  project_id: string
  name: string
  domain: string
  brand_aliases: string[]
  description: string | null
  logo_url: string | null
  created_at: string
}

export interface CompetitorInsert {
  project_id: string
  name: string
  domain: string
  brand_aliases?: string[]
  description?: string
  logo_url?: string
}

// 프로젝트 with 관계
export interface ProjectWithRelations extends Project {
  queries?: Query[]
  competitors?: Competitor[]
  analyses_count?: number
}
```

#### 체크리스트
- [ ] 타입 정의 추가 완료
- [ ] TypeScript 에러 없음

---

### Task 2.1.3: 데이터 접근 함수

#### 작업 내용

**lib/supabase/queries/projects.ts** 생성:

```typescript
import { createClient } from '../client'
import type { Project, ProjectInsert, ProjectUpdate, ProjectWithRelations } from '@/types'

// 프로젝트 생성
export async function createProject(data: ProjectInsert): Promise<{ data: Project | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .insert(data)
    .select()
    .single()
  
  return { data: project, error }
}

// 프로젝트 목록 조회
export async function getProjects(): Promise<{ data: Project[] | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  
  return { data, error }
}

// 프로젝트 상세 조회 (관계 포함)
export async function getProjectWithRelations(id: string): Promise<{ data: ProjectWithRelations | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  
  if (projectError || !project) {
    return { data: null, error: projectError }
  }
  
  // 쿼리 조회
  const { data: queries } = await supabase
    .from('queries')
    .select('*')
    .eq('project_id', id)
    .order('priority', { ascending: false })
  
  // 경쟁사 조회
  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .eq('project_id', id)
  
  // 분석 수 조회
  const { count } = await supabase
    .from('analyses')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)
  
  return {
    data: {
      ...project,
      queries: queries || [],
      competitors: competitors || [],
      analyses_count: count || 0,
    },
    error: null,
  }
}

// 프로젝트 수정
export async function updateProject(id: string, data: ProjectUpdate): Promise<{ data: Project | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  
  return { data: project, error }
}

// 프로젝트 삭제
export async function deleteProject(id: string): Promise<{ error: Error | null }> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
  
  return { error }
}
```

**lib/supabase/queries/queries.ts** 생성:

```typescript
import { createClient } from '../client'
import type { Query, QueryInsert, QueryUpdate } from '@/types'

// 쿼리 생성
export async function createQuery(data: QueryInsert): Promise<{ data: Query | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data: query, error } = await supabase
    .from('queries')
    .insert(data)
    .select()
    .single()
  
  return { data: query, error }
}

// 프로젝트의 쿼리 목록
export async function getQueriesByProject(projectId: string, activeOnly = false): Promise<{ data: Query[] | null; error: Error | null }> {
  const supabase = createClient()
  
  let query = supabase
    .from('queries')
    .select('*')
    .eq('project_id', projectId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
  
  if (activeOnly) {
    query = query.eq('is_active', true)
  }
  
  const { data, error } = await query
  
  return { data, error }
}

// 쿼리 수정
export async function updateQuery(id: string, data: QueryUpdate): Promise<{ data: Query | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data: query, error } = await supabase
    .from('queries')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  
  return { data: query, error }
}

// 쿼리 삭제
export async function deleteQuery(id: string): Promise<{ error: Error | null }> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('queries')
    .delete()
    .eq('id', id)
  
  return { error }
}

// 쿼리 활성화/비활성화 토글
export async function toggleQueryActive(id: string, isActive: boolean): Promise<{ error: Error | null }> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('queries')
    .update({ is_active: isActive })
    .eq('id', id)
  
  return { error }
}

// 쿼리 분석 결과 업데이트
export async function updateQueryAnalysisStats(queryId: string, analysisId: string, citationRate: number): Promise<{ error: Error | null }> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('queries')
    .update({
      last_analysis_id: analysisId,
      last_analysis_at: new Date().toISOString(),
      avg_citation_rate: citationRate,
    })
    .eq('id', queryId)
  
  return { error }
}
```

**lib/supabase/queries/competitors.ts** 생성:

```typescript
import { createClient } from '../client'
import type { Competitor, CompetitorInsert } from '@/types'

// 경쟁사 추가
export async function createCompetitor(data: CompetitorInsert): Promise<{ data: Competitor | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data: competitor, error } = await supabase
    .from('competitors')
    .insert(data)
    .select()
    .single()
  
  return { data: competitor, error }
}

// 프로젝트의 경쟁사 목록
export async function getCompetitorsByProject(projectId: string): Promise<{ data: Competitor[] | null; error: Error | null }> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  
  return { data, error }
}

// 경쟁사 삭제
export async function deleteCompetitor(id: string): Promise<{ error: Error | null }> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('competitors')
    .delete()
    .eq('id', id)
  
  return { error }
}

// 경쟁사 수 확인 (최대 5개 제한용)
export async function getCompetitorCount(projectId: string): Promise<number> {
  const supabase = createClient()
  
  const { count } = await supabase
    .from('competitors')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
  
  return count || 0
}
```

#### 체크리스트
- [ ] projects.ts 생성 완료
- [ ] queries.ts 생성 완료
- [ ] competitors.ts 생성 완료

---

## 3. 프론트엔드 UI

### Task 2.1.4: 프로젝트 관리 페이지

#### 작업 내용

**app/projects/page.tsx**:

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, FolderOpen, Globe, Users } from 'lucide-react'
import { getProjects } from '@/lib/supabase/queries/projects'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Project } from '@/types'
import { CreateProjectDialog } from '@/components/project/CreateProjectDialog'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const fetchProjects = async () => {
    const { data } = await getProjects()
    setProjects(data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleProjectCreated = () => {
    setShowCreateDialog(false)
    fetchProjects()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">프로젝트</h1>
          <p className="text-muted-foreground">
            브랜드별로 분석을 관리하세요
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          새 프로젝트
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">프로젝트가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              첫 번째 프로젝트를 만들어 분석을 시작하세요
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              프로젝트 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {project.logo_url ? (
                      <img 
                        src={project.logo_url} 
                        alt={project.name} 
                        className="w-6 h-6 rounded"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {project.brand_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    {project.name}
                  </CardTitle>
                  <CardDescription>{project.brand_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      {project.domain}
                    </div>
                    {project.industry && (
                      <Badge variant="secondary">{project.industry}</Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(project.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleProjectCreated}
      />
    </div>
  )
}
```

#### 체크리스트
- [ ] projects/page.tsx 생성 완료
- [ ] 프로젝트 목록 표시 동작
- [ ] 프로젝트 생성 다이얼로그 동작

---

### Task 2.1.5: 프로젝트 생성 다이얼로그

#### 작업 내용

**components/project/CreateProjectDialog.tsx**:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { createProject } from '@/lib/supabase/queries/projects'
import { useToast } from '@/hooks/use-toast'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const industries = [
  '금융/보험',
  '이커머스/유통',
  '테크/IT',
  '여행/관광',
  '교육',
  '헬스케어',
  '부동산',
  '엔터테인먼트',
  '기타',
]

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    brand_name: '',
    domain: '',
    industry: '',
    description: '',
    brand_aliases: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const aliases = formData.brand_aliases
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const { data, error } = await createProject({
      name: formData.name,
      brand_name: formData.brand_name,
      domain: formData.domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      industry: formData.industry || undefined,
      description: formData.description || undefined,
      brand_aliases: aliases,
    })

    setIsLoading(false)

    if (error) {
      toast({
        title: '프로젝트 생성 실패',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    toast({
      title: '프로젝트 생성 완료',
      description: `${formData.name} 프로젝트가 생성되었습니다.`,
    })

    // 폼 초기화
    setFormData({
      name: '',
      brand_name: '',
      domain: '',
      industry: '',
      description: '',
      brand_aliases: '',
    })

    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>새 프로젝트 만들기</DialogTitle>
          <DialogDescription>
            분석할 브랜드 정보를 입력하세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">프로젝트명 *</Label>
              <Input
                id="name"
                placeholder="예: 메리츠화재 GEO"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_name">브랜드명 *</Label>
              <Input
                id="brand_name"
                placeholder="예: 메리츠화재"
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">도메인 *</Label>
            <Input
              id="domain"
              placeholder="예: meritzfire.com"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">업종</Label>
            <Select 
              value={formData.industry}
              onValueChange={(value) => setFormData({ ...formData, industry: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="업종 선택" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand_aliases">브랜드 별칭</Label>
            <Input
              id="brand_aliases"
              placeholder="쉼표로 구분 (예: 메리츠, Meritz)"
              value={formData.brand_aliases}
              onChange={(e) => setFormData({ ...formData, brand_aliases: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              AI 답변에서 이 별칭들도 브랜드 언급으로 인식합니다
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              placeholder="프로젝트에 대한 간단한 설명"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              만들기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

shadcn 컴포넌트 추가 설치:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add label
```

#### 체크리스트
- [ ] CreateProjectDialog.tsx 생성 완료
- [ ] 필요한 shadcn 컴포넌트 설치
- [ ] 프로젝트 생성 동작 확인

---

### Task 2.1.6: 프로젝트 상세 페이지

#### 작업 내용

**app/projects/[id]/page.tsx**:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Plus, Play, Settings, Trash2 } from 'lucide-react'
import { getProjectWithRelations, deleteProject } from '@/lib/supabase/queries/projects'
import { QueryList } from '@/components/project/QueryList'
import { CompetitorList } from '@/components/project/CompetitorList'
import { AddQueryDialog } from '@/components/project/AddQueryDialog'
import { AddCompetitorDialog } from '@/components/project/AddCompetitorDialog'
import { useToast } from '@/hooks/use-toast'
import type { ProjectWithRelations } from '@/types'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [project, setProject] = useState<ProjectWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddQuery, setShowAddQuery] = useState(false)
  const [showAddCompetitor, setShowAddCompetitor] = useState(false)

  const fetchProject = async () => {
    if (typeof params.id === 'string') {
      const { data } = await getProjectWithRelations(params.id)
      setProject(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchProject()
  }, [params.id])

  const handleDelete = async () => {
    if (!project) return
    if (!confirm('정말 이 프로젝트를 삭제하시겠습니까? 모든 쿼리와 분석 기록이 삭제됩니다.')) return

    const { error } = await deleteProject(project.id)
    if (error) {
      toast({
        title: '삭제 실패',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    toast({ title: '프로젝트가 삭제되었습니다' })
    router.push('/projects')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">프로젝트를 찾을 수 없습니다</p>
        <Button onClick={() => router.push('/projects')}>목록으로</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            뒤로
          </Button>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">
            {project.brand_name} · {project.domain}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            삭제
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>등록된 쿼리</CardDescription>
            <CardTitle className="text-2xl">{project.queries?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>경쟁사</CardDescription>
            <CardTitle className="text-2xl">{project.competitors?.length || 0}/5</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>분석 횟수</CardDescription>
            <CardTitle className="text-2xl">{project.analyses_count || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="queries">
        <TabsList>
          <TabsTrigger value="queries">쿼리 ({project.queries?.length || 0})</TabsTrigger>
          <TabsTrigger value="competitors">경쟁사 ({project.competitors?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="queries" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              분석할 쿼리를 등록하고 관리하세요 (최대 20개)
            </p>
            <Button 
              size="sm" 
              onClick={() => setShowAddQuery(true)}
              disabled={(project.queries?.length || 0) >= 20}
            >
              <Plus className="mr-2 h-4 w-4" />
              쿼리 추가
            </Button>
          </div>
          <QueryList 
            queries={project.queries || []} 
            projectId={project.id}
            onUpdate={fetchProject}
          />
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              비교 분석할 경쟁사를 등록하세요 (최대 5개)
            </p>
            <Button 
              size="sm" 
              onClick={() => setShowAddCompetitor(true)}
              disabled={(project.competitors?.length || 0) >= 5}
            >
              <Plus className="mr-2 h-4 w-4" />
              경쟁사 추가
            </Button>
          </div>
          <CompetitorList 
            competitors={project.competitors || []}
            onUpdate={fetchProject}
          />
        </TabsContent>
      </Tabs>

      {/* 다이얼로그 */}
      <AddQueryDialog
        open={showAddQuery}
        onOpenChange={setShowAddQuery}
        projectId={project.id}
        onSuccess={() => {
          setShowAddQuery(false)
          fetchProject()
        }}
      />
      <AddCompetitorDialog
        open={showAddCompetitor}
        onOpenChange={setShowAddCompetitor}
        projectId={project.id}
        onSuccess={() => {
          setShowAddCompetitor(false)
          fetchProject()
        }}
      />
    </div>
  )
}
```

#### 체크리스트
- [ ] projects/[id]/page.tsx 생성 완료
- [ ] 프로젝트 상세 정보 표시
- [ ] 탭 전환 동작

---

### Task 2.1.7: 쿼리 목록/추가 컴포넌트

#### 작업 내용

**components/project/QueryList.tsx**:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Trash2, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteQuery, toggleQueryActive } from '@/lib/supabase/queries/queries'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import type { Query } from '@/types'

interface QueryListProps {
  queries: Query[]
  projectId: string
  onUpdate: () => void
}

const typeLabels: Record<string, string> = {
  keyword: '키워드',
  phrase: '구문',
  brand: '브랜드',
}

const intentLabels: Record<string, string> = {
  informational: '정보성',
  commercial: '상업성',
  transactional: '거래성',
  navigational: '탐색성',
}

export function QueryList({ queries, projectId, onUpdate }: QueryListProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleToggleActive = async (query: Query) => {
    const { error } = await toggleQueryActive(query.id, !query.is_active)
    if (error) {
      toast({ title: '변경 실패', variant: 'destructive' })
      return
    }
    onUpdate()
  }

  const handleDelete = async (query: Query) => {
    if (!confirm(`"${query.text}" 쿼리를 삭제하시겠습니까?`)) return
    
    const { error } = await deleteQuery(query.id)
    if (error) {
      toast({ title: '삭제 실패', variant: 'destructive' })
      return
    }
    toast({ title: '쿼리가 삭제되었습니다' })
    onUpdate()
  }

  const handleAnalyze = (query: Query) => {
    // 쿼리 분석 페이지로 이동 (쿼리 정보 전달)
    router.push(`/?query=${encodeURIComponent(query.text)}&projectId=${projectId}`)
  }

  if (queries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          등록된 쿼리가 없습니다
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {queries.map((query) => (
        <Card key={query.id} className={!query.is_active ? 'opacity-50' : ''}>
          <CardContent className="py-3">
            <div className="flex items-center gap-4">
              <Switch
                checked={query.is_active}
                onCheckedChange={() => handleToggleActive(query)}
              />
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{query.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {typeLabels[query.type] || query.type}
                  </Badge>
                  {query.intent && (
                    <Badge variant="secondary" className="text-xs">
                      {intentLabels[query.intent] || query.intent}
                    </Badge>
                  )}
                  {query.avg_citation_rate !== null && (
                    <span className="text-xs text-muted-foreground">
                      인용률: {query.avg_citation_rate}%
                    </span>
                  )}
                </div>
              </div>

              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleAnalyze(query)}
                disabled={!query.is_active}
              >
                <Play className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDelete(query)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**components/project/AddQueryDialog.tsx**:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { createQuery } from '@/lib/supabase/queries/queries'
import { useToast } from '@/hooks/use-toast'
import type { QueryType, QueryIntent } from '@/types'

interface AddQueryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess: () => void
}

export function AddQueryDialog({ open, onOpenChange, projectId, onSuccess }: AddQueryDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    text: '',
    type: 'phrase' as QueryType,
    intent: '' as QueryIntent | '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await createQuery({
      project_id: projectId,
      text: formData.text,
      type: formData.type,
      intent: formData.intent || undefined,
    })

    setIsLoading(false)

    if (error) {
      toast({
        title: '쿼리 추가 실패',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    toast({ title: '쿼리가 추가되었습니다' })
    setFormData({ text: '', type: 'phrase', intent: '' })
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>쿼리 추가</DialogTitle>
          <DialogDescription>
            분석할 검색 쿼리를 입력하세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">쿼리 *</Label>
            <Input
              id="text"
              placeholder="예: 암보험 추천해줘"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>유형</Label>
              <Select
                value={formData.type}
                onValueChange={(value: QueryType) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">키워드</SelectItem>
                  <SelectItem value="phrase">구문</SelectItem>
                  <SelectItem value="brand">브랜드 포함</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>의도</Label>
              <Select
                value={formData.intent}
                onValueChange={(value: QueryIntent) => setFormData({ ...formData, intent: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="informational">정보성</SelectItem>
                  <SelectItem value="commercial">상업성</SelectItem>
                  <SelectItem value="transactional">거래성</SelectItem>
                  <SelectItem value="navigational">탐색성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading || !formData.text}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              추가
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

shadcn 컴포넌트 추가:
```bash
npx shadcn@latest add switch
npx shadcn@latest add dropdown-menu
```

#### 체크리스트
- [ ] QueryList.tsx 생성 완료
- [ ] AddQueryDialog.tsx 생성 완료
- [ ] 쿼리 목록 표시 동작
- [ ] 쿼리 추가 동작
- [ ] 쿼리 활성화/비활성화 동작

---

### Task 2.1.8: 경쟁사 목록/추가 컴포넌트

#### 작업 내용

**components/project/CompetitorList.tsx**:

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Globe } from 'lucide-react'
import { deleteCompetitor } from '@/lib/supabase/queries/competitors'
import { useToast } from '@/hooks/use-toast'
import type { Competitor } from '@/types'

interface CompetitorListProps {
  competitors: Competitor[]
  onUpdate: () => void
}

export function CompetitorList({ competitors, onUpdate }: CompetitorListProps) {
  const { toast } = useToast()

  const handleDelete = async (competitor: Competitor) => {
    if (!confirm(`${competitor.name}을(를) 삭제하시겠습니까?`)) return
    
    const { error } = await deleteCompetitor(competitor.id)
    if (error) {
      toast({ title: '삭제 실패', variant: 'destructive' })
      return
    }
    toast({ title: '경쟁사가 삭제되었습니다' })
    onUpdate()
  }

  if (competitors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          등록된 경쟁사가 없습니다
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {competitors.map((competitor) => (
        <Card key={competitor.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{competitor.name}</h4>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Globe className="h-3 w-3" />
                  {competitor.domain}
                </div>
                {competitor.brand_aliases.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {competitor.brand_aliases.map((alias, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {alias}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(competitor)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**components/project/AddCompetitorDialog.tsx**:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { createCompetitor, getCompetitorCount } from '@/lib/supabase/queries/competitors'
import { useToast } from '@/hooks/use-toast'

interface AddCompetitorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess: () => void
}

export function AddCompetitorDialog({ open, onOpenChange, projectId, onSuccess }: AddCompetitorDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    brand_aliases: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // 경쟁사 수 확인 (최대 5개)
    const count = await getCompetitorCount(projectId)
    if (count >= 5) {
      toast({
        title: '경쟁사 추가 불가',
        description: '경쟁사는 최대 5개까지 등록할 수 있습니다.',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    const aliases = formData.brand_aliases
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const { error } = await createCompetitor({
      project_id: projectId,
      name: formData.name,
      domain: formData.domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      brand_aliases: aliases,
    })

    setIsLoading(false)

    if (error) {
      toast({
        title: '경쟁사 추가 실패',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    toast({ title: '경쟁사가 추가되었습니다' })
    setFormData({ name: '', domain: '', brand_aliases: '' })
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>경쟁사 추가</DialogTitle>
          <DialogDescription>
            비교 분석할 경쟁사 정보를 입력하세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">경쟁사명 *</Label>
            <Input
              id="name"
              placeholder="예: 삼성화재"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">도메인 *</Label>
            <Input
              id="domain"
              placeholder="예: samsungfire.com"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand_aliases">브랜드 별칭</Label>
            <Input
              id="brand_aliases"
              placeholder="쉼표로 구분 (예: 삼성, Samsung)"
              value={formData.brand_aliases}
              onChange={(e) => setFormData({ ...formData, brand_aliases: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name || !formData.domain}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              추가
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

#### 체크리스트
- [ ] CompetitorList.tsx 생성 완료
- [ ] AddCompetitorDialog.tsx 생성 완료
- [ ] 경쟁사 목록 표시 동작
- [ ] 경쟁사 추가 동작 (5개 제한)

---

## 4. 네비게이션 업데이트

### Task 2.1.9: Header 수정

#### 작업 내용

**components/layout/Header.tsx** 수정:

```typescript
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function Header() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: '분석하기' },
    { href: '/analysis', label: '분석 기록' },
    { href: '/projects', label: '프로젝트' },
  ]

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          GEO Analyzer
        </Link>
        <nav className="flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm transition-colors hover:text-primary',
                pathname === item.href
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
```

#### 체크리스트
- [ ] Header.tsx 수정 완료
- [ ] 네비게이션 동작 확인
- [ ] 활성 탭 표시 확인

---

## 5. 검증 체크리스트

### 최종 확인 사항

| 항목 | 확인 |
|------|------|
| 프로젝트 목록 페이지 동작 | [ ] |
| 프로젝트 생성 동작 | [ ] |
| 프로젝트 상세 페이지 동작 | [ ] |
| 쿼리 추가/삭제 동작 | [ ] |
| 쿼리 활성화/비활성화 동작 | [ ] |
| 경쟁사 추가/삭제 동작 (5개 제한) | [ ] |
| 네비게이션 동작 | [ ] |

---

## 6. 다음 단계

이 문서 완료 후:
- **Phase2_02_Dashboard.md**: 대시보드 및 차트 구현

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
