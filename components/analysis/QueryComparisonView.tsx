'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  XCircle,
  BarChart3,
  Table as TableIcon,
} from 'lucide-react'
import type { AnalysisResults, AnalysisSummary } from '@/types'

interface QueryResult {
  id: string
  query: string
  domain?: string
  brand?: string
  results: AnalysisResults
  summary: AnalysisSummary
  timestamp: Date
}

interface QueryComparisonViewProps {
  queryResults: QueryResult[]
  onRemoveQuery?: (id: string) => void
}

const LLM_NAMES = ['Perplexity', 'ChatGPT', 'Gemini', 'Claude'] as const
const LLM_KEYS = ['perplexity', 'chatgpt', 'gemini', 'claude'] as const

const LLM_COLORS = {
  perplexity: '#f59e0b',
  chatgpt: '#22c55e',
  gemini: '#3b82f6',
  claude: '#ef4444',
}

/**
 * 여러 쿼리 결과 비교 뷰 컴포넌트
 */
export function QueryComparisonView({
  queryResults,
  onRemoveQuery,
}: QueryComparisonViewProps) {
  const [selectedView, setSelectedView] = useState<'chart' | 'table'>('chart')

  // 비교 차트 데이터 생성
  const comparisonChartData = useMemo(() => {
    return queryResults.map((qr, index) => {
      const data: Record<string, string | number> = {
        name: qr.query.length > 20 ? qr.query.substring(0, 20) + '...' : qr.query,
        fullQuery: qr.query,
        index: index + 1,
      }

      LLM_KEYS.forEach((key) => {
        data[key] = qr.results[key]?.citations.length ?? 0
      })

      data.total = qr.summary.totalCitations
      data.myDomain = qr.summary.myDomainCitationCount
      data.brandMention = qr.summary.brandMentionCount

      return data
    })
  }, [queryResults])

  // 트렌드 분석 (첫 번째 vs 마지막 쿼리)
  const trendAnalysis = useMemo(() => {
    if (queryResults.length < 2) return null

    const first = queryResults[0].summary
    const last = queryResults[queryResults.length - 1].summary

    return {
      citations: {
        diff: last.totalCitations - first.totalCitations,
        percent: first.totalCitations > 0
          ? ((last.totalCitations - first.totalCitations) / first.totalCitations * 100).toFixed(1)
          : 'N/A',
      },
      myDomain: {
        diff: last.myDomainCitationCount - first.myDomainCitationCount,
        percent: first.myDomainCitationCount > 0
          ? ((last.myDomainCitationCount - first.myDomainCitationCount) / first.myDomainCitationCount * 100).toFixed(1)
          : 'N/A',
      },
      brand: {
        diff: last.brandMentionCount - first.brandMentionCount,
        percent: first.brandMentionCount > 0
          ? ((last.brandMentionCount - first.brandMentionCount) / first.brandMentionCount * 100).toFixed(1)
          : 'N/A',
      },
    }
  }, [queryResults])

  // 커스텀 툴팁
  interface TooltipPayloadEntry {
    color: string
    name: string
    value: number | string
    payload?: Record<string, string | number>
  }

  interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayloadEntry[]
    label?: string
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null

    const data = payload[0]?.payload

    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 text-sm max-w-xs">
        <p className="font-semibold mb-2 text-foreground">{data?.fullQuery || label}</p>
        <div className="space-y-1">
          {payload.map((entry: TooltipPayloadEntry, index: number) => (
            <p key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </span>
              <span className="font-medium">{entry.value}</span>
            </p>
          ))}
        </div>
      </div>
    )
  }

  if (queryResults.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <GitCompare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">비교할 쿼리가 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            여러 쿼리를 분석한 후 결과를 비교할 수 있습니다
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-none shadow-md animate-fade-in-up">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <GitCompare className="h-6 w-6 text-primary" />
            쿼리 결과 비교
            <Badge variant="secondary" className="ml-2">
              {queryResults.length}개 쿼리
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={selectedView === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('chart')}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              차트
            </Button>
            <Button
              variant={selectedView === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('table')}
            >
              <TableIcon className="h-4 w-4 mr-1" />
              표
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* 트렌드 요약 (2개 이상 쿼리 시) */}
        {trendAnalysis && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-xl bg-muted/30">
            <TrendCard
              label="전체 인용"
              diff={trendAnalysis.citations.diff}
              percent={trendAnalysis.citations.percent}
            />
            <TrendCard
              label="내 도메인"
              diff={trendAnalysis.myDomain.diff}
              percent={trendAnalysis.myDomain.percent}
            />
            <TrendCard
              label="브랜드 언급"
              diff={trendAnalysis.brand.diff}
              percent={trendAnalysis.brand.percent}
            />
          </div>
        )}

        {/* 차트 뷰 */}
        {selectedView === 'chart' && (
          <Tabs defaultValue="llm" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="llm">LLM별 인용</TabsTrigger>
              <TabsTrigger value="metrics">핵심 지표</TabsTrigger>
              <TabsTrigger value="trend">트렌드</TabsTrigger>
            </TabsList>

            <TabsContent value="llm">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {LLM_KEYS.map((key, i) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        name={LLM_NAMES[i]}
                        fill={LLM_COLORS[key]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="metrics">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="total"
                      name="전체 인용"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="myDomain"
                      name="내 도메인"
                      fill="hsl(210, 100%, 50%)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="brandMention"
                      name="브랜드 언급"
                      fill="hsl(280, 70%, 50%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="trend">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="index" tick={{ fontSize: 11 }} label={{ value: '쿼리 순서', position: 'bottom' }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="전체 인용"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="myDomain"
                      name="내 도메인"
                      stroke="hsl(210, 100%, 50%)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* 테이블 뷰 */}
        {selectedView === 'table' && (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">쿼리</TableHead>
                  {LLM_NAMES.map((name) => (
                    <TableHead key={name} className="text-center">{name}</TableHead>
                  ))}
                  <TableHead className="text-center">전체</TableHead>
                  <TableHead className="text-center">내 도메인</TableHead>
                  {onRemoveQuery && <TableHead className="w-[50px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {queryResults.map((qr) => (
                  <TableRow key={qr.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={qr.query}>
                      {qr.query}
                    </TableCell>
                    {LLM_KEYS.map((key) => {
                      const result = qr.results[key]
                      return (
                        <TableCell key={key} className="text-center">
                          {result?.success ? (
                            <span className="font-medium">{result.citations.length}</span>
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center font-bold">
                      {qr.summary.totalCitations}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={qr.summary.myDomainCitationCount > 0 ? 'default' : 'secondary'}>
                        {qr.summary.myDomainCitationCount}
                      </Badge>
                    </TableCell>
                    {onRemoveQuery && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveQuery(qr.id)}
                          className="h-8 w-8 p-0"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 트렌드 카드 컴포넌트
 */
function TrendCard({
  label,
  diff,
  percent,
}: {
  label: string
  diff: number
  percent: string | number
}) {
  const isPositive = diff > 0
  const isNegative = diff < 0
  const isNeutral = diff === 0

  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center justify-center gap-2">
        {isPositive && <TrendingUp className="h-5 w-5 text-green-500" />}
        {isNegative && <TrendingDown className="h-5 w-5 text-red-500" />}
        {isNeutral && <Minus className="h-5 w-5 text-muted-foreground" />}
        <span
          className={`text-lg font-bold ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
          }`}
        >
          {isPositive && '+'}
          {diff}
        </span>
      </div>
      {percent !== 'N/A' && (
        <p className={`text-xs ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
          {isPositive && '+'}
          {percent}%
        </p>
      )}
    </div>
  )
}
