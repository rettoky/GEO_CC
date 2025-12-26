'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import { NewAnalysisTab } from './tabs/NewAnalysisTab'
import { TrackingTab } from './tabs/TrackingTab'
import { DetailTab } from './tabs/DetailTab'

export function DashboardTabs() {
  const { activeTab } = useDashboard()

  return (
    <>
      {activeTab === 'newAnalysis' && <NewAnalysisTab />}
      {activeTab === 'tracking' && <TrackingTab />}
      {activeTab === 'detail' && <DetailTab />}
    </>
  )
}
