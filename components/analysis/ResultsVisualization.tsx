'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
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
} from 'recharts'
import type { AnalysisSummary } from '@/types'

interface ResultsVisualizationProps {
  summary: AnalysisSummary
}

const LLM_COLORS = {
  perplexity: '#9333ea',
  chatgpt: '#16a34a',
  gemini: '#2563eb',
  claude: '#ea580c',
}

/**
 * 분석 결과 시각화 컴포넌트
 */
export function ResultsVisualization({ summary }: ResultsVisualizationProps) {
  // 인용 수 데이터
  const citationData = [
    {
      name: 'Perplexity',
      citations: summary.citationRateByLLM.perplexity || 0,
      color: LLM_COLORS.perplexity,
    },
    {
      name: 'ChatGPT',
      citations: summary.citationRateByLLM.chatgpt || 0,
      color: LLM_COLORS.chatgpt,
    },
    {
      name: 'Gemini',
      citations: summary.citationRateByLLM.gemini || 0,
      color: LLM_COLORS.gemini,
    },
    {
      name: 'Claude',
      citations: summary.citationRateByLLM.claude || 0,
      color: LLM_COLORS.claude,
    },
  ].filter((item) => item.citations > 0)

  // 성공/실패 데이터
  const statusData = [
    { name: '성공', value: summary.successfulLLMs.length, color: '#16a34a' },
    { name: '실패', value: summary.failedLLMs.length, color: '#dc2626' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>분석 결과 시각화</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="citations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="citations">LLM별 인용 수</TabsTrigger>
            <TabsTrigger value="status">성공/실패 현황</TabsTrigger>
          </TabsList>

          <TabsContent value="citations" className="mt-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={citationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="citations" name="인용 수">
                    {citationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 통계 요약 */}
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-600">
                  {summary.totalCitations}
                </p>
                <p className="text-sm text-muted-foreground">총 인용 수</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-600">
                  {summary.uniqueDomains}
                </p>
                <p className="text-sm text-muted-foreground">고유 도메인</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-purple-600">
                  {summary.avgResponseTime.toFixed(1)}s
                </p>
                <p className="text-sm text-muted-foreground">평균 응답 시간</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="status" className="mt-6">
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* LLM 상세 정보 */}
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border p-3 bg-green-50">
                <p className="text-sm font-semibold text-green-700">
                  성공한 LLM ({summary.successfulLLMs.length}개)
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {summary.successfulLLMs.join(', ') || '없음'}
                </p>
              </div>
              <div className="rounded-lg border p-3 bg-red-50">
                <p className="text-sm font-semibold text-red-700">
                  실패한 LLM ({summary.failedLLMs.length}개)
                </p>
                <p className="text-sm text-red-600 mt-1">
                  {summary.failedLLMs.join(', ') || '없음'}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
