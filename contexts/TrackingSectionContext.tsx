'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TrackingSection } from '@/lib/supabase/types'

interface TrackingSectionContextValue {
  // 상태
  sections: TrackingSection[]
  selectedSectionId: string | null
  loading: boolean
  error: string | null

  // 액션
  selectSection: (id: string | null) => void
  createSection: (section: Omit<TrackingSection, 'id' | 'created_at' | 'updated_at'>) => Promise<TrackingSection | null>
  updateSection: (id: string, updates: Partial<TrackingSection>) => Promise<boolean>
  deleteSection: (id: string) => Promise<boolean>
  refreshSections: () => Promise<void>
}

const TrackingSectionContext = createContext<TrackingSectionContextValue | undefined>(undefined)

const SELECTED_SECTION_KEY = 'geo-selected-section'

export function TrackingSectionProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<TrackingSection[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 섹션 목록 로드
  const refreshSections = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from('tracking_sections')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setSections(data || [])
    } catch (err) {
      console.error('섹션 로드 오류:', err)
      setError('섹션을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    refreshSections()

    // localStorage에서 선택된 섹션 복원
    const stored = localStorage.getItem(SELECTED_SECTION_KEY)
    if (stored) {
      setSelectedSectionId(stored)
    }
  }, [refreshSections])

  // 섹션 선택
  const selectSection = useCallback((id: string | null) => {
    setSelectedSectionId(id)
    if (id) {
      localStorage.setItem(SELECTED_SECTION_KEY, id)
    } else {
      localStorage.removeItem(SELECTED_SECTION_KEY)
    }
  }, [])

  // 섹션 생성
  const createSection = useCallback(async (
    section: Omit<TrackingSection, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TrackingSection | null> => {
    try {
      const supabase = createClient()

      const insertData = {
        name: section.name,
        description: section.description,
        default_domain: section.default_domain,
        default_brand: section.default_brand,
        default_brand_aliases: section.default_brand_aliases,
        color: section.color,
        is_active: section.is_active,
      }

      const { data, error: insertError } = await supabase
        .from('tracking_sections')
        .insert(insertData as never)
        .select()
        .single()

      if (insertError) throw insertError

      await refreshSections()
      return data as TrackingSection
    } catch (err) {
      console.error('섹션 생성 오류:', err)
      return null
    }
  }, [refreshSections])

  // 섹션 업데이트
  const updateSection = useCallback(async (
    id: string,
    updates: Partial<TrackingSection>
  ): Promise<boolean> => {
    try {
      const supabase = createClient()

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('tracking_sections')
        .update(updateData as never)
        .eq('id', id)

      if (updateError) throw updateError

      await refreshSections()
      return true
    } catch (err) {
      console.error('섹션 업데이트 오류:', err)
      return false
    }
  }, [refreshSections])

  // 섹션 삭제 (soft delete)
  const deleteSection = useCallback(async (id: string): Promise<boolean> => {
    try {
      const supabase = createClient()

      const deleteData = {
        is_active: false,
        updated_at: new Date().toISOString(),
      }

      const { error: deleteError } = await supabase
        .from('tracking_sections')
        .update(deleteData as never)
        .eq('id', id)

      if (deleteError) throw deleteError

      // 삭제된 섹션이 선택된 상태면 선택 해제
      if (selectedSectionId === id) {
        selectSection(null)
      }

      await refreshSections()
      return true
    } catch (err) {
      console.error('섹션 삭제 오류:', err)
      return false
    }
  }, [refreshSections, selectedSectionId, selectSection])

  const value: TrackingSectionContextValue = {
    sections,
    selectedSectionId,
    loading,
    error,
    selectSection,
    createSection,
    updateSection,
    deleteSection,
    refreshSections,
  }

  return (
    <TrackingSectionContext.Provider value={value}>
      {children}
    </TrackingSectionContext.Provider>
  )
}

export function useTrackingSection() {
  const context = useContext(TrackingSectionContext)
  if (context === undefined) {
    throw new Error('useTrackingSection must be used within a TrackingSectionProvider')
  }
  return context
}
