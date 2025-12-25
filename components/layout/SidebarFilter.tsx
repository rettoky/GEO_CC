'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, Calendar, CheckCircle, XCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCallback, useState, useEffect } from 'react'

export function SidebarFilter() {
  const { searchQuery, setSearchQuery, filters, setFilters, resetFilters } = useDashboard()
  const [localSearch, setLocalSearch] = useState(searchQuery)

  // debounce 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, setSearchQuery])

  const handleClearSearch = useCallback(() => {
    setLocalSearch('')
    setSearchQuery('')
  }, [setSearchQuery])

  const hasActiveFilters =
    filters.dateRange !== 'all' ||
    filters.status !== 'all' ||
    searchQuery !== ''

  return (
    <div className="p-3 space-y-3">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="검색..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-8 pr-8 h-9"
        />
        {localSearch && (
          <button
            onClick={handleClearSearch}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 필터 */}
      <div className="space-y-2">
        {/* 날짜 범위 */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select
            value={filters.dateRange}
            onValueChange={(value) => setFilters({ dateRange: value as typeof filters.dateRange })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="기간" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="7days">7일</SelectItem>
              <SelectItem value="30days">30일</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 상태 */}
        <div className="flex items-center gap-2">
          {filters.status === 'completed' ? (
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          ) : filters.status === 'failed' ? (
            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          ) : (
            <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ status: value as typeof filters.status })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="completed">성공</SelectItem>
              <SelectItem value="failed">실패</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 필터 초기화 */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={resetFilters}
        >
          필터 초기화
        </Button>
      )}
    </div>
  )
}
