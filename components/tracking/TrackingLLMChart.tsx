'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TrackingData } from '@/hooks/useTrackingAnalyses'

interface TrackingLLMChartProps {
  data: TrackingData[]
  llmKey: 'perplexity' | 'chatgpt' | 'gemini'
  llmName: string
  color: string
  yAxisDomain: [number, number]
}

/**
 * 개별 LLM 인용율 차트 컴포넌트
 * 각 LLM별 트렌드를 독립적인 차트로 표시
 */
export function TrackingLLMChart({
  data,
  llmKey,
  llmName,
  color,
  yAxisDomain,
}: TrackingLLMChartProps) {
  const latestValue = data.length > 0 ? data[data.length - 1][llmKey] : 0

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-medium text-sm">{llmName}</span>
        <span
          className="ml-auto text-sm font-semibold"
          style={{ color }}
        >
          {latestValue}%
        </span>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`grad${llmKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              domain={yAxisDomain}
              allowDataOverflow={true}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value}%`, llmName]}
            />
            <Area
              type="monotone"
              dataKey={llmKey}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#grad${llmKey})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
