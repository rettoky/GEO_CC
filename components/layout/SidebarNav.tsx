'use client'

import { useDashboard, ActiveTab } from '@/contexts/DashboardContext'
import { cn } from '@/lib/utils'
import { PlusCircle, TrendingUp, History, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
      </nav>
    </TooltipProvider>
  )
}
