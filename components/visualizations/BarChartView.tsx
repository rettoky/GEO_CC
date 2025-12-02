/**
 * Bar Chart View
 * LLM별 인용 횟수 비교 막대 차트
 */

'use client'

import { Card } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { generateBarChartData } from '@/lib/visualizations/data-processor'
import type { AnalysisResults } from '@/types'
import type { Competitor } from '@/types/competitors'

interface BarChartViewProps {
  results: AnalysisResults
  myDomain?: string
  competitors: Competitor[]
}

export function BarChartView({
  results,
  myDomain,
  competitors,
}: BarChartViewProps) {
  const chartData = generateBarChartData(results, myDomain, competitors)

  // Recharts용 데이터 변환
  const rechartsData = chartData.categories.map((category, index) => {
    const dataPoint: any = { name: category }
    chartData.series.forEach((series) => {
      dataPoint[series.name] = series.data[index]
    })
    return dataPoint
  })

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">LLM별 인용 횟수 비교</h3>
          <p className="text-sm text-gray-600">
            각 LLM에서 도메인이 인용된 횟수를 비교합니다
          </p>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rechartsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartData.series.map((series) => (
                <Bar
                  key={series.name}
                  dataKey={series.name}
                  fill={series.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 요약 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          {chartData.series.map((series) => {
            const total = series.data.reduce((a, b) => a + b, 0)
            return (
              <div key={series.name} className="text-center">
                <div
                  className="text-2xl font-bold"
                  style={{ color: series.color }}
                >
                  {total}
                </div>
                <div className="text-sm text-gray-600">{series.name}</div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
