'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import { KPICards } from '@/components/dashboard/KPICards'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { MobileNav } from './MobileNav'

export function MainPanel() {
  const { sidebarCollapsed } = useDashboard()

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* 모바일 헤더 */}
      <MobileNav />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {/* KPI 카드 영역 (상단 고정) */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="p-4 md:p-6">
            <KPICards />
          </div>
        </div>

        {/* 탭 콘텐츠 영역 */}
        <div className="p-4 md:p-6">
          <DashboardTabs />
        </div>
      </div>
    </main>
  )
}
