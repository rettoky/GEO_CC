'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Target, Clock } from 'lucide-react'
import type { AnalysisResults, AnalysisSummary, UnifiedCitation } from '@/types'

interface LLMComparisonChartProps {
  results: AnalysisResults
  summary: AnalysisSummary
  myDomain?: string
}

const LLM_COLORS = {
  perplexity: 'hsl(35, 90%, 50%)',
  chatgpt: 'hsl(150, 60%, 40%)',
  gemini: 'hsl(230, 70%, 60%)',
  claude: 'hsl(12, 80%, 60%)',
}

const LLM_NAMES = {
  perplexity: 'Perplexity',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}

/**
 * LLM 비교 차트 컴포넌트
 */
export function LLMComparisonChart({ results, summary, myDomain }: LLMComparisonChartProps) {
  // 인용 수 비교 데이터
  const citationData = useMemo(() => {
    return Object.entries(results).map(([key, result]) => ({
      name: LLM_NAMES[key as keyof typeof LLM_NAMES],
      key,
      citations: result?.citations.length ?? 0,
      myDomainCitations: myDomain
        ? result?.citations.filter(
            (c: UnifiedCitation) => c.domain === myDomain.toLowerCase().replace(/^www\./, '')
          ).length ?? 0
        : 0,
      success: result?.success ?? false,
    }))
  }, [results, myDomain])

  // 응답 시간 비교 데이터
  const responseTimeData = useMemo(() => {
    return Object.entries(results)
      .filter(([, result]) => result?.success)
      .map(([key, result]) => ({
        name: LLM_NAMES[key as keyof typeof LLM_NAMES],
        key,
        time: result ? (result.responseTime / 1000) : 0,
      }))
  }, [results])

  // 레이더 차트 데이터 (종합 성능)
  const radarData = useMemo(() => {
    return Object.entries(results)
      .filter(([, result]) => result?.success)
      .map(([key, result]) => {
        const citations = result?.citations.length ?? 0
        const responseTime = result?.responseTime ?? 10000
        const myDomainCited = myDomain
          ? result?.citations.some(
              (c: UnifiedCitation) => c.domain === myDomain.toLowerCase().replace(/^www\./, '')
            )
          : false

        return {
          name: LLM_NAMES[key as keyof typeof LLM_NAMES],
          인용수: Math.min(citations * 10, 100),
          속도: Math.max(100 - (responseTime / 100), 0),
          내도메인: myDomainCited ? 100 : 0,
          고유도메인: result?.citations
            ? new Set(result.citations.map((c: UnifiedCitation) => c.domain)).size * 15
            : 0,
        }
      })
  }, [results, myDomain])

  // 커스텀 툴팁
  interface TooltipPayloadEntry {
    color: string
    name: string
    value: number | string
  }

  interface TooltipProps {
    active?: boolean
    payload?: TooltipPayloadEntry[]
    label?: string
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload?.length) return null

    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p key={index} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <Card className="border-none shadow-md animate-fade-in-up">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <BarChart3 className="h-6 w-6 text-primary" />
          LLM 성능 비교
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="citations" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="citations" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              인용 수
            </TabsTrigger>
            <TabsTrigger value="response" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              응답 시간
            </TabsTrigger>
            <TabsTrigger value="radar" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              종합 비교
            </TabsTrigger>
          </TabsList>

          {/* 인용 수 비교 */}
          <TabsContent value="citations" className="mt-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={citationData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="citations"
                    name="전체 인용"
                    radius={[4, 4, 0, 0]}
                  >
                    {citationData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={LLM_COLORS[entry.key as keyof typeof LLM_COLORS]}
                        opacity={entry.success ? 1 : 0.3}
                      />
                    ))}
                  </Bar>
                  {myDomain && (
                    <Bar
                      dataKey="myDomainCitations"
                      name="내 도메인"
                      radius={[4, 4, 0, 0]}
                      fill="hsl(var(--primary))"
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              각 LLM이 제공한 인용 수를 비교합니다
              {myDomain && ` (파란색: ${myDomain} 인용)`}
            </p>
          </TabsContent>

          {/* 응답 시간 비교 */}
          <TabsContent value="response" className="mt-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={responseTimeData} layout="vertical" barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    unit="s"
                    className="text-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={80}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="time" name="응답 시간 (초)" radius={[0, 4, 4, 0]}>
                    {responseTimeData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={LLM_COLORS[entry.key as keyof typeof LLM_COLORS]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              평균 응답 시간: {(summary.avgResponseTime / 1000).toFixed(2)}초
            </p>
          </TabsContent>

          {/* 레이더 차트 - 종합 비교 */}
          <TabsContent value="radar" className="mt-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={[
                  { metric: '인용 수', ...Object.fromEntries(radarData.map(d => [d.name, d.인용수])) },
                  { metric: '응답 속도', ...Object.fromEntries(radarData.map(d => [d.name, d.속도])) },
                  { metric: '내 도메인', ...Object.fromEntries(radarData.map(d => [d.name, d.내도메인])) },
                  { metric: '도메인 다양성', ...Object.fromEntries(radarData.map(d => [d.name, d.고유도메인])) },
                ]}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {radarData.map((entry) => (
                    <Radar
                      key={entry.name}
                      name={entry.name}
                      dataKey={entry.name}
                      stroke={LLM_COLORS[Object.entries(LLM_NAMES).find(([, v]) => v === entry.name)?.[0] as keyof typeof LLM_COLORS]}
                      fill={LLM_COLORS[Object.entries(LLM_NAMES).find(([, v]) => v === entry.name)?.[0] as keyof typeof LLM_COLORS]}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              각 LLM의 종합 성능을 비교합니다 (정규화된 점수)
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
