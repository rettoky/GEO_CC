'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTrackingSection } from '@/contexts/TrackingSectionContext'
import { useTrackingAnalyses, type TrackingData } from '@/hooks/useTrackingAnalyses'
import { Folder, TrendingUp, Grid3X3, BarChart3, Heart } from 'lucide-react'
import { HeatmapChart, DrilldownModal, SentimentTrackingDashboard } from '@/components/tracking'
import type { LLMType } from '@/lib/supabase/types'

type AggregationType = 'daily' | 'weekly' | 'monthly'

// 데이터 집계 함수
function aggregateData(data: TrackingData[], aggregation: AggregationType): TrackingData[] {
  if (aggregation === 'daily' || data.length <= 7) {
    return data
  }

  const groupedData = new Map<string, TrackingData[]>()

  data.forEach(item => {
    // MM/dd 형식에서 그룹 키 생성
    const [month, day] = item.date.split('/')
    let groupKey: string

    if (aggregation === 'weekly') {
      // 주차 계산 (7일 단위)
      const dayNum = parseInt(day)
      const weekNum = Math.ceil(dayNum / 7)
      groupKey = `${month}월 ${weekNum}주`
    } else {
      // 월별 집계
      groupKey = `${month}월`
    }

    if (!groupedData.has(groupKey)) {
      groupedData.set(groupKey, [])
    }
    groupedData.get(groupKey)!.push(item)
  })

  // 그룹별 평균 계산
  return Array.from(groupedData.entries()).map(([key, items]) => {
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

    return {
      date: key,
      citationRate: Math.round(avg(items.map(i => i.citationRate)) * 10) / 10,
      brandExposure: Math.round(avg(items.map(i => i.brandExposure)) * 10) / 10,
      perplexity: Math.round(avg(items.map(i => i.perplexity)) * 10) / 10,
      chatgpt: Math.round(avg(items.map(i => i.chatgpt)) * 10) / 10,
      gemini: Math.round(avg(items.map(i => i.gemini)) * 10) / 10,
      claude: Math.round(avg(items.map(i => i.claude)) * 10) / 10,
      sentiment: {
        positive: sum(items.map(i => i.sentiment.positive)),
        negative: sum(items.map(i => i.sentiment.negative)),
        neutral: sum(items.map(i => i.sentiment.neutral)),
        total: sum(items.map(i => i.sentiment.total)),
        score: Math.round(avg(items.map(i => i.sentiment.score))),
      },
    }
  })
}

export function TrackingTab() {
  const { selectedSectionId, sections } = useTrackingSection()
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('30days')
  const [chartView, setChartView] = useState<'basic' | 'heatmap' | 'sentiment'>('basic')
  const [aggregation, setAggregation] = useState<AggregationType>('daily')
  const [drilldown, setDrilldown] = useState<{
    isOpen: boolean
    date?: string
    llm?: LLMType
  }>({ isOpen: false })

  const { trackingData, analyses, loading, error } = useTrackingAnalyses({
    sectionId: selectedSectionId,
    dateRange,
  })

  const selectedSection = sections.find(s => s.id === selectedSectionId)

  // 집계된 차트 데이터
  const chartData = useMemo(() => {
    return aggregateData(trackingData, aggregation)
  }, [trackingData, aggregation])

  // Y축 동적 범위 계산 (데이터에 밀착 + 약간의 여유)
  const yAxisDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) return [0, 50]

    const allValues = chartData.flatMap(d => [
      d.citationRate,
      d.brandExposure,
      d.perplexity,
      d.chatgpt,
      d.gemini,
    ]).filter(v => v !== null && v !== undefined)

    if (allValues.length === 0) return [0, 50]

    const maxValue = Math.max(...allValues)
    const minValue = Math.min(...allValues)

    // 상한: 최대값 + 10% 여유, 5 단위로 올림
    const upperBound = Math.ceil((maxValue * 1.1) / 5) * 5
    // 하한: 최소값이 10% 이상이면 약간 내려서 시작
    const lowerBound = minValue > 10 ? Math.floor((minValue * 0.8) / 5) * 5 : 0

    return [lowerBound, Math.max(upperBound, lowerBound + 20)]
  }, [chartData])

  // 드릴다운용 분석 데이터 필터링
  const drilldownAnalyses = useMemo(() => {
    if (!drilldown.date) return []

    return analyses
      .filter(a => {
        const analysisDate = new Date(a.created_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\. /g, '-').replace('.', '')
        const targetDate = new Date(drilldown.date!).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\. /g, '-').replace('.', '')
        return analysisDate === targetDate
      })
      .filter(a => a.summary !== null)
      .map(a => ({
        id: a.id,
        query: a.query_text,
        results: a.results,
        summary: a.summary!,
        createdAt: a.created_at,
      }))
  }, [analyses, drilldown.date])

  // 히트맵 셀 클릭 핸들러
  const handleHeatmapCellClick = (point: { date: string; llm: LLMType; value: number | null }) => {
    if (point.value === null) return
    setDrilldown({
      isOpen: true,
      date: point.date,
      llm: point.llm,
    })
  }

  // 섹션이 선택되지 않은 경우
  if (!selectedSectionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Folder className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">트래킹 섹션을 선택하세요</h3>
          <p className="text-muted-foreground text-center max-w-md">
            좌측 사이드바에서 트래킹할 섹션을 선택하세요.
            <br />
            섹션이 없다면 새 분석 탭에서 섹션을 먼저 생성하세요.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive text-center">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (trackingData.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {selectedSection ? `"${selectedSection.name}" 섹션` : '선택한 섹션'}에 분석 데이터가 없습니다
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            새 분석 탭에서 이 섹션을 선택하고 분석을 실행하세요.
            <br />
            분석 결과가 여기에 추적됩니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더: 섹션 정보 및 필터 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          {selectedSection && (
            <>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedSection.color }}
              />
              <h2 className="text-xl font-semibold">{selectedSection.name}</h2>
              <span className="text-sm text-muted-foreground">
                ({analyses.length}개 분석)
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 차트 뷰 선택 */}
          <Tabs value={chartView} onValueChange={(v) => setChartView(v as typeof chartView)}>
            <TabsList className="grid grid-cols-3 w-auto">
              <TabsTrigger value="basic" className="flex items-center gap-1 px-3">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">기본</span>
              </TabsTrigger>
              <TabsTrigger value="sentiment" className="flex items-center gap-1 px-3">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">감성</span>
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="flex items-center gap-1 px-3">
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline">히트맵</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* 집계 단위 */}
          <Select value={aggregation} onValueChange={(value) => setAggregation(value as AggregationType)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">일별</SelectItem>
              <SelectItem value="weekly">주별</SelectItem>
              <SelectItem value="monthly">월별</SelectItem>
            </SelectContent>
          </Select>
          {/* 기간 필터 */}
          <Select value={dateRange} onValueChange={(value) => setDateRange(value as typeof dateRange)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">최근 7일</SelectItem>
              <SelectItem value="30days">최근 30일</SelectItem>
              <SelectItem value="all">전체</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 기본 차트 뷰 */}
      {chartView === 'basic' && (
        <>
          {/* 인용율 추세 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>인용율 추세</CardTitle>
              <CardDescription>
                시간에 따른 내 도메인/브랜드 인용율 변화
                {chartData.length !== trackingData.length && (
                  <span className="ml-2 text-xs">({trackingData.length}개 → {chartData.length}개 집계)</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                      interval={chartData.length > 15 ? Math.floor(chartData.length / 10) : 0}
                    />
                    <YAxis
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                      domain={yAxisDomain}
                      allowDataOverflow={true}
                      tickCount={6}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value}%`, '']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="citationRate"
                      name="인용율"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={chartData.length <= 30}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="brandExposure"
                      name="브랜드 노출률"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={chartData.length <= 30}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* LLM별 비교 차트 - Area Chart로 변경 */}
          <Card>
            <CardHeader>
              <CardTitle>LLM별 인용율 추세</CardTitle>
              <CardDescription>각 LLM에서의 인용율 변화 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPerplexity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorChatGPT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorGemini" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                      interval={chartData.length > 15 ? Math.floor(chartData.length / 10) : 0}
                    />
                    <YAxis
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                      domain={yAxisDomain}
                      allowDataOverflow={true}
                      tickCount={6}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value}%`, '']}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="perplexity"
                      name="Perplexity"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPerplexity)"
                    />
                    <Area
                      type="monotone"
                      dataKey="chatgpt"
                      name="ChatGPT"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorChatGPT)"
                    />
                    <Area
                      type="monotone"
                      dataKey="gemini"
                      name="Gemini"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorGemini)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 감성 분석 뷰 */}
      {chartView === 'sentiment' && (
        <SentimentTrackingDashboard data={chartData} />
      )}

      {/* 히트맵 뷰 */}
      {chartView === 'heatmap' && (
        <HeatmapChart
          data={trackingData}
          title="LLM별 인용율 히트맵"
          description="날짜와 LLM에 따른 인용율을 색상으로 표시합니다. 셀을 클릭하면 상세 분석을 볼 수 있습니다."
          onCellClick={handleHeatmapCellClick}
        />
      )}

      {/* 드릴다운 모달 */}
      <DrilldownModal
        isOpen={drilldown.isOpen}
        onClose={() => setDrilldown({ isOpen: false })}
        date={drilldown.date}
        llm={drilldown.llm}
        analyses={drilldownAnalyses}
      />
    </div>
  )
}
