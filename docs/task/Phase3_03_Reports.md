# Phase 3 설계서
## 03. 리포트 생성

---

## Phase 정보
| 항목 | 내용 |
|------|------|
| Phase | 3 - 고급 기능 |
| 문서 | 03/03 |
| 예상 기간 | 2-3일 |
| 선행 작업 | Phase3_02_Auth 완료 |

---

## 1. 개요

### 1.1 목표
- 프로젝트별 GEO 분석 리포트 생성
- PDF 다운로드 기능
- 주간/월간 자동 리포트
- 리포트 템플릿 시스템

### 1.2 산출물
- [ ] 리포트 생성 API
- [ ] PDF 생성 기능
- [ ] 리포트 템플릿 UI
- [ ] 리포트 히스토리 관리
- [ ] 이메일 발송 (선택)

---

## 2. 데이터베이스 스키마

### Task 3.3.1: reports 테이블

#### 작업 내용

```sql
-- ============================================
-- GEO Analyzer: Phase 3 - Reports
-- ============================================

-- reports 테이블
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 리포트 정보
    title TEXT NOT NULL,
    type TEXT DEFAULT 'manual' CHECK (type IN ('manual', 'weekly', 'monthly')),
    period_start DATE,
    period_end DATE,
    
    -- 리포트 데이터 (JSONB)
    summary JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    
    -- 파일 정보
    file_url TEXT,
    file_size INTEGER,
    
    -- 상태
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    error_message TEXT,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    generated_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- RLS 활성화
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view own reports"
ON reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reports"
ON reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
ON reports FOR DELETE
USING (auth.uid() = user_id);
```

#### summary JSONB 구조
```json
{
  "totalAnalyses": 150,
  "avgCitationRate": 45,
  "avgBrandMentionRate": 38,
  "topPerformingQueries": [
    { "query": "암보험 추천", "citationRate": 67 },
    { "query": "암보험 비교", "citationRate": 55 }
  ],
  "llmPerformance": {
    "chatgpt": { "citationRate": 42, "trend": "up" },
    "gemini": { "citationRate": 48, "trend": "stable" },
    "perplexity": { "citationRate": 45, "trend": "up" }
  },
  "competitorComparison": [
    { "name": "삼성화재", "citationRate": 52 },
    { "name": "현대해상", "citationRate": 38 }
  ]
}
```

#### 체크리스트
- [ ] SQL 실행 완료
- [ ] reports 테이블 생성 확인

---

### Task 3.3.2: TypeScript 타입 정의

#### 작업 내용

**types/report.ts**:

```typescript
// ============================================
// Report Types
// ============================================

export type ReportType = 'manual' | 'weekly' | 'monthly'
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed'

export interface QueryPerformance {
  query: string
  citationRate: number
}

export interface LLMPerformance {
  citationRate: number
  trend: 'up' | 'down' | 'stable'
}

export interface CompetitorPerformance {
  name: string
  citationRate: number
}

export interface ReportSummary {
  totalAnalyses: number
  avgCitationRate: number
  avgBrandMentionRate: number
  topPerformingQueries: QueryPerformance[]
  llmPerformance: {
    chatgpt: LLMPerformance
    gemini: LLMPerformance
    perplexity: LLMPerformance
  }
  competitorComparison: CompetitorPerformance[]
}

export interface ReportMetrics {
  citationTrend: { date: string; rate: number }[]
  queryBreakdown: { query: string; analyses: number; avgRate: number }[]
  llmBreakdown: { llm: string; rate: number }[]
}

export interface ReportRecommendation {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
}

export interface Report {
  id: string
  user_id: string
  project_id: string
  title: string
  type: ReportType
  period_start: string | null
  period_end: string | null
  summary: ReportSummary
  metrics: ReportMetrics
  recommendations: ReportRecommendation[]
  file_url: string | null
  file_size: number | null
  status: ReportStatus
  error_message: string | null
  created_at: string
  generated_at: string | null
}

export interface ReportInsert {
  project_id: string
  title: string
  type?: ReportType
  period_start?: string
  period_end?: string
}
```

#### 체크리스트
- [ ] report.ts 생성 완료

---

## 3. 리포트 생성 로직

### Task 3.3.3: 리포트 데이터 수집 함수

#### 작업 내용

**lib/reports/generateReportData.ts**:

```typescript
import { createClient } from '@/lib/supabase/client'
import type { ReportSummary, ReportMetrics, ReportRecommendation } from '@/types/report'

interface GenerateReportDataParams {
  projectId: string
  startDate: Date
  endDate: Date
}

export async function generateReportData(params: GenerateReportDataParams): Promise<{
  summary: ReportSummary
  metrics: ReportMetrics
  recommendations: ReportRecommendation[]
}> {
  const { projectId, startDate, endDate } = params
  const supabase = createClient()

  // 분석 데이터 조회
  const { data: analyses } = await supabase
    .from('analyses')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'completed')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true })

  if (!analyses || analyses.length === 0) {
    return {
      summary: getEmptySummary(),
      metrics: getEmptyMetrics(),
      recommendations: [],
    }
  }

  // 통계 계산
  const summary = calculateSummary(analyses)
  const metrics = calculateMetrics(analyses)
  const recommendations = generateRecommendations(summary, metrics)

  return { summary, metrics, recommendations }
}

function calculateSummary(analyses: any[]): ReportSummary {
  const total = analyses.length
  
  let chatgptCited = 0, geminiCited = 0, perplexityCited = 0
  let chatgptBrand = 0, geminiBrand = 0, perplexityBrand = 0
  
  // 쿼리별 성과 집계
  const queryStats: Record<string, { count: number; cited: number }> = {}
  
  analyses.forEach((analysis) => {
    const results = analysis.results || {}
    const query = analysis.query_text
    
    // LLM별 인용 계산
    if (results.chatgpt?.myDomainCited) chatgptCited++
    if (results.gemini?.myDomainCited) geminiCited++
    if (results.perplexity?.myDomainCited) perplexityCited++
    
    if (results.chatgpt?.brandMentioned) chatgptBrand++
    if (results.gemini?.brandMentioned) geminiBrand++
    if (results.perplexity?.brandMentioned) perplexityBrand++
    
    // 쿼리별 집계
    if (!queryStats[query]) {
      queryStats[query] = { count: 0, cited: 0 }
    }
    queryStats[query].count++
    
    const citedCount = [
      results.chatgpt?.myDomainCited,
      results.gemini?.myDomainCited,
      results.perplexity?.myDomainCited,
    ].filter(Boolean).length
    
    queryStats[query].cited += citedCount
  })
  
  // 상위 쿼리
  const topQueries = Object.entries(queryStats)
    .map(([query, stats]) => ({
      query,
      citationRate: Math.round((stats.cited / (stats.count * 3)) * 100),
    }))
    .sort((a, b) => b.citationRate - a.citationRate)
    .slice(0, 5)
  
  // 트렌드 계산 (간단히 전반부 vs 후반부)
  const midPoint = Math.floor(analyses.length / 2)
  const firstHalf = analyses.slice(0, midPoint)
  const secondHalf = analyses.slice(midPoint)
  
  const getTrend = (first: any[], second: any[], llm: string): 'up' | 'down' | 'stable' => {
    const firstRate = first.filter(a => a.results?.[llm]?.myDomainCited).length / (first.length || 1)
    const secondRate = second.filter(a => a.results?.[llm]?.myDomainCited).length / (second.length || 1)
    
    const diff = secondRate - firstRate
    if (diff > 0.05) return 'up'
    if (diff < -0.05) return 'down'
    return 'stable'
  }
  
  return {
    totalAnalyses: total,
    avgCitationRate: Math.round(((chatgptCited + geminiCited + perplexityCited) / (total * 3)) * 100),
    avgBrandMentionRate: Math.round(((chatgptBrand + geminiBrand + perplexityBrand) / (total * 3)) * 100),
    topPerformingQueries: topQueries,
    llmPerformance: {
      chatgpt: {
        citationRate: Math.round((chatgptCited / total) * 100),
        trend: getTrend(firstHalf, secondHalf, 'chatgpt'),
      },
      gemini: {
        citationRate: Math.round((geminiCited / total) * 100),
        trend: getTrend(firstHalf, secondHalf, 'gemini'),
      },
      perplexity: {
        citationRate: Math.round((perplexityCited / total) * 100),
        trend: getTrend(firstHalf, secondHalf, 'perplexity'),
      },
    },
    competitorComparison: [], // 별도 쿼리 필요
  }
}

function calculateMetrics(analyses: any[]): ReportMetrics {
  // 일별 추이
  const dailyData: Record<string, { total: number; cited: number }> = {}
  
  analyses.forEach((analysis) => {
    const date = analysis.created_at.split('T')[0]
    if (!dailyData[date]) {
      dailyData[date] = { total: 0, cited: 0 }
    }
    dailyData[date].total++
    
    const results = analysis.results || {}
    const citedCount = [
      results.chatgpt?.myDomainCited,
      results.gemini?.myDomainCited,
      results.perplexity?.myDomainCited,
    ].filter(Boolean).length
    
    dailyData[date].cited += citedCount
  })
  
  const citationTrend = Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      rate: Math.round((data.cited / (data.total * 3)) * 100),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
  
  // 쿼리별 분석
  const queryData: Record<string, { count: number; cited: number }> = {}
  
  analyses.forEach((analysis) => {
    const query = analysis.query_text
    if (!queryData[query]) {
      queryData[query] = { count: 0, cited: 0 }
    }
    queryData[query].count++
    
    const results = analysis.results || {}
    const citedCount = [
      results.chatgpt?.myDomainCited,
      results.gemini?.myDomainCited,
      results.perplexity?.myDomainCited,
    ].filter(Boolean).length
    
    queryData[query].cited += citedCount
  })
  
  const queryBreakdown = Object.entries(queryData)
    .map(([query, data]) => ({
      query,
      analyses: data.count,
      avgRate: Math.round((data.cited / (data.count * 3)) * 100),
    }))
    .sort((a, b) => b.analyses - a.analyses)
  
  // LLM별 분석
  const llmBreakdown = [
    { llm: 'ChatGPT', rate: 0 },
    { llm: 'Gemini', rate: 0 },
    { llm: 'Perplexity', rate: 0 },
  ]
  
  analyses.forEach((analysis) => {
    const results = analysis.results || {}
    if (results.chatgpt?.myDomainCited) llmBreakdown[0].rate++
    if (results.gemini?.myDomainCited) llmBreakdown[1].rate++
    if (results.perplexity?.myDomainCited) llmBreakdown[2].rate++
  })
  
  const total = analyses.length
  llmBreakdown.forEach(item => {
    item.rate = Math.round((item.rate / total) * 100)
  })
  
  return {
    citationTrend,
    queryBreakdown,
    llmBreakdown,
  }
}

function generateRecommendations(
  summary: ReportSummary,
  metrics: ReportMetrics
): ReportRecommendation[] {
  const recommendations: ReportRecommendation[] = []
  
  // 인용률 기반 제안
  if (summary.avgCitationRate < 30) {
    recommendations.push({
      priority: 'high',
      category: 'content',
      title: '콘텐츠 GEO 최적화 필요',
      description: '평균 인용률이 30% 미만입니다. FAQ 섹션 추가, BLUF 구조 적용, Schema 마크업 추가를 권장합니다.',
    })
  }
  
  // LLM별 제안
  const { llmPerformance } = summary
  
  if (llmPerformance.perplexity.citationRate < 30) {
    recommendations.push({
      priority: 'high',
      category: 'perplexity',
      title: 'Perplexity 최적화 필요',
      description: 'FAQPage Schema 추가, 질문형 헤딩 사용, 80토큰 이내 직접 답변 배치를 권장합니다.',
    })
  }
  
  if (llmPerformance.gemini.citationRate < 30) {
    recommendations.push({
      priority: 'medium',
      category: 'gemini',
      title: 'Gemini 최적화 필요',
      description: 'dateModified 표시, E-E-A-T 신호 강화, Organization Schema 추가를 권장합니다.',
    })
  }
  
  // 트렌드 기반 제안
  if (llmPerformance.chatgpt.trend === 'down') {
    recommendations.push({
      priority: 'medium',
      category: 'chatgpt',
      title: 'ChatGPT 인용률 하락 추세',
      description: '최근 ChatGPT에서의 인용률이 감소하고 있습니다. 콘텐츠 최신성과 정확성을 점검해주세요.',
    })
  }
  
  // 쿼리 기반 제안
  const lowPerformingQueries = metrics.queryBreakdown.filter(q => q.avgRate < 20)
  if (lowPerformingQueries.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'query',
      title: `${lowPerformingQueries.length}개 쿼리 개선 필요`,
      description: `인용률이 20% 미만인 쿼리가 있습니다: ${lowPerformingQueries.slice(0, 3).map(q => q.query).join(', ')}`,
    })
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

function getEmptySummary(): ReportSummary {
  return {
    totalAnalyses: 0,
    avgCitationRate: 0,
    avgBrandMentionRate: 0,
    topPerformingQueries: [],
    llmPerformance: {
      chatgpt: { citationRate: 0, trend: 'stable' },
      gemini: { citationRate: 0, trend: 'stable' },
      perplexity: { citationRate: 0, trend: 'stable' },
    },
    competitorComparison: [],
  }
}

function getEmptyMetrics(): ReportMetrics {
  return {
    citationTrend: [],
    queryBreakdown: [],
    llmBreakdown: [],
  }
}
```

#### 체크리스트
- [ ] generateReportData.ts 생성 완료

---

## 4. 프론트엔드 UI

### Task 3.3.4: 리포트 페이지

#### 작업 내용

**app/reports/page.tsx**:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Download, Plus, Calendar, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProjects } from '@/lib/supabase/queries/projects'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { GenerateReportDialog } from '@/components/reports/GenerateReportDialog'
import type { Project, Report } from '@/types'

export default function ReportsPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  // 프로젝트 로드
  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await getProjects()
      setProjects(data || [])
      if (data && data.length > 0) {
        setSelectedProjectId(data[0].id)
      }
      setIsLoading(false)
    }
    fetchProjects()
  }, [])

  // 리포트 로드
  useEffect(() => {
    if (!selectedProjectId) return

    const fetchReports = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false })

      setReports(data || [])
    }
    fetchReports()
  }, [selectedProjectId])

  const handleReportGenerated = () => {
    setShowGenerateDialog(false)
    // 리포트 목록 새로고침
    if (selectedProjectId) {
      const fetchReports = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from('reports')
          .select('*')
          .eq('project_id', selectedProjectId)
          .order('created_at', { ascending: false })
        setReports(data || [])
      }
      fetchReports()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">완료</Badge>
      case 'generating':
        return <Badge className="bg-yellow-100 text-yellow-800">생성 중</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">실패</Badge>
      default:
        return <Badge variant="outline">대기</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">프로젝트가 없습니다</h2>
        <p className="text-muted-foreground">
          먼저 프로젝트를 생성하고 분석을 실행하세요
        </p>
      </div>
    )
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">리포트</h1>
          <p className="text-muted-foreground">GEO 분석 리포트를 생성하고 관리하세요</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="프로젝트 선택" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            새 리포트
          </Button>
        </div>
      </div>

      {/* 리포트 목록 */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">리포트가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              첫 번째 GEO 분석 리포트를 생성하세요
            </p>
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              리포트 생성
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{report.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {report.period_start && report.period_end && (
                          <span>
                            {report.period_start} ~ {report.period_end}
                          </span>
                        )}
                        <span>·</span>
                        <span>
                          {formatDistanceToNow(new Date(report.created_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(report.status)}
                    {report.status === 'completed' && report.file_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={report.file_url} download>
                          <Download className="mr-2 h-4 w-4" />
                          다운로드
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 리포트 생성 다이얼로그 */}
      {selectedProject && (
        <GenerateReportDialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
          project={selectedProject}
          onSuccess={handleReportGenerated}
        />
      )}
    </div>
  )
}
```

#### 체크리스트
- [ ] reports/page.tsx 생성 완료

---

### Task 3.3.5: 리포트 생성 다이얼로그

#### 작업 내용

**components/reports/GenerateReportDialog.tsx**:

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
import { Loader2, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateReportData } from '@/lib/reports/generateReportData'
import { useToast } from '@/hooks/use-toast'
import type { Project, ReportType } from '@/types'

interface GenerateReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  onSuccess: () => void
}

export function GenerateReportDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: GenerateReportDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: `${project.name} GEO 리포트`,
    type: 'manual' as ReportType,
    periodStart: getDefaultStartDate(),
    periodEnd: getDefaultEndDate(),
  })

  function getDefaultStartDate() {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  }

  function getDefaultEndDate() {
    return new Date().toISOString().split('T')[0]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('로그인이 필요합니다')
      }

      // 리포트 데이터 생성
      const { summary, metrics, recommendations } = await generateReportData({
        projectId: project.id,
        startDate: new Date(formData.periodStart),
        endDate: new Date(formData.periodEnd),
      })

      // 리포트 저장
      const { error } = await supabase.from('reports').insert({
        user_id: user.id,
        project_id: project.id,
        title: formData.title,
        type: formData.type,
        period_start: formData.periodStart,
        period_end: formData.periodEnd,
        summary,
        metrics,
        recommendations,
        status: 'completed',
        generated_at: new Date().toISOString(),
      })

      if (error) throw error

      toast({ title: '리포트가 생성되었습니다' })
      onSuccess()
    } catch (error: any) {
      toast({
        title: '리포트 생성 실패',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 리포트 생성</DialogTitle>
          <DialogDescription>
            {project.name} 프로젝트의 GEO 분석 리포트를 생성합니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">리포트 제목</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>리포트 유형</Label>
            <Select
              value={formData.type}
              onValueChange={(value: ReportType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">수동 생성</SelectItem>
                <SelectItem value="weekly">주간 리포트</SelectItem>
                <SelectItem value="monthly">월간 리포트</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodStart">시작일</Label>
              <Input
                id="periodStart"
                type="date"
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">종료일</Label>
              <Input
                id="periodEnd"
                type="date"
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              생성
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

#### 체크리스트
- [ ] GenerateReportDialog.tsx 생성 완료

---

### Task 3.3.6: 네비게이션 업데이트

#### 작업 내용

**components/layout/Header.tsx** 수정:

```typescript
const navItems = [
  { href: '/', label: '분석하기' },
  { href: '/analysis', label: '분석 기록' },
  { href: '/projects', label: '프로젝트' },
  { href: '/dashboard', label: '대시보드' },
  { href: '/page-analysis', label: '페이지 분석' },
  { href: '/reports', label: '리포트' },  // 추가
]
```

#### 체크리스트
- [ ] Header.tsx 수정 완료

---

## 5. PDF 생성 (선택사항)

### Task 3.3.7: PDF 생성 Edge Function

#### 작업 내용

PDF 생성은 복잡하므로 MVP에서는 웹 UI로 리포트를 표시하고, 
브라우저의 "인쇄 > PDF로 저장" 기능을 활용하는 것을 권장합니다.

향후 확장 시:
- `jspdf` + `html2canvas` 라이브러리 사용
- 또는 Puppeteer를 사용한 서버사이드 PDF 생성 (별도 서버 필요)

#### 체크리스트
- [ ] PDF 생성은 MVP 이후로 연기

---

## 6. 검증 체크리스트

### 최종 확인 사항

| 항목 | 확인 |
|------|------|
| 리포트 목록 표시 | [ ] |
| 리포트 생성 동작 | [ ] |
| 기간 설정 동작 | [ ] |
| 리포트 데이터 계산 정확성 | [ ] |
| 개선 제안 생성 | [ ] |

---

## 7. 전체 Phase 완료 체크리스트

### Phase 3 완료 확인

| 문서 | 내용 | 상태 |
|------|------|------|
| Phase3_01_PageAnalysis.md | 페이지 구조 분석 | [ ] |
| Phase3_02_Auth.md | 인증 시스템 | [ ] |
| Phase3_03_Reports.md | 리포트 생성 | [ ] |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
