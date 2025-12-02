# Phase 5: 종합 시각화 시스템

**기간**: 3주차
**상태**: 📋 계획 완료
**의존성**: Phase 1-4 완료 권장

## 목표

막대 그래프, 원형 차트, 히트맵, 데이터 테이블을 모두 제공하여 분석 결과를 다각도로 시각화합니다.

## 시각화 종류

### 1. 막대 그래프 (Bar Chart)
- **용도**: LLM별, 도메인별 인용 건수 비교
- **라이브러리**: Recharts
- **데이터**: 단순 비교 수치

### 2. 원형 차트 (Pie Chart)
- **용도**: 시장 점유율(인용 비율) 표현
- **라이브러리**: Recharts
- **데이터**: 백분율

### 3. 히트맵 (Heatmap)
- **용도**: LLM × 도메인 교차 분석
- **라이브러리**: Recharts + Custom
- **데이터**: 2차원 매트릭스

### 4. 데이터 테이블 (Data Table)
- **용도**: 상세 데이터 정렬/필터/내보내기
- **라이브러리**: shadcn/ui Table
- **기능**: 정렬, 필터, CSV 내보내기

## 데이터 처리 레이어

### 파일: `lib/visualizations/data-processor.ts`

```typescript
import type { AnalysisResults, Competitor } from '@/types'

export interface BarChartData {
  categories: string[]
  series: {
    name: string
    data: number[]
    color: string
  }[]
}

export interface PieChartData {
  segments: {
    name: string
    value: number
    percentage: number
    color: string
    isMyDomain: boolean
  }[]
}

export interface HeatmapData {
  matrix: number[][] // [llmIndex][domainIndex]
  xLabels: string[] // LLMs
  yLabels: string[] // Domains
  colorScale: {
    min: number
    max: number
  }
}

export interface TableRow {
  llm: string
  domain: string
  citations: number
  position: number
  url: string
}

/**
 * 막대 그래프 데이터 생성
 */
export function generateBarChartData(
  results: AnalysisResults,
  myDomain: string,
  competitors: Competitor[]
): BarChartData {
  const llms = ['Perplexity', 'ChatGPT', 'Gemini', 'Claude']

  // 내 도메인 데이터
  const myData = llms.map(llm => {
    const llmKey = llm.toLowerCase()
    const result = results[llmKey]
    if (!result?.success) return 0

    return result.citations.filter(c => c.domain === myDomain).length
  })

  // 경쟁사 데이터
  const competitorSeries = competitors.slice(0, 3).map((comp, index) => ({
    name: comp.brand_name || comp.domain,
    data: llms.map(llm => {
      const llmKey = llm.toLowerCase()
      const result = results[llmKey]
      if (!result?.success) return 0

      return result.citations.filter(c => c.domain === comp.domain).length
    }),
    color: ['#ef4444', '#f59e0b', '#10b981'][index]
  }))

  return {
    categories: llms,
    series: [
      {
        name: '내 도메인',
        data: myData,
        color: '#3b82f6'
      },
      ...competitorSeries
    ]
  }
}

/**
 * 원형 차트 데이터 생성
 */
export function generatePieChartData(
  results: AnalysisResults,
  myDomain: string,
  competitors: Competitor[]
): PieChartData {
  const domainCounts: Record<string, number> = {}

  // 모든 인용 집계
  for (const result of Object.values(results)) {
    if (!result?.success) continue

    for (const citation of result.citations) {
      domainCounts[citation.domain] = (domainCounts[citation.domain] || 0) + 1
    }
  }

  const total = Object.values(domainCounts).reduce((a, b) => a + b, 0)

  const segments = Object.entries(domainCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([domain, count], index) => ({
      name: domain,
      value: count,
      percentage: (count / total) * 100,
      color: domain === myDomain ? '#3b82f6' : `hsl(${index * 36}, 70%, 50%)`,
      isMyDomain: domain === myDomain
    }))

  return { segments }
}

/**
 * 히트맵 데이터 생성
 */
export function generateHeatmapData(
  results: AnalysisResults,
  topDomains: string[]
): HeatmapData {
  const llms = ['perplexity', 'chatgpt', 'gemini', 'claude']

  const matrix: number[][] = llms.map(llm => {
    const result = results[llm]
    if (!result?.success) return new Array(topDomains.length).fill(0)

    return topDomains.map(domain =>
      result.citations.filter(c => c.domain === domain).length
    )
  })

  const allValues = matrix.flat()

  return {
    matrix,
    xLabels: ['Perplexity', 'ChatGPT', 'Gemini', 'Claude'],
    yLabels: topDomains,
    colorScale: {
      min: Math.min(...allValues),
      max: Math.max(...allValues)
    }
  }
}

/**
 * 테이블 데이터 생성
 */
export function generateTableData(results: AnalysisResults): TableRow[] {
  const rows: TableRow[] = []

  for (const [llm, result] of Object.entries(results)) {
    if (!result?.success) continue

    for (const citation of result.citations) {
      rows.push({
        llm: llm.charAt(0).toUpperCase() + llm.slice(1),
        domain: citation.domain,
        citations: 1,
        position: citation.position,
        url: citation.url
      })
    }
  }

  return rows
}
```

## UI 컴포넌트

### 파일: `components/visualizations/VisualizationWrapper.tsx`

```typescript
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChartView } from './BarChartView'
import { PieChartView } from './PieChartView'
import { HeatmapView } from './HeatmapView'
import { DataTableView } from './DataTableView'
import type { AnalysisResults, Competitor } from '@/types'

interface VisualizationWrapperProps {
  results: AnalysisResults
  myDomain: string
  competitors: Competitor[]
}

export function VisualizationWrapper({
  results,
  myDomain,
  competitors
}: VisualizationWrapperProps) {
  return (
    <Tabs defaultValue="bar" className="w-full">
      <TabsList>
        <TabsTrigger value="bar">막대 그래프</TabsTrigger>
        <TabsTrigger value="pie">원형 그래프</TabsTrigger>
        <TabsTrigger value="heatmap">히트맵</TabsTrigger>
        <TabsTrigger value="table">상세 데이터</TabsTrigger>
      </TabsList>

      <TabsContent value="bar">
        <BarChartView results={results} myDomain={myDomain} competitors={competitors} />
      </TabsContent>

      <TabsContent value="pie">
        <PieChartView results={results} myDomain={myDomain} competitors={competitors} />
      </TabsContent>

      <TabsContent value="heatmap">
        <HeatmapView results={results} myDomain={myDomain} />
      </TabsContent>

      <TabsContent value="table">
        <DataTableView results={results} />
      </TabsContent>
    </Tabs>
  )
}
```

### 파일: `components/visualizations/HeatmapView.tsx`

```typescript
'use client'

import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import { generateHeatmapData } from '@/lib/visualizations/data-processor'
import type { AnalysisResults } from '@/types'

interface HeatmapViewProps {
  results: AnalysisResults
  myDomain: string
}

export function HeatmapView({ results, myDomain }: HeatmapViewProps) {
  const heatmapData = useMemo(() => {
    // 상위 10개 도메인 추출
    const domainCounts: Record<string, number> = {}

    for (const result of Object.values(results)) {
      if (!result?.success) continue
      for (const citation of result.citations) {
        domainCounts[citation.domain] = (domainCounts[citation.domain] || 0) + 1
      }
    }

    const topDomains = Object.entries(domainCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([domain]) => domain)

    return generateHeatmapData(results, topDomains)
  }, [results])

  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([heatmapData.colorScale.min, heatmapData.colorScale.max])
      .range(['#f0f9ff', '#1e40af'])
  }, [heatmapData])

  const cellSize = 80

  return (
    <div className="overflow-x-auto">
      <svg
        width={heatmapData.xLabels.length * cellSize + 150}
        height={heatmapData.yLabels.length * cellSize + 50}
      >
        {/* X축 레이블 (LLMs) */}
        {heatmapData.xLabels.map((label, i) => (
          <text
            key={label}
            x={150 + i * cellSize + cellSize / 2}
            y={30}
            textAnchor="middle"
            className="text-sm font-medium"
          >
            {label}
          </text>
        ))}

        {/* Y축 레이블 (Domains) */}
        {heatmapData.yLabels.map((label, i) => (
          <text
            key={label}
            x={140}
            y={50 + i * cellSize + cellSize / 2}
            textAnchor="end"
            className="text-sm"
          >
            {label.length > 20 ? label.slice(0, 20) + '...' : label}
          </text>
        ))}

        {/* 히트맵 셀 */}
        {heatmapData.matrix.map((row, i) =>
          row.map((value, j) => (
            <g key={`${i}-${j}`}>
              <rect
                x={150 + i * cellSize}
                y={50 + j * cellSize}
                width={cellSize - 2}
                height={cellSize - 2}
                fill={colorScale(value)}
                rx={4}
              />
              <text
                x={150 + i * cellSize + cellSize / 2}
                y={50 + j * cellSize + cellSize / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-semibold"
                fill={value > heatmapData.colorScale.max / 2 ? '#fff' : '#000'}
              >
                {value}
              </text>
            </g>
          ))
        )}
      </svg>
    </div>
  )
}
```

## 패키지 설치

```bash
npm install d3-scale d3-array
npm install @types/d3-scale @types/d3-array --save-dev
```

## 체크리스트

- [ ] `lib/visualizations/data-processor.ts` 생성
- [ ] `VisualizationWrapper.tsx` 생성
- [ ] `BarChartView.tsx` 생성
- [ ] `PieChartView.tsx` 생성
- [ ] `HeatmapView.tsx` 생성
- [ ] `DataTableView.tsx` 생성
- [ ] d3-scale 설치
- [ ] 모든 차트 타입 렌더링 테스트
- [ ] 반응형 디자인 테스트

## 다음 단계

Phase 5 완료 후 → **Phase 6: 보고서 생성**

---

**예상 소요 시간**: 3-4일
**난이도**: ⭐⭐⭐ (높음 - 다양한 차트)
