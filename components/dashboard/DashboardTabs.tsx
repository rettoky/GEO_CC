'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NewAnalysisTab } from './tabs/NewAnalysisTab'
import { TrackingTab } from './tabs/TrackingTab'
import { DetailTab } from './tabs/DetailTab'

export function DashboardTabs() {
  const { activeTab, setActiveTab } = useDashboard()

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="newAnalysis">새 분석</TabsTrigger>
        <TabsTrigger value="tracking">트래킹</TabsTrigger>
        <TabsTrigger value="detail">분석 상세</TabsTrigger>
      </TabsList>

      <TabsContent value="newAnalysis" className="mt-0">
        <NewAnalysisTab />
      </TabsContent>

      <TabsContent value="tracking" className="mt-0">
        <TrackingTab />
      </TabsContent>

      <TabsContent value="detail" className="mt-0">
        <DetailTab />
      </TabsContent>
    </Tabs>
  )
}
