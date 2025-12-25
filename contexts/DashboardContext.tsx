'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import type { Analysis } from '@/lib/supabase/types'

export type ActiveTab = 'newAnalysis' | 'tracking' | 'detail'

export interface AnalysisFilters {
  dateRange: 'today' | '7days' | '30days' | 'all'
  status: 'all' | 'completed' | 'failed'
  domain?: string
  brand?: string
}

interface DashboardState {
  // 사이드바 상태
  sidebarCollapsed: boolean
  sidebarOpen: boolean // 모바일용

  // 탭 상태
  activeTab: ActiveTab

  // 선택된 분석
  selectedAnalysisId: string | null
  selectedAnalysis: Analysis | null

  // 필터/검색
  searchQuery: string
  filters: AnalysisFilters
}

interface DashboardContextValue extends DashboardState {
  // 사이드바 액션
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarOpen: (open: boolean) => void

  // 탭 액션
  setActiveTab: (tab: ActiveTab) => void

  // 분석 선택 액션
  selectAnalysis: (id: string | null, analysis?: Analysis | null) => void

  // 필터/검색 액션
  setSearchQuery: (query: string) => void
  setFilters: (filters: Partial<AnalysisFilters>) => void
  resetFilters: () => void
}

const defaultFilters: AnalysisFilters = {
  dateRange: 'all',
  status: 'all',
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined)

const SIDEBAR_COLLAPSED_KEY = 'geo-sidebar-collapsed'

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTabState] = useState<ActiveTab>('newAnalysis')
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFiltersState] = useState<AnalysisFilters>(defaultFilters)

  // localStorage에서 사이드바 상태 복원
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored !== null) {
      setSidebarCollapsedState(stored === 'true')
    }
  }, [])

  // URL 파라미터에서 탭/분석 ID 복원
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab') as ActiveTab | null
      const id = params.get('id')

      if (tab && ['newAnalysis', 'tracking', 'detail'].includes(tab)) {
        setActiveTabState(tab)
      }
      if (id) {
        setSelectedAnalysisId(id)
        if (tab !== 'detail') {
          setActiveTabState('detail')
        }
      }
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState(prev => {
      const newValue = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue))
      return newValue
    })
  }, [])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  }, [])

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab)

    // URL 업데이트 (히스토리에 추가하지 않음)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      if (tab !== 'detail') {
        url.searchParams.delete('id')
      }
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const selectAnalysis = useCallback((id: string | null, analysis?: Analysis | null) => {
    setSelectedAnalysisId(id)
    setSelectedAnalysis(analysis ?? null)

    if (id) {
      setActiveTabState('detail')

      // URL 업데이트
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('tab', 'detail')
        url.searchParams.set('id', id)
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [])

  const setFilters = useCallback((newFilters: Partial<AnalysisFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters)
    setSearchQuery('')
  }, [])

  const value: DashboardContextValue = {
    sidebarCollapsed,
    sidebarOpen,
    activeTab,
    selectedAnalysisId,
    selectedAnalysis,
    searchQuery,
    filters,
    toggleSidebar,
    setSidebarCollapsed,
    setSidebarOpen,
    setActiveTab,
    selectAnalysis,
    setSearchQuery,
    setFilters,
    resetFilters,
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
