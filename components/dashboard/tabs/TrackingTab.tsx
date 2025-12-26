'use client'

import { useState } from 'react'
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
import { useTrackingSection } from '@/contexts/TrackingSectionContext'
import { useTrackingAnalyses } from '@/hooks/useTrackingAnalyses'
import { Folder, TrendingUp } from 'lucide-react'

export function TrackingTab() {
  const { selectedSectionId, sections } = useTrackingSection()
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('30days')

  const { trackingData, analyses, loading, error } = useTrackingAnalyses({
    sectionId: selectedSectionId,
    dateRange,
  })

  const selectedSection = sections.find(s => s.id === selectedSectionId)

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
      {/* 헤더: 섹션 정보 및 기간 필터 */}
      <div className="flex justify-between items-center">
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
