'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { LLMType } from '@/types'
import type { Analysis } from '@/lib/supabase/types'

interface TrackingData {
  date: string
  citationRate: number
  brandExposure: number
  perplexity: number
  chatgpt: number
  gemini: number
  claude: number
}

export function TrackingTab() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('30days')
  const [trackingData, setTrackingData] = useState<TrackingData[]>([])

  useEffect(() => {
    async function fetchTrackingData() {
      setLoading(true)
      try {
        const supabase = createClient()

        // 날짜 범위 계산
        let dateFilter = ''
        const now = new Date()
        if (dateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          dateFilter = sevenDaysAgo.toISOString()
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          dateFilter = thirtyDaysAgo.toISOString()
        }

        // 분석 데이터 가져오기
        let query = supabase
          .from('analyses')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: true })

        if (dateFilter) {
          query = query.gte('created_at', dateFilter)
        }

        const { data: analyses, error } = await query.limit(100)

        if (error) throw error

        if (!analyses || analyses.length === 0) {
          setTrackingData([])
          return
        }

        // 날짜별로 그룹화하여 트래킹 데이터 생성
        const dateMap = new Map<string, {
          citationRates: number[]
          brandRates: number[]
          llmRates: Record<LLMType, number[]>
        }>()

        analyses.forEach((analysis: Analysis) => {
          const date = format(new Date(analysis.created_at), 'MM/dd', { locale: ko })

          if (!dateMap.has(date)) {
            dateMap.set(date, {
              citationRates: [],
              brandRates: [],
              llmRates: {
                perplexity: [],
                chatgpt: [],
                gemini: [],
                claude: [],
              },
            })
          }

          const entry = dateMap.get(date)!
          const results = analysis.results as unknown as Record<string, unknown>

          // 인용율 계산
          let totalCitations = 0
          let totalChecked = 0
          const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']

          llmTypes.forEach((llm) => {
            const llmResult = results?.[llm] as { citations?: Array<{ cited: boolean }> } | null
            if (llmResult?.citations) {
              const cited = llmResult.citations.filter((c: { cited: boolean }) => c.cited).length
              const total = llmResult.citations.length
              totalCitations += cited
              totalChecked += total

              // LLM별 인용율
              if (total > 0) {
                entry.llmRates[llm].push((cited / total) * 100)
              }
            }
          })

          if (totalChecked > 0) {
            entry.citationRates.push((totalCitations / totalChecked) * 100)
          }

          // 브랜드 노출률 계산
          let exposedLlms = 0
          llmTypes.forEach((llm) => {
            const llmResult = results?.[llm] as { citations?: Array<{ cited: boolean }> } | null
            if (llmResult?.citations?.some((c: { cited: boolean }) => c.cited)) {
              exposedLlms++
            }
          })
          entry.brandRates.push((exposedLlms / 4) * 100)
        })

        // Map을 배열로 변환
        const chartData: TrackingData[] = Array.from(dateMap.entries()).map(([date, data]) => {
          const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

          return {
            date,
            citationRate: Math.round(avg(data.citationRates) * 10) / 10,
            brandExposure: Math.round(avg(data.brandRates) * 10) / 10,
            perplexity: Math.round(avg(data.llmRates.perplexity) * 10) / 10,
            chatgpt: Math.round(avg(data.llmRates.chatgpt) * 10) / 10,
            gemini: Math.round(avg(data.llmRates.gemini) * 10) / 10,
            claude: Math.round(avg(data.llmRates.claude) * 10) / 10,
          }
        })

        setTrackingData(chartData)
      } catch (error) {
        console.error('트래킹 데이터 로드 오류:', error)
        setTrackingData([])
      } finally {
        setLoading(false)
      }
    }

    fetchTrackingData()
  }, [dateRange])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    )
  }

  if (trackingData.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-center">
            트래킹할 분석 데이터가 없습니다.
            <br />
            새 분석 탭에서 분석을 시작하세요.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 기간 필터 */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={(value) => setDateRange(value as typeof dateRange)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">최근 7일</SelectItem>
            <SelectItem value="30days">최근 30일</SelectItem>
            <SelectItem value="all">전체</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 인용율 추세 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>인용율 추세</CardTitle>
          <CardDescription>시간에 따른 내 도메인/브랜드 인용율 변화</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trackingData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  domain={[0, 100]}
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
                  dot={{ fill: '#22c55e', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="brandExposure"
                  name="브랜드 노출률"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* LLM별 비교 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>LLM별 인용율 비교</CardTitle>
          <CardDescription>각 LLM에서의 인용율 추세</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trackingData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  domain={[0, 100]}
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
                <Bar dataKey="perplexity" name="Perplexity" fill="#8b5cf6" />
                <Bar dataKey="chatgpt" name="ChatGPT" fill="#22c55e" />
                <Bar dataKey="gemini" name="Gemini" fill="#3b82f6" />
                <Bar dataKey="claude" name="Claude" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
