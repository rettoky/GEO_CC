'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTrackingSection } from '@/contexts/TrackingSectionContext'
import { useTrackingAnalyses, type TrackingData } from '@/hooks/useTrackingAnalyses'
import { Folder, TrendingUp, BarChart3, Heart } from 'lucide-react'
import { BubbleFlowChart, CalendarHeatmap, DrilldownModal, SentimentTrackingDashboard } from '@/components/tracking'
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
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('all')
  const [chartView, setChartView] = useState<'basic' | 'sentiment'>('basic')
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

  // LLM별 Y축 동적 범위 계산 (각 LLM 데이터에 밀착)
  const llmYAxisDomains = useMemo(() => {
    const calculateDomain = (values: number[]): [number, number] => {
      const filtered = values.filter(v => v !== null && v !== undefined && v > 0)
      if (filtered.length === 0) return [0, 50]

      const maxValue = Math.max(...filtered)
      const minValue = Math.min(...filtered)

      // 상한: 최대값 + 15% 여유, 5 단위로 올림
      const upperBound = Math.ceil((maxValue * 1.15) / 5) * 5
      // 하한: 최소값 - 15% 여유, 5 단위로 내림 (0 이상)
      const lowerBound = Math.max(0, Math.floor((minValue * 0.85) / 5) * 5)

      // 최소 간격 보장
      return [lowerBound, Math.max(upperBound, lowerBound + 10)]
    }

    return {
      perplexity: calculateDomain(chartData.map(d => d.perplexity)),
      chatgpt: calculateDomain(chartData.map(d => d.chatgpt)),
      gemini: calculateDomain(chartData.map(d => d.gemini)),
    }
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

  const handleChartViewChange = useCallback((value: string) => {
    setChartView(value as typeof chartView)
  }, [])

  const handleAggregationChange = useCallback((value: string) => {
    setAggregation(value as AggregationType)
  }, [])

  const handleDateRangeChange = useCallback((value: string) => {
    setDateRange(value as typeof dateRange)
  }, [])

  const handleCloseDrilldown = useCallback(() => {
    setDrilldown({ isOpen: false })
  }, [])

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
          <Tabs value={chartView} onValueChange={handleChartViewChange}>
            <TabsList className="grid grid-cols-2 w-auto">
              <TabsTrigger value="basic" className="flex items-center gap-1 px-3">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">기본</span>
              </TabsTrigger>
              <TabsTrigger value="sentiment" className="flex items-center gap-1 px-3">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">감성</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* 집계 단위 */}
          <Select value={aggregation} onValueChange={handleAggregationChange}>
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
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
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
          {/* LLM별 인용율 추세 - 3열 분할 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>LLM별 인용율 추세</CardTitle>
              <CardDescription>
                각 LLM에서의 인용율 변화 추이
                {chartData.length !== trackingData.length && (
                  <span className="ml-2 text-xs">({trackingData.length}개 → {chartData.length}개 집계)</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Perplexity */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
                    <span className="font-medium text-sm">Perplexity</span>
                    <span className="ml-auto text-sm font-semibold text-[#8b5cf6]">
                      {chartData.length > 0 ? chartData[chartData.length - 1].perplexity : 0}%
                    </span>
                  </div>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradPerplexity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="date" tick={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                        <YAxis
                          domain={llmYAxisDomains.perplexity}
                          allowDataOverflow={true}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                          formatter={(value: number) => [`${value}%`, 'Perplexity']}
                        />
                        <Area type="monotone" dataKey="perplexity" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#gradPerplexity)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ChatGPT */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
                    <span className="font-medium text-sm">ChatGPT</span>
                    <span className="ml-auto text-sm font-semibold text-[#22c55e]">
                      {chartData.length > 0 ? chartData[chartData.length - 1].chatgpt : 0}%
                    </span>
                  </div>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradChatGPT" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="date" tick={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                        <YAxis
                          domain={llmYAxisDomains.chatgpt}
                          allowDataOverflow={true}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                          formatter={(value: number) => [`${value}%`, 'ChatGPT']}
                        />
                        <Area type="monotone" dataKey="chatgpt" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#gradChatGPT)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gemini */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                    <span className="font-medium text-sm">Gemini</span>
                    <span className="ml-auto text-sm font-semibold text-[#3b82f6]">
                      {chartData.length > 0 ? chartData[chartData.length - 1].gemini : 0}%
                    </span>
                  </div>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradGemini" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="date" tick={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                        <YAxis
                          domain={llmYAxisDomains.gemini}
                          allowDataOverflow={true}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                          formatter={(value: number) => [`${value}%`, 'Gemini']}
                        />
                        <Area type="monotone" dataKey="gemini" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#gradGemini)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 버블 플로우 + 캘린더 히트맵 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 시간대별 버블 플로우 차트 */}
            <BubbleFlowChart
              analyses={analyses}
              title="시간대별 분석 패턴"
              description="LLM별 시간대에 따른 인용률 분포"
            />

            {/* Calendar Heatmap */}
            <CalendarHeatmap
              data={trackingData}
              title="분석 활동 캘린더"
            />
          </div>
        </>
      )}

      {/* 감성 분석 뷰 */}
      {chartView === 'sentiment' && (
        <SentimentTrackingDashboard data={chartData} />
      )}

      {/* 드릴다운 모달 */}
      <DrilldownModal
        isOpen={drilldown.isOpen}
        onClose={handleCloseDrilldown}
        date={drilldown.date}
        llm={drilldown.llm}
        analyses={drilldownAnalyses}
      />
    </div>
  )
}
