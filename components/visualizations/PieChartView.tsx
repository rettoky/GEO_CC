/**
 * Pie Chart View
 * 전체 인용 비율 원형 차트
 */

'use client'

import { Card } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { generatePieChartData } from '@/lib/visualizations/data-processor'
import type { AnalysisResults } from '@/types'
import type { Competitor } from '@/types/competitors'

interface PieChartViewProps {
  results: AnalysisResults
  myDomain?: string
  competitors: Competitor[]
}

export function PieChartView({
  results,
  myDomain,
  competitors,
}: PieChartViewProps) {
  const chartData = generatePieChartData(results, myDomain, competitors)

  // Recharts용 데이터 변환
  const rechartsData = chartData.segments.map((segment) => ({
    name: segment.name,
    value: segment.value,
    percentage: segment.percentage,
    color: segment.color,
  }))

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percentage,
  }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percentage < 5) return null // 5% 미만은 레이블 숨김

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${percentage.toFixed(1)}%`}
      </text>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">전체 인용 비율</h3>
          <p className="text-sm text-gray-600">
            모든 LLM에서 각 도메인이 차지하는 인용 비율을 보여줍니다
          </p>
        </div>

        {chartData.segments.length > 0 ? (
          <>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rechartsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={120}
                    dataKey="value"
                  >
                    {rechartsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}회`, '인용 횟수']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 상위 5개 도메인 통계 */}
            <div className="pt-4 border-t">
              <h4 className="font-medium text-sm mb-3">상위 5개 도메인</h4>
              <div className="space-y-2">
                {chartData.segments.slice(0, 5).map((segment, index) => (
                  <div key={segment.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-sm font-medium truncate">
                        {index + 1}. {segment.name}
                      </span>
                      {segment.isMyDomain && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          내 도메인
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {segment.value}회 ({segment.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            인용 데이터가 없습니다
          </div>
        )}
      </div>
    </Card>
  )
}
