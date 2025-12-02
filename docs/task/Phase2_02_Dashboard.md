# Phase 2 설계서
## 02. 대시보드 및 차트

---

## Phase 정보
| 항목 | 내용 |
|------|------|
| Phase | 2 - 분석 확장 |
| 문서 | 02/03 |
| 예상 기간 | 3-4일 |
| 선행 작업 | Phase2_01_ProjectManagement 완료 |

---

## 1. 개요

### 1.1 목표
- 프로젝트별 분석 현황 대시보드
- 인용률 추이 차트
- **4개 LLM별 비교 차트 (ChatGPT, Gemini, Perplexity, Claude)**
- 경쟁사 비교 차트
- 쿼리별 성과 테이블
- **크로스 플랫폼 검증 통계**

### 1.2 산출물
- [ ] 대시보드 메인 페이지
- [ ] 지표 카드 컴포넌트
- [ ] 인용률 추이 차트
- [ ] LLM별 비교 차트
- [ ] 경쟁사 비교 차트
- [ ] 통계 계산 함수

---

## 2. 데이터베이스 확장

### Task 2.2.1: 일별 통계 테이블

#### 작업 내용

```sql
-- ============================================
-- GEO Analyzer: Dashboard Statistics Tables
-- ============================================

-- daily_metrics: 일별 집계 통계
CREATE TABLE IF NOT EXISTS daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- 인용률 지표
    total_analyses INTEGER DEFAULT 0,
    successful_analyses INTEGER DEFAULT 0,
    
    -- LLM별 인용 통계 (4개 LLM)
    perplexity_citation_count INTEGER DEFAULT 0,
    perplexity_brand_mention_count INTEGER DEFAULT 0,
    chatgpt_citation_count INTEGER DEFAULT 0,
    chatgpt_brand_mention_count INTEGER DEFAULT 0,
    gemini_citation_count INTEGER DEFAULT 0,
    gemini_brand_mention_count INTEGER DEFAULT 0,
    claude_citation_count INTEGER DEFAULT 0,
    claude_brand_mention_count INTEGER DEFAULT 0,
    
    -- 종합 지표
    total_citations INTEGER DEFAULT 0,
    my_domain_citations INTEGER DEFAULT 0,
    brand_mentions INTEGER DEFAULT 0,
    avg_citation_position DECIMAL(5,2),
    
    -- 경쟁사 인용 (JSONB)
    competitor_citations JSONB DEFAULT '{}',
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(project_id, date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_metrics_project_date ON daily_metrics(project_id, date DESC);

-- 트리거
CREATE TRIGGER update_daily_metrics_updated_at 
    BEFORE UPDATE ON daily_metrics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- competitor_citations JSONB 구조 예시:
-- {
--   "competitor_id_1": { "citation_count": 5, "brand_mentions": 3 },
--   "competitor_id_2": { "citation_count": 3, "brand_mentions": 2 }
-- }
```

#### 체크리스트
- [ ] SQL 실행 완료
- [ ] daily_metrics 테이블 생성 확인

---

### Task 2.2.2: 통계 계산 함수

#### 작업 내용

**lib/supabase/queries/metrics.ts** 생성:

```typescript
import { createClient } from '../client'
import type { Analysis, Competitor } from '@/types'

// 일별 통계 타입 (4개 LLM)
export interface DailyMetric {
  id: string
  project_id: string
  date: string
  total_analyses: number
  successful_analyses: number
  // 4개 LLM별 통계
  perplexity_citation_count: number
  perplexity_brand_mention_count: number
  chatgpt_citation_count: number
  chatgpt_brand_mention_count: number
  gemini_citation_count: number
  gemini_brand_mention_count: number
  claude_citation_count: number
  claude_brand_mention_count: number
  // 종합 통계
  total_citations: number
  my_domain_citations: number
  brand_mentions: number
  avg_citation_position: number | null
  avg_confidence_score: number | null  // Gemini 신뢰도 평균
  cross_validated_count: number        // 2개+ LLM에서 인용된 횟수
  competitor_citations: Record<string, { citation_count: number; brand_mentions: number }>
}

// 대시보드 요약 통계 (4개 LLM)
export interface DashboardStats {
  totalAnalyses: number
  avgCitationRate: number
  avgBrandMentionRate: number
  citationRateByLLM: {
    perplexity: number
    chatgpt: number
    gemini: number
    claude: number
  }
  avgConfidenceScore: number | null      // Gemini 평균 신뢰도
  crossValidatedRate: number             // 크로스 검증된 인용 비율
  recentTrend: 'up' | 'down' | 'stable'
  trendPercentage: number
}

// 프로젝트 대시보드 통계 조회
export async function getProjectDashboardStats(projectId: string): Promise<DashboardStats> {
  const supabase = createClient()
  
  // 최근 30일 분석 데이터 조회
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: analyses, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'completed')
    .gte('created_at', thirtyDaysAgo.toISOString())
  
  if (error || !analyses || analyses.length === 0) {
    return {
      totalAnalyses: 0,
      avgCitationRate: 0,
      avgBrandMentionRate: 0,
      citationRateByLLM: { chatgpt: 0, gemini: 0, perplexity: 0 },
      recentTrend: 'stable',
      trendPercentage: 0,
    }
  }
  
  // 통계 계산 (4개 LLM)
  let perplexityCited = 0, chatgptCited = 0, geminiCited = 0, claudeCited = 0
  let perplexityBrand = 0, chatgptBrand = 0, geminiBrand = 0, claudeBrand = 0
  let totalConfidence = 0, confidenceCount = 0
  let crossValidatedCount = 0

  analyses.forEach((analysis: Analysis) => {
    const results = analysis.results

    // 인용 여부 체크
    if (results.perplexity?.myDomainCited) perplexityCited++
    if (results.chatgpt?.myDomainCited) chatgptCited++
    if (results.gemini?.myDomainCited) geminiCited++
    if (results.claude?.myDomainCited) claudeCited++

    // 브랜드 언급 체크
    if (results.perplexity?.brandMentioned) perplexityBrand++
    if (results.chatgpt?.brandMentioned) chatgptBrand++
    if (results.gemini?.brandMentioned) geminiBrand++
    if (results.claude?.brandMentioned) claudeBrand++

    // Gemini 신뢰도 점수 평균
    if (results.gemini?.avgConfidence) {
      totalConfidence += results.gemini.avgConfidence
      confidenceCount++
    }

    // 크로스 검증 (2개+ LLM에서 인용)
    const citedCount = [
      results.perplexity?.myDomainCited,
      results.chatgpt?.myDomainCited,
      results.gemini?.myDomainCited,
      results.claude?.myDomainCited
    ].filter(Boolean).length
    if (citedCount >= 2) crossValidatedCount++
  })
  
  const total = analyses.length
  
  // 최근 7일 vs 이전 7일 비교 (트렌드)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  
  const recentAnalyses = analyses.filter(a => new Date(a.created_at) >= sevenDaysAgo)
  const previousAnalyses = analyses.filter(a => {
    const date = new Date(a.created_at)
    return date >= fourteenDaysAgo && date < sevenDaysAgo
  })
  
  const recentRate = recentAnalyses.length > 0
    ? recentAnalyses.filter(a => a.summary?.myDomainCitedCount > 0).length / recentAnalyses.length
    : 0
  
  const previousRate = previousAnalyses.length > 0
    ? previousAnalyses.filter(a => a.summary?.myDomainCitedCount > 0).length / previousAnalyses.length
    : 0
  
  let recentTrend: 'up' | 'down' | 'stable' = 'stable'
  let trendPercentage = 0
  
  if (previousRate > 0) {
    trendPercentage = ((recentRate - previousRate) / previousRate) * 100
    if (trendPercentage > 5) recentTrend = 'up'
    else if (trendPercentage < -5) recentTrend = 'down'
  }
  
  const totalCited = perplexityCited + chatgptCited + geminiCited + claudeCited
  const totalBrand = perplexityBrand + chatgptBrand + geminiBrand + claudeBrand
  const totalLLMs = 4

  return {
    totalAnalyses: total,
    avgCitationRate: Math.round((totalCited / (total * totalLLMs)) * 100),
    avgBrandMentionRate: Math.round((totalBrand / (total * totalLLMs)) * 100),
    citationRateByLLM: {
      perplexity: Math.round((perplexityCited / total) * 100),
      chatgpt: Math.round((chatgptCited / total) * 100),
      gemini: Math.round((geminiCited / total) * 100),
      claude: Math.round((claudeCited / total) * 100),
    },
    avgConfidenceScore: confidenceCount > 0 ? Math.round((totalConfidence / confidenceCount) * 100) / 100 : null,
    crossValidatedRate: Math.round((crossValidatedCount / total) * 100),
    recentTrend,
    trendPercentage: Math.round(Math.abs(trendPercentage)),
  }
}

// 일별 인용률 추이 (차트용) - 4개 LLM
export async function getCitationTrend(projectId: string, days: number = 30): Promise<{
  date: string
  citationRate: number
  perplexity: number
  chatgpt: number
  gemini: number
  claude: number
}[]> {
  const supabase = createClient()
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data: analyses } = await supabase
    .from('analyses')
    .select('created_at, results, summary')
    .eq('project_id', projectId)
    .eq('status', 'completed')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })
  
  if (!analyses) return []
  
  // 일별로 그룹화 (4개 LLM)
  const dailyData: Record<string, {
    total: number
    perplexity: number
    chatgpt: number
    gemini: number
    claude: number
  }> = {}

  analyses.forEach((analysis: any) => {
    const date = new Date(analysis.created_at).toISOString().split('T')[0]

    if (!dailyData[date]) {
      dailyData[date] = { total: 0, perplexity: 0, chatgpt: 0, gemini: 0, claude: 0 }
    }

    dailyData[date].total++

    if (analysis.results?.perplexity?.myDomainCited) dailyData[date].perplexity++
    if (analysis.results?.chatgpt?.myDomainCited) dailyData[date].chatgpt++
    if (analysis.results?.gemini?.myDomainCited) dailyData[date].gemini++
    if (analysis.results?.claude?.myDomainCited) dailyData[date].claude++
  })

  const totalLLMs = 4
  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    citationRate: Math.round(((data.perplexity + data.chatgpt + data.gemini + data.claude) / (data.total * totalLLMs)) * 100),
    perplexity: Math.round((data.perplexity / data.total) * 100),
    chatgpt: Math.round((data.chatgpt / data.total) * 100),
    gemini: Math.round((data.gemini / data.total) * 100),
    claude: Math.round((data.claude / data.total) * 100),
  }))
}

// 경쟁사 비교 데이터
export async function getCompetitorComparison(
  projectId: string,
  competitors: Competitor[]
): Promise<{
  name: string
  domain: string
  citationRate: number
  brandMentionRate: number
}[]> {
  const supabase = createClient()
  
  // 최근 30일 분석 데이터
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: analyses } = await supabase
    .from('analyses')
    .select('results')
    .eq('project_id', projectId)
    .eq('status', 'completed')
    .gte('created_at', thirtyDaysAgo.toISOString())
  
  if (!analyses || analyses.length === 0) return []
  
  const results: {
    name: string
    domain: string
    citationRate: number
    brandMentionRate: number
  }[] = []
  
  // 각 경쟁사별 인용 횟수 계산 (4개 LLM)
  for (const competitor of competitors) {
    let citedCount = 0
    let mentionCount = 0

    analyses.forEach((analysis: any) => {
      const allCitations = [
        ...(analysis.results?.perplexity?.citations || []),
        ...(analysis.results?.chatgpt?.citations || []),
        ...(analysis.results?.gemini?.citations || []),
        ...(analysis.results?.claude?.citations || []),
      ]
      
      // 도메인 인용 확인
      const cited = allCitations.some(c => 
        c.domain?.includes(competitor.domain.replace('www.', ''))
      )
      if (cited) citedCount++
      
      // 브랜드 언급 확인 (4개 LLM)
      const answers = [
        analysis.results?.perplexity?.answer || '',
        analysis.results?.chatgpt?.answer || '',
        analysis.results?.gemini?.answer || '',
        analysis.results?.claude?.answer || '',
      ].join(' ')
      
      const searchTerms = [competitor.name, ...competitor.brand_aliases]
      const mentioned = searchTerms.some(term => 
        answers.toLowerCase().includes(term.toLowerCase())
      )
      if (mentioned) mentionCount++
    })
    
    results.push({
      name: competitor.name,
      domain: competitor.domain,
      citationRate: Math.round((citedCount / analyses.length) * 100),
      brandMentionRate: Math.round((mentionCount / analyses.length) * 100),
    })
  }
  
  return results
}

// 쿼리별 성과
export async function getQueryPerformance(projectId: string): Promise<{
  queryId: string
  queryText: string
  analysisCount: number
  avgCitationRate: number
  lastAnalysis: string | null
}[]> {
  const supabase = createClient()
  
  const { data: queries } = await supabase
    .from('queries')
    .select('id, text, last_analysis_at, avg_citation_rate')
    .eq('project_id', projectId)
    .eq('is_active', true)
  
  if (!queries) return []
  
  // 각 쿼리별 분석 횟수 조회
  const results = await Promise.all(
    queries.map(async (query) => {
      const { count } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('query_id', query.id)
      
      return {
        queryId: query.id,
        queryText: query.text,
        analysisCount: count || 0,
        avgCitationRate: query.avg_citation_rate || 0,
        lastAnalysis: query.last_analysis_at,
      }
    })
  )
  
  return results.sort((a, b) => b.analysisCount - a.analysisCount)
}
```

#### 체크리스트
- [ ] metrics.ts 생성 완료
- [ ] 통계 계산 함수 구현 완료

---

## 3. 대시보드 UI

### Task 2.2.3: 대시보드 페이지

#### 작업 내용

**app/dashboard/page.tsx**:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, MessageSquare } from 'lucide-react'
import { getProjects } from '@/lib/supabase/queries/projects'
import { getProjectDashboardStats, DashboardStats } from '@/lib/supabase/queries/metrics'
import { CitationTrendChart } from '@/components/dashboard/CitationTrendChart'
import { LLMComparisonChart } from '@/components/dashboard/LLMComparisonChart'
import { CompetitorComparisonChart } from '@/components/dashboard/CompetitorComparisonChart'
import { QueryPerformanceTable } from '@/components/dashboard/QueryPerformanceTable'
import type { Project } from '@/types'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 프로젝트 목록 로드
  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await getProjects()
      setProjects(data || [])
      
      // URL 파라미터 또는 첫 번째 프로젝트 선택
      const projectIdFromUrl = searchParams.get('projectId')
      if (projectIdFromUrl && data?.find(p => p.id === projectIdFromUrl)) {
        setSelectedProjectId(projectIdFromUrl)
      } else if (data && data.length > 0) {
        setSelectedProjectId(data[0].id)
      }
      
      setIsLoading(false)
    }
    fetchProjects()
  }, [searchParams])

  // 선택된 프로젝트 통계 로드
  useEffect(() => {
    if (!selectedProjectId) return
    
    const fetchStats = async () => {
      const data = await getProjectDashboardStats(selectedProjectId)
      setStats(data)
    }
    fetchStats()
  }, [selectedProjectId])

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">프로젝트가 없습니다</h2>
        <p className="text-muted-foreground">
          먼저 프로젝트를 생성하고 분석을 실행하세요
        </p>
      </div>
    )
  }

  const TrendIcon = stats?.recentTrend === 'up' 
    ? TrendingUp 
    : stats?.recentTrend === 'down' 
    ? TrendingDown 
    : Minus

  const trendColor = stats?.recentTrend === 'up'
    ? 'text-green-600'
    : stats?.recentTrend === 'down'
    ? 'text-red-600'
    : 'text-gray-500'

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">대시보드</h1>
          <p className="text-muted-foreground">프로젝트별 GEO 분석 현황</p>
        </div>
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
      </div>

      {/* 지표 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              총 분석 수
            </CardDescription>
            <CardTitle className="text-3xl">{stats?.totalAnalyses || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">최근 30일</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              평균 인용률
            </CardDescription>
            <CardTitle className="text-3xl">{stats?.avgCitationRate || 0}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              <span>
                {stats?.recentTrend === 'stable' 
                  ? '변동 없음' 
                  : `${stats?.trendPercentage}% ${stats?.recentTrend === 'up' ? '상승' : '하락'}`
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              브랜드 언급률
            </CardDescription>
            <CardTitle className="text-3xl">{stats?.avgBrandMentionRate || 0}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">4개 LLM 평균</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>최고 인용 LLM</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.citationRateByLLM 
                ? Object.entries(stats.citationRateByLLM)
                    .sort(([,a], [,b]) => b - a)[0]?.[0]?.toUpperCase() || '-'
                : '-'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats?.citationRateByLLM 
                ? `${Math.max(...Object.values(stats.citationRateByLLM))}% 인용률`
                : ''
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>인용률 추이</CardTitle>
            <CardDescription>최근 30일 일별 인용률 변화</CardDescription>
          </CardHeader>
          <CardContent>
            <CitationTrendChart projectId={selectedProjectId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4개 LLM별 인용률</CardTitle>
            <CardDescription>Perplexity, ChatGPT, Gemini, Claude 인용률 비교</CardDescription>
          </CardHeader>
          <CardContent>
            <LLMComparisonChart stats={stats} />
          </CardContent>
        </Card>
      </div>

      {/* 경쟁사 비교 */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>경쟁사 비교</CardTitle>
            <CardDescription>내 도메인 vs 경쟁사 인용률 비교</CardDescription>
          </CardHeader>
          <CardContent>
            <CompetitorComparisonChart 
              projectId={selectedProjectId}
              myDomain={selectedProject.domain}
              myBrand={selectedProject.brand_name}
              myCitationRate={stats?.avgCitationRate || 0}
            />
          </CardContent>
        </Card>
      )}

      {/* 쿼리별 성과 */}
      <Card>
        <CardHeader>
          <CardTitle>쿼리별 성과</CardTitle>
          <CardDescription>등록된 쿼리별 분석 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <QueryPerformanceTable projectId={selectedProjectId} />
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 체크리스트
- [ ] dashboard/page.tsx 생성 완료
- [ ] 프로젝트 선택 동작
- [ ] 지표 카드 표시

---

### Task 2.2.4: 인용률 추이 차트

#### 작업 내용

```bash
# Recharts 설치 확인
npm install recharts
```

**components/dashboard/CitationTrendChart.tsx**:

```typescript
'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { getCitationTrend } from '@/lib/supabase/queries/metrics'

interface CitationTrendChartProps {
  projectId: string
}

export function CitationTrendChart({ projectId }: CitationTrendChartProps) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const trend = await getCitationTrend(projectId, 30)
      setData(trend)
      setIsLoading(false)
    }
    fetchData()
  }, [projectId])

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        분석 데이터가 없습니다
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          fontSize={12}
        />
        <YAxis 
          tickFormatter={(value) => `${value}%`}
          fontSize={12}
          domain={[0, 100]}
        />
        <Tooltip 
          formatter={(value: number) => [`${value}%`, '']}
          labelFormatter={(label) => new Date(label).toLocaleDateString('ko-KR')}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="citationRate" 
          name="종합 인용률"
          stroke="#2563eb" 
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="perplexity"
          name="Perplexity"
          stroke="#f59e0b"
          strokeWidth={1}
          dot={false}
          strokeDasharray="5 5"
        />
        <Line
          type="monotone"
          dataKey="chatgpt"
          name="ChatGPT"
          stroke="#10b981"
          strokeWidth={1}
          dot={false}
          strokeDasharray="5 5"
        />
        <Line
          type="monotone"
          dataKey="gemini"
          name="Gemini"
          stroke="#6366f1"
          strokeWidth={1}
          dot={false}
          strokeDasharray="5 5"
        />
        <Line
          type="monotone"
          dataKey="claude"
          name="Claude"
          stroke="#ec4899"
          strokeWidth={1}
          dot={false}
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

#### 체크리스트
- [ ] CitationTrendChart.tsx 생성 완료
- [ ] 차트 렌더링 확인

---

### Task 2.2.5: LLM 비교 차트

#### 작업 내용

**components/dashboard/LLMComparisonChart.tsx**:

```typescript
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { DashboardStats } from '@/lib/supabase/queries/metrics'

interface LLMComparisonChartProps {
  stats: DashboardStats | null
}

// 4개 LLM 색상 정의
const llmColors: Record<string, string> = {
  Perplexity: '#f59e0b',  // 주황
  ChatGPT: '#10b981',     // 초록
  Gemini: '#6366f1',      // 보라
  Claude: '#ec4899',      // 분홍
}

export function LLMComparisonChart({ stats }: LLMComparisonChartProps) {
  if (!stats) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        데이터를 불러오는 중...
      </div>
    )
  }

  // 4개 LLM 데이터
  const data = [
    { name: 'Perplexity', value: stats.citationRateByLLM.perplexity },
    { name: 'ChatGPT', value: stats.citationRateByLLM.chatgpt },
    { name: 'Gemini', value: stats.citationRateByLLM.gemini },
    { name: 'Claude', value: stats.citationRateByLLM.claude },
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis 
          type="number" 
          tickFormatter={(value) => `${value}%`}
          domain={[0, 100]}
          fontSize={12}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={80}
          fontSize={12}
        />
        <Tooltip formatter={(value: number) => [`${value}%`, '인용률']} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={llmColors[entry.name]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

#### 체크리스트
- [ ] LLMComparisonChart.tsx 생성 완료

---

### Task 2.2.6: 경쟁사 비교 차트

#### 작업 내용

**components/dashboard/CompetitorComparisonChart.tsx**:

```typescript
'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { getCompetitorsByProject } from '@/lib/supabase/queries/competitors'
import { getCompetitorComparison } from '@/lib/supabase/queries/metrics'

interface CompetitorComparisonChartProps {
  projectId: string
  myDomain: string
  myBrand: string
  myCitationRate: number
}

export function CompetitorComparisonChart({ 
  projectId, 
  myDomain, 
  myBrand,
  myCitationRate 
}: CompetitorComparisonChartProps) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: competitors } = await getCompetitorsByProject(projectId)
      
      if (competitors && competitors.length > 0) {
        const comparison = await getCompetitorComparison(projectId, competitors)
        
        // 내 데이터 + 경쟁사 데이터
        const chartData = [
          { name: myBrand, citationRate: myCitationRate, isMine: true },
          ...comparison.map(c => ({ 
            name: c.name, 
            citationRate: c.citationRate,
            isMine: false 
          }))
        ]
        
        setData(chartData)
      } else {
        setData([{ name: myBrand, citationRate: myCitationRate, isMine: true }])
      }
      
      setIsLoading(false)
    }
    fetchData()
  }, [projectId, myBrand, myCitationRate])

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis 
          tickFormatter={(value) => `${value}%`}
          domain={[0, 100]}
          fontSize={12}
        />
        <Tooltip formatter={(value: number) => [`${value}%`, '인용률']} />
        <Bar 
          dataKey="citationRate" 
          name="인용률"
          fill="#94a3b8"
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.isMine ? '#2563eb' : '#94a3b8'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Cell import 추가 필요
import { Cell } from 'recharts'
```

#### 체크리스트
- [ ] CompetitorComparisonChart.tsx 생성 완료

---

### Task 2.2.7: 쿼리 성과 테이블

#### 작업 내용

**components/dashboard/QueryPerformanceTable.tsx**:

```typescript
'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getQueryPerformance } from '@/lib/supabase/queries/metrics'

interface QueryPerformanceTableProps {
  projectId: string
}

export function QueryPerformanceTable({ projectId }: QueryPerformanceTableProps) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const performance = await getQueryPerformance(projectId)
      setData(performance)
      setIsLoading(false)
    }
    fetchData()
  }, [projectId])

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        등록된 쿼리가 없습니다
      </div>
    )
  }

  const getCitationBadge = (rate: number) => {
    if (rate >= 66) return <Badge className="bg-green-100 text-green-800">높음</Badge>
    if (rate >= 33) return <Badge className="bg-yellow-100 text-yellow-800">보통</Badge>
    return <Badge className="bg-red-100 text-red-800">낮음</Badge>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>쿼리</TableHead>
          <TableHead className="text-center">분석 횟수</TableHead>
          <TableHead className="text-center">평균 인용률</TableHead>
          <TableHead className="text-center">성과</TableHead>
          <TableHead className="text-right">마지막 분석</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.queryId}>
            <TableCell className="font-medium max-w-xs truncate">
              {item.queryText}
            </TableCell>
            <TableCell className="text-center">{item.analysisCount}</TableCell>
            <TableCell className="text-center">{item.avgCitationRate}%</TableCell>
            <TableCell className="text-center">
              {getCitationBadge(item.avgCitationRate)}
            </TableCell>
            <TableCell className="text-right text-muted-foreground text-sm">
              {item.lastAnalysis 
                ? formatDistanceToNow(new Date(item.lastAnalysis), { addSuffix: true, locale: ko })
                : '-'
              }
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

#### 체크리스트
- [ ] QueryPerformanceTable.tsx 생성 완료

---

### Task 2.2.8: 네비게이션 업데이트

#### 작업 내용

**components/layout/Header.tsx** 수정:

```typescript
const navItems = [
  { href: '/', label: '분석하기' },
  { href: '/analysis', label: '분석 기록' },
  { href: '/projects', label: '프로젝트' },
  { href: '/dashboard', label: '대시보드' },  // 추가
]
```

#### 체크리스트
- [ ] Header.tsx 수정 완료
- [ ] 대시보드 네비게이션 동작

---

## 4. 검증 체크리스트

### 최종 확인 사항

| 항목 | 확인 |
|------|------|
| 대시보드 페이지 로딩 | [ ] |
| 프로젝트 선택 동작 | [ ] |
| 지표 카드 데이터 표시 | [ ] |
| 인용률 추이 차트 | [ ] |
| LLM 비교 차트 | [ ] |
| 경쟁사 비교 차트 | [ ] |
| 쿼리 성과 테이블 | [ ] |
| 반응형 레이아웃 | [ ] |

---

## 5. 다음 단계

이 문서 완료 후:
- **Phase2_03_Integration.md**: 분석과 프로젝트 연동, 배치 분석

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
| 2.0 | 2025-12-01 | 4개 LLM 지원 (Claude 추가), 크로스 검증 통계, Gemini 신뢰도 평균 |
