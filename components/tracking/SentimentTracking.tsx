'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { ThumbsUp, ThumbsDown, Minus, TrendingUp, TrendingDown } from 'lucide-react'
import type { SentimentData } from '@/hooks/useTrackingAnalyses'

interface TrackingDataWithSentiment {
  date: string
  sentiment: SentimentData
}

interface SentimentTrackingProps {
  data: TrackingDataWithSentiment[]
}

const SENTIMENT_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#94a3b8',
}

/**
 * 감성 점수 추세 차트
 */
export function SentimentScoreChart({ data }: SentimentTrackingProps) {
  const chartData = data.map(d => ({
    date: d.date,
    score: d.sentiment.score,
    total: d.sentiment.total,
  }))

  // 평균 점수 계산
  const avgScore = useMemo(() => {
    const scores = chartData.filter(d => d.total > 0).map(d => d.score)
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  }, [chartData])

  // Y축 동적 범위 계산 (감성 점수 기준)
  const yAxisDomain = useMemo(() => {
    const scores = chartData.map(d => d.score).filter(s => s !== 0)
    if (scores.length === 0) return [-50, 50]

    const minScore = Math.min(...scores)
    const maxScore = Math.max(...scores)
    const padding = Math.max(20, Math.abs(maxScore - minScore) * 0.2)

    return [
      Math.floor((minScore - padding) / 10) * 10,
      Math.ceil((maxScore + padding) / 10) * 10
    ]
  }, [chartData])

  const latestScore = chartData[chartData.length - 1]?.score || 0
  const isPositiveTrend = latestScore >= avgScore

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              감성 점수 추세
              {isPositiveTrend ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>
              브랜드 언급의 긍정/부정 감성 변화 ({chartData.length}개 데이터)
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${latestScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {latestScore >= 0 ? '+' : ''}{latestScore}
            </div>
            <div className="text-xs text-muted-foreground">현재 점수</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                interval={chartData.length > 15 ? Math.floor(chartData.length / 10) : 0}
              />
              <YAxis
                domain={yAxisDomain}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [
                  <span key="value" className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {value >= 0 ? '+' : ''}{value}
                  </span>,
                  '감성 점수'
                ]}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <ReferenceLine y={avgScore} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `평균: ${avgScore}`, fill: '#3b82f6', fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="score"
                name="감성 점수"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={chartData.length <= 30}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 감성 분포 스택 바 차트 (데이터 많을 때 영역 차트로)
 */
export function SentimentDistributionChart({ data }: SentimentTrackingProps) {
  const chartData = data.map(d => ({
    date: d.date,
    긍정: d.sentiment.positive,
    부정: d.sentiment.negative,
    중립: d.sentiment.neutral,
    total: d.sentiment.total,
  }))

  // Y축 동적 범위 계산
  const yAxisMax = useMemo(() => {
    const totals = chartData.map(d => d.total)
    const maxTotal = Math.max(...totals, 1)
    return Math.ceil(maxTotal * 1.2 / 5) * 5 // 5 단위로 올림
  }, [chartData])

  // 데이터가 많으면 영역 차트로 표시
  const useAreaChart = chartData.length > 20

  return (
    <Card>
      <CardHeader>
        <CardTitle>감성 분포 추세</CardTitle>
        <CardDescription>날짜별 긍정/부정/중립 언급 분포 ({chartData.length}개 데이터)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            {useAreaChart ? (
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
                  domain={[0, yAxisMax]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}건`, '']}
                />
                <Legend />
                <Line type="monotone" dataKey="긍정" stroke={SENTIMENT_COLORS.positive} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="중립" stroke={SENTIMENT_COLORS.neutral} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="부정" stroke={SENTIMENT_COLORS.negative} strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
                  domain={[0, yAxisMax]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}건`, '']}
                />
                <Legend />
                <Bar dataKey="긍정" stackId="a" fill={SENTIMENT_COLORS.positive} />
                <Bar dataKey="중립" stackId="a" fill={SENTIMENT_COLORS.neutral} />
                <Bar dataKey="부정" stackId="a" fill={SENTIMENT_COLORS.negative} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 전체 감성 요약 도넛 차트
 */
export function SentimentSummaryChart({ data }: SentimentTrackingProps) {
  // 전체 기간 감성 합계
  const totals = useMemo(() => {
    return data.reduce(
      (acc, d) => ({
        positive: acc.positive + d.sentiment.positive,
        negative: acc.negative + d.sentiment.negative,
        neutral: acc.neutral + d.sentiment.neutral,
        total: acc.total + d.sentiment.total,
      }),
      { positive: 0, negative: 0, neutral: 0, total: 0 }
    )
  }, [data])

  const pieData = [
    { name: '긍정', value: totals.positive, color: SENTIMENT_COLORS.positive, icon: ThumbsUp },
    { name: '부정', value: totals.negative, color: SENTIMENT_COLORS.negative, icon: ThumbsDown },
    { name: '중립', value: totals.neutral, color: SENTIMENT_COLORS.neutral, icon: Minus },
  ].filter(d => d.value > 0)

  const overallScore = totals.total > 0
    ? Math.round(((totals.positive - totals.negative) / totals.total) * 100)
    : 0

  if (totals.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>감성 분석 요약</CardTitle>
          <CardDescription>전체 기간 브랜드 감성 분포</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <p className="text-muted-foreground">감성 분석 데이터가 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>감성 분석 요약</CardTitle>
        <CardDescription>전체 기간 브랜드 감성 분포 (총 {totals.total}건)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* 도넛 차트 */}
          <div className="h-[200px] w-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}건`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* 중앙 점수 표시 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-2xl font-bold ${overallScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {overallScore >= 0 ? '+' : ''}{overallScore}
                </div>
                <div className="text-xs text-muted-foreground">종합 점수</div>
              </div>
            </div>
          </div>

          {/* 상세 수치 */}
          <div className="flex-1 space-y-3">
            {pieData.map((item) => {
              const Icon = item.icon
              const percentage = Math.round((item.value / totals.total) * 100)
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-lg font-bold" style={{ color: item.color }}>
                        {item.value}건
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 감성 트래킹 대시보드 (모든 차트 포함)
 */
export function SentimentTrackingDashboard({ data }: SentimentTrackingProps) {
  const hasSentimentData = data.some(d => d.sentiment.total > 0)

  if (!hasSentimentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>감성 분석 트래킹</CardTitle>
          <CardDescription>브랜드 언급의 감성 변화를 추적합니다</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ThumbsUp className="h-5 w-5" />
            <ThumbsDown className="h-5 w-5" />
          </div>
          <p className="text-muted-foreground text-center">
            감성 분석 데이터가 없습니다.
            <br />
            브랜드명을 입력하고 분석을 실행하면 감성 데이터가 수집됩니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 요약 + 점수 추세 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentSummaryChart data={data} />
        <SentimentScoreChart data={data} />
      </div>
      {/* 분포 추세 */}
      <SentimentDistributionChart data={data} />
    </div>
  )
}
