'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus, Quote, Eye, Trophy, BarChart3 } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { memo } from 'react'
import { useKPIData } from '@/hooks/useKPIData'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  trendLabel?: string
  icon: React.ReactNode
  sparklineData?: { value: number }[]
  sparklineColor?: string
  loading?: boolean
  invertTrend?: boolean
}

const KPICard = memo(function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  sparklineData,
  sparklineColor = '#3b82f6',
  loading,
  invertTrend,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) {
      return <Minus className="h-3 w-3 text-muted-foreground" />
    }
    const isPositive = invertTrend ? trend < 0 : trend > 0
    if (isPositive) {
      return <TrendingUp className="h-3 w-3 text-green-500" />
    }
    return <TrendingDown className="h-3 w-3 text-red-500" />
  }

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return 'text-muted-foreground'
    const isPositive = invertTrend ? trend < 0 : trend > 0
    return isPositive ? 'text-green-500' : 'text-red-500'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-20" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {(subtitle || trend !== undefined) && (
              <div className="flex items-center gap-1 text-xs">
                {trend !== undefined && (
                  <>
                    {getTrendIcon()}
                    <span className={cn(getTrendColor())}>
                      {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                    </span>
                  </>
                )}
                {trendLabel && (
                  <span className="text-muted-foreground ml-1">{trendLabel}</span>
                )}
                {subtitle && !trend && (
                  <span className="text-muted-foreground">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          {sparklineData && sparklineData.length > 1 && (
            <div className="h-10 w-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={sparklineColor}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Return true if props are equal (skip re-render), false if different (re-render)

  // Compare primitive props
  if (
    prevProps.title !== nextProps.title ||
    prevProps.value !== nextProps.value ||
    prevProps.subtitle !== nextProps.subtitle ||
    prevProps.trend !== nextProps.trend ||
    prevProps.trendLabel !== nextProps.trendLabel ||
    prevProps.sparklineColor !== nextProps.sparklineColor ||
    prevProps.loading !== nextProps.loading ||
    prevProps.invertTrend !== nextProps.invertTrend
  ) {
    return false
  }

  // Compare sparklineData array by length and values
  if (prevProps.sparklineData?.length !== nextProps.sparklineData?.length) {
    return false
  }

  if (prevProps.sparklineData && nextProps.sparklineData) {
    for (let i = 0; i < prevProps.sparklineData.length; i++) {
      if (prevProps.sparklineData[i].value !== nextProps.sparklineData[i].value) {
        return false
      }
    }
  }

  // Icon comparison (React elements are always different references, so we skip this)
  // Icons are typically stable for each card type

  return true
})

export function KPICards() {
  const { data: kpiData, loading } = useKPIData()

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="인용율"
        value={loading ? '-' : `${kpiData?.citationRate.toFixed(1)}%`}
        trend={kpiData?.citationTrend}
        trendLabel="vs 이전 7건"
        icon={<Quote className="h-4 w-4" />}
        sparklineData={kpiData?.sparklineData.citation}
        sparklineColor="#22c55e"
        loading={loading}
      />
      <KPICard
        title="브랜드 노출률"
        value={loading ? '-' : `${kpiData?.brandExposure.toFixed(1)}%`}
        trend={kpiData?.brandTrend}
        trendLabel="LLM 커버리지"
        icon={<Eye className="h-4 w-4" />}
        sparklineData={kpiData?.sparklineData.brand}
        sparklineColor="#3b82f6"
        loading={loading}
      />
      <KPICard
        title="경쟁사 순위"
        value={loading ? '-' : (kpiData?.competitorRank || '-')}
        subtitle={kpiData?.competitorRank ? '위' : '데이터 없음'}
        icon={<Trophy className="h-4 w-4" />}
        sparklineData={kpiData?.sparklineData.rank}
        sparklineColor="#f59e0b"
        loading={loading}
        invertTrend
      />
      <KPICard
        title="총 분석"
        value={loading ? '-' : kpiData?.totalAnalyses || 0}
        subtitle={`성공률 ${kpiData?.successRate.toFixed(0)}%`}
        icon={<BarChart3 className="h-4 w-4" />}
        sparklineData={kpiData?.sparklineData.analyses}
        sparklineColor="#8b5cf6"
        loading={loading}
      />
    </div>
  )
}
