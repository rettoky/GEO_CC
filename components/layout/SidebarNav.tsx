'use client'

import { useDashboard, ActiveTab } from '@/contexts/DashboardContext'
import { useTrackingSection } from '@/contexts/TrackingSectionContext'
import { cn } from '@/lib/utils'
import { PlusCircle, TrendingUp, History, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NavItem {
  id: ActiveTab
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { id: 'newAnalysis', label: '새 분석', icon: PlusCircle },
  { id: 'tracking', label: '트래킹', icon: TrendingUp },
  { id: 'detail', label: '분석 이력', icon: History },
]

export function SidebarNav() {
  const { sidebarCollapsed, activeTab, setActiveTab } = useDashboard()
  const { sections, selectedSectionId, selectSection, loading } = useTrackingSection()

  const selectedSection = sections.find(s => s.id === selectedSectionId)

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          const button = (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full transition-all',
                sidebarCollapsed ? 'justify-center px-0' : 'justify-start',
                isActive && 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon className={cn('h-4 w-4 shrink-0', !sidebarCollapsed && 'mr-3')} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Button>
          )

          if (sidebarCollapsed) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  {button}
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          }

          return button
        })}

        {/* 섹션 셀렉터 - 트래킹 탭에서만 표시 */}
        {activeTab === 'tracking' && !sidebarCollapsed && (
          <div className="pt-4 mt-4 border-t border-border">
            <div className="px-1 mb-2">
              <span className="text-xs font-medium text-muted-foreground">트래킹 섹션</span>
            </div>
            <Select
              value={selectedSectionId || ''}
              onValueChange={(value) => selectSection(value || null)}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="섹션 선택...">
                  {selectedSection ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedSection.color }}
                      />
                      <span className="truncate">{selectedSection.name}</span>
                    </div>
                  ) : (
                    '섹션 선택...'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sections.length === 0 ? (
                  <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                    섹션이 없습니다.<br />
                    새 분석에서 섹션을 생성하세요.
                  </div>
                ) : (
                  sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: section.color }}
                        />
                        <span>{section.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </nav>
    </TooltipProvider>
  )
}
