/**
 * Visualization Dashboard
 * 모든 시각화를 통합하는 대시보드
 */

'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChartView } from './BarChartView'
import { PieChartView } from './PieChartView'
import { CompetitorRankingTable } from './CompetitorRankingTable'
import { BarChart3, PieChart, Table } from 'lucide-react'
import type { AnalysisResults } from '@/types'
import type { Competitor } from '@/types/competitors'

interface VisualizationDashboardProps {
  results: AnalysisResults
  myDomain?: string
  competitors: Competitor[]
}

export function VisualizationDashboard({
  results,
  myDomain,
  competitors,
}: VisualizationDashboardProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">종합 시각화</h2>
        <p className="text-gray-600">
          분석 결과를 다양한 차트로 확인하세요
        </p>
      </div>

      <Tabs defaultValue="bar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bar" className="flex items-center gap-2">
            <BarChart3 size={16} />
            막대 그래프
          </TabsTrigger>
          <TabsTrigger value="pie" className="flex items-center gap-2">
            <PieChart size={16} />
            원형 차트
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table size={16} />
            순위 테이블
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bar" className="mt-6">
          <BarChartView
            results={results}
            myDomain={myDomain}
            competitors={competitors}
          />
        </TabsContent>

        <TabsContent value="pie" className="mt-6">
          <PieChartView
            results={results}
            myDomain={myDomain}
            competitors={competitors}
          />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <CompetitorRankingTable
            competitors={competitors}
            myDomain={myDomain}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
