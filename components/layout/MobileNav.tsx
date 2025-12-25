'use client'

import { useDashboard, ActiveTab } from '@/contexts/DashboardContext'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Menu, BarChart3, PlusCircle, TrendingUp, History, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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

export function MobileNav() {
  const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab } = useDashboard()

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  return (
    <div className="flex md:hidden items-center h-14 px-4 border-b border-border bg-background">
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2">
            <Menu className="h-5 w-5" />
            <span className="sr-only">메뉴 열기</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="px-4 py-4 border-b border-border">
            <SheetTitle asChild>
              <Link href="/" className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">GEO Analyzer</span>
              </Link>
            </SheetTitle>
          </SheetHeader>
          <nav className="px-2 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isActive && 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon className="h-4 w-4 mr-3 shrink-0" />
                  <span>{item.label}</span>
                </Button>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* 모바일 헤더 로고 */}
      <Link href="/" className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <span className="font-semibold">GEO Analyzer</span>
      </Link>
    </div>
  )
}
