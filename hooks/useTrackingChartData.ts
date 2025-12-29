import { useMemo } from 'react'
import type { TrackingData } from './useTrackingAnalyses'

export type AggregationType = 'daily' | 'weekly' | 'monthly'

export interface YAxisDomain {
  perplexity: [number, number]
  chatgpt: [number, number]
  gemini: [number, number]
}

/**
 * 데이터 집계 함수
 * 일별, 주별, 월별 단위로 트래킹 데이터를 집계
 */
function aggregateData(data: TrackingData[], aggregation: AggregationType): TrackingData[] {
  if (aggregation === 'daily' || data.length <= 7) {
    return data
  }

  const groupedData = new Map<string, TrackingData[]>()

  data.forEach(item => {
    // MM/dd 형식에서 그룹 키 생성
    const [month, day] = item.date.split('/')
    let groupKey: string

    if (aggregation === 'weekly') {
      // 주차 계산 (7일 단위)
      const dayNum = parseInt(day)
      const weekNum = Math.ceil(dayNum / 7)
      groupKey = `${month}월 ${weekNum}주`
    } else {
      // 월별 집계
      groupKey = `${month}월`
    }

    if (!groupedData.has(groupKey)) {
      groupedData.set(groupKey, [])
    }
    groupedData.get(groupKey)!.push(item)
  })

  // 그룹별 평균 계산
  return Array.from(groupedData.entries()).map(([key, items]) => {
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

    return {
      date: key,
      citationRate: Math.round(avg(items.map(i => i.citationRate)) * 10) / 10,
      brandExposure: Math.round(avg(items.map(i => i.brandExposure)) * 10) / 10,
      perplexity: Math.round(avg(items.map(i => i.perplexity)) * 10) / 10,
      chatgpt: Math.round(avg(items.map(i => i.chatgpt)) * 10) / 10,
      gemini: Math.round(avg(items.map(i => i.gemini)) * 10) / 10,
      claude: Math.round(avg(items.map(i => i.claude)) * 10) / 10,
      sentiment: {
        positive: sum(items.map(i => i.sentiment.positive)),
        negative: sum(items.map(i => i.sentiment.negative)),
        neutral: sum(items.map(i => i.sentiment.neutral)),
        total: sum(items.map(i => i.sentiment.total)),
        score: Math.round(avg(items.map(i => i.sentiment.score))),
      },
    }
  })
}

/**
 * Y축 동적 범위 계산
 * 데이터에 밀착하여 각 LLM별 최적의 범위를 계산
 */
function calculateYAxisDomain(values: number[]): [number, number] {
  const filtered = values.filter(v => v !== null && v !== undefined && v > 0)
  if (filtered.length === 0) return [0, 50]

  const maxValue = Math.max(...filtered)
  const minValue = Math.min(...filtered)

  // 상한: 최대값 + 15% 여유, 5 단위로 올림
  const upperBound = Math.ceil((maxValue * 1.15) / 5) * 5
  // 하한: 최소값 - 15% 여유, 5 단위로 내림 (0 이상)
  const lowerBound = Math.max(0, Math.floor((minValue * 0.85) / 5) * 5)

  // 최소 간격 보장
  return [lowerBound, Math.max(upperBound, lowerBound + 10)]
}

/**
 * 트래킹 차트 데이터 가공 훅
 * 집계된 차트 데이터와 LLM별 Y축 범위를 계산
 */
export function useTrackingChartData(
  trackingData: TrackingData[],
  aggregation: AggregationType
) {
  // 집계된 차트 데이터
  const chartData = useMemo(() => {
    return aggregateData(trackingData, aggregation)
  }, [trackingData, aggregation])

  // LLM별 Y축 동적 범위 계산 (각 LLM 데이터에 밀착)
  const yAxisDomains = useMemo((): YAxisDomain => {
    return {
      perplexity: calculateYAxisDomain(chartData.map(d => d.perplexity)),
      chatgpt: calculateYAxisDomain(chartData.map(d => d.chatgpt)),
      gemini: calculateYAxisDomain(chartData.map(d => d.gemini)),
    }
  }, [chartData])

  return {
    chartData,
    yAxisDomains,
    originalDataCount: trackingData.length,
    aggregatedDataCount: chartData.length,
  }
}
