'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import { SidebarNav } from './SidebarNav'
import { SidebarFilter } from './SidebarFilter'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useDashboard()

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen bg-background border-r border-border transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-[60px]' : 'w-[250px]'
      )}
    >
      {/* 로고 영역 */}
      <div className={cn(
        'flex items-center h-14 border-b border-border px-4',
        sidebarCollapsed ? 'justify-center' : 'gap-2'
      )}>
        <Link href="/" className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary shrink-0" />
          {!sidebarCollapsed && (
            <span className="font-bold text-lg whitespace-nowrap">GEO Analyzer</span>
          )}
        </Link>
      </div>

      {/* 네비게이션 */}
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>

      {/* 필터/검색 영역 (펼쳤을 때만) */}
      {!sidebarCollapsed && (
        <div className="border-t border-border">
          <SidebarFilter />
        </div>
      )}

      {/* 접기/펼치기 버튼 */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full',
            sidebarCollapsed ? 'justify-center px-0' : 'justify-start'
          )}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>접기</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
