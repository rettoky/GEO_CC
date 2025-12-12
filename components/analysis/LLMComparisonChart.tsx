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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BarChart3, PieChart as PieChartIcon, Building2 } from 'lucide-react'
import type { AnalysisResults, AnalysisSummary, BrandMentionAnalysis, LLMType } from '@/types'

interface BrandComparisonChartProps {
  results: AnalysisResults
  summary: AnalysisSummary
  myDomain?: string
  myBrand?: string
  brandMentionAnalysis?: BrandMentionAnalysis
}

// 색상 팔레트
const BRAND_COLORS = [
  'hsl(210, 80%, 55%)', // 내 브랜드 (파랑)
  'hsl(25, 90%, 55%)',  // 경쟁사 1 (주황)
  'hsl(150, 60%, 45%)', // 경쟁사 2 (녹색)
  'hsl(280, 60%, 55%)', // 경쟁사 3 (보라)
  'hsl(350, 70%, 55%)', // 경쟁사 4 (빨강)
  'hsl(45, 85%, 50%)',  // 경쟁사 5 (노랑)
  'hsl(180, 50%, 45%)', // 경쟁사 6 (청록)
  'hsl(320, 60%, 55%)', // 경쟁사 7 (핑크)
]

const MY_BRAND_COLOR = 'hsl(210, 80%, 55%)'
const COMPETITOR_COLOR = 'hsl(25, 90%, 55%)'

const LLM_NAMES: Record<string, string> = {
  perplexity: 'Perplexity',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}

/**
 * 브랜드 노출 비교 차트 컴포넌트
 * 내 브랜드/도메인과 경쟁사 대비 노출수를 시각화
 */
export function LLMComparisonChart({
  results: _results,
  summary: _summary,
  myDomain: _myDomain,
  myBrand,
  brandMentionAnalysis,
}: BrandComparisonChartProps) {
  // 브랜드 언급 데이터가 있는지 확인
  const hasBrandData = brandMentionAnalysis && brandMentionAnalysis.totalBrandMentions > 0

  // 브랜드 노출 비교 데이터 (수평 막대 차트용)
  const brandComparisonData = useMemo(() => {
    if (!brandMentionAnalysis) return []

    const data: { name: string; count: number; color: string; isMyBrand: boolean }[] = []

    // 내 브랜드
    if (brandMentionAnalysis.myBrand && brandMentionAnalysis.myBrand.mentionCount > 0) {
      data.push({
        name: brandMentionAnalysis.myBrand.brand || myBrand || '내 브랜드',
        count: brandMentionAnalysis.myBrand.mentionCount,
        color: MY_BRAND_COLOR,
        isMyBrand: true,
      })
    }

    // 경쟁사들 (상위 7개)
    brandMentionAnalysis.competitors.slice(0, 7).forEach((competitor, index) => {
      data.push({
        name: competitor.brand,
        count: competitor.mentionCount,
        color: BRAND_COLORS[index + 1] || COMPETITOR_COLOR,
        isMyBrand: false,
      })
    })

    // 노출수 기준 내림차순 정렬
    return data.sort((a, b) => b.count - a.count)
  }, [brandMentionAnalysis, myBrand])

  // 점유율 파이 차트 데이터
  const marketShareData = useMemo(() => {
    if (!brandMentionAnalysis) return []

    const data: { name: string; value: number; color: string }[] = []

    // 내 브랜드
    if (brandMentionAnalysis.myBrand && brandMentionAnalysis.myBrand.mentionCount > 0) {
      data.push({
        name: brandMentionAnalysis.myBrand.brand || myBrand || '내 브랜드',
        value: brandMentionAnalysis.myBrand.mentionCount,
        color: MY_BRAND_COLOR,
      })
    }

    // 경쟁사들 (상위 5개 + 기타)
    const topCompetitors = brandMentionAnalysis.competitors.slice(0, 5)
    const restCompetitors = brandMentionAnalysis.competitors.slice(5)

    topCompetitors.forEach((competitor, index) => {
      data.push({
        name: competitor.brand,
        value: competitor.mentionCount,
        color: BRAND_COLORS[index + 1] || COMPETITOR_COLOR,
      })
    })

    // 기타 경쟁사 합산
    if (restCompetitors.length > 0) {
      const restCount = restCompetitors.reduce((sum, c) => sum + c.mentionCount, 0)
      if (restCount > 0) {
        data.push({
          name: `기타 (${restCompetitors.length}개)`,
          value: restCount,
          color: 'hsl(0, 0%, 70%)',
        })
      }
    }

    return data
  }, [brandMentionAnalysis, myBrand])

  // LLM별 브랜드 노출 데이터
  const llmExposureData = useMemo(() => {
    if (!brandMentionAnalysis) return []

    const llmTypes: LLMType[] = ['perplexity', 'chatgpt', 'gemini', 'claude']

    return llmTypes.map((llm) => {
      // 내 브랜드가 해당 LLM에서 언급되었는지
      const myBrandMentioned = brandMentionAnalysis.myBrand?.mentionedInLLMs.includes(llm)
        ? 1
        : 0

      // 경쟁사 중 해당 LLM에서 언급된 수
      const competitorMentions = brandMentionAnalysis.competitors.filter((c) =>
        c.mentionedInLLMs.includes(llm)
      ).length

      return {
        name: LLM_NAMES[llm],
        내브랜드: myBrandMentioned,
        경쟁사: competitorMentions,
      }
    })
  }, [brandMentionAnalysis])

  // 데이터가 없으면 안내 메시지
  if (!hasBrandData) {
    return (
      <Card className="border-none shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-6 w-6 text-primary" />
            브랜드 노출 비교
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            브랜드 언급 데이터가 없어 차트를 표시할 수 없습니다.
            <br />
            <span className="text-sm">검색 시 브랜드명을 입력하면 경쟁사 대비 노출 현황을 분석합니다.</span>
          </p>
        </CardContent>
      </Card>
    )
  }

  // 커스텀 툴팁
  interface TooltipPayloadEntry {
    color: string
    name: string
    value: number | string
    payload?: { name: string; isMyBrand?: boolean }
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

  // 파이 차트 커스텀 레이블
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx?: number
    cy?: number
    midAngle?: number
    innerRadius?: number
    outerRadius?: number
    percent?: number
  }) => {
    // 필수 값이 없으면 렌더링 안함
    if (cx === undefined || cy === undefined || midAngle === undefined ||
        innerRadius === undefined || outerRadius === undefined || percent === undefined) {
      return null
    }
    if (percent < 0.05) return null // 5% 미만은 레이블 표시 안함
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // 내 브랜드 점유율 계산
  const myBrandShare =
    brandMentionAnalysis.myBrand && brandMentionAnalysis.totalBrandMentions > 0
      ? Math.round(
          (brandMentionAnalysis.myBrand.mentionCount / brandMentionAnalysis.totalBrandMentions) *
            100
        )
      : 0

  return (
    <Card className="border-none shadow-md animate-fade-in-up">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Building2 className="h-6 w-6 text-primary" />
          브랜드 노출 비교
          <Badge variant="secondary" className="ml-2">
            총 {brandMentionAnalysis.totalBrandMentions}회 언급
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          AI 응답에서 내 브랜드와 경쟁사 브랜드의 노출 현황을 비교합니다
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              노출 비교
            </TabsTrigger>
            <TabsTrigger value="share" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              점유율
            </TabsTrigger>
            <TabsTrigger value="llm" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              LLM별 분포
            </TabsTrigger>
          </TabsList>

          {/* 브랜드 노출 비교 (수평 막대 차트) */}
          <TabsContent value="comparison" className="mt-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={brandComparisonData}
                  layout="vertical"
                  barCategoryGap="20%"
                  margin={{ left: 10, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={100}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="언급 횟수" radius={[0, 4, 4, 0]}>
                    {brandComparisonData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        strokeWidth={entry.isMyBrand ? 2 : 0}
                        stroke={entry.isMyBrand ? 'hsl(210, 80%, 35%)' : undefined}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: MY_BRAND_COLOR }}
                />
                <span className="text-muted-foreground">내 브랜드</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COMPETITOR_COLOR }}
                />
                <span className="text-muted-foreground">경쟁사</span>
              </div>
            </div>
          </TabsContent>

          {/* 점유율 파이 차트 */}
          <TabsContent value="share" className="mt-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={marketShareData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={110}
                    innerRadius={50}
                    dataKey="value"
                    nameKey="name"
                  >
                    {marketShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}회`, '언급 횟수']}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value: string) => (
                      <span className="text-sm text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              내 브랜드 점유율:{' '}
              <span className="font-semibold text-primary">{myBrandShare}%</span>
              {myBrandShare === 0 && (
                <span className="text-red-500 ml-2">(AI 응답에서 언급되지 않음)</span>
              )}
            </p>
          </TabsContent>

          {/* LLM별 브랜드 노출 분포 */}
          <TabsContent value="llm" className="mt-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={llmExposureData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="내브랜드"
                    name="내 브랜드"
                    fill={MY_BRAND_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="경쟁사"
                    name="경쟁사 브랜드 수"
                    fill={COMPETITOR_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              각 LLM에서 내 브랜드 노출 여부와 경쟁사 브랜드 수를 비교합니다
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
