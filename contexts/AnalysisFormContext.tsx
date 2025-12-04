'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import type { QueryInputData } from '@/components/analysis/QueryInput'
import type { GeneratedVariation } from '@/types/queryVariations'

interface AnalysisFormState {
  // 폼 입력 데이터
  queryData: QueryInputData | null
  setQueryData: (data: QueryInputData | null) => void

  // 생성된 변형
  variations: GeneratedVariation[]
  setVariations: (variations: GeneratedVariation[]) => void

  // 변형 생성기 표시 여부
  showVariationGenerator: boolean
  setShowVariationGenerator: (show: boolean) => void

  // 폼 초기화
  resetForm: () => void
}

const AnalysisFormContext = createContext<AnalysisFormState | undefined>(undefined)

export function AnalysisFormProvider({ children }: { children: ReactNode }) {
  const [queryData, setQueryData] = useState<QueryInputData | null>(null)
  const [variations, setVariations] = useState<GeneratedVariation[]>([])
  const [showVariationGenerator, setShowVariationGenerator] = useState(false)

  const resetForm = () => {
    setQueryData(null)
    setVariations([])
    setShowVariationGenerator(false)
  }

  return (
    <AnalysisFormContext.Provider
      value={{
        queryData,
        setQueryData,
        variations,
        setVariations,
        showVariationGenerator,
        setShowVariationGenerator,
        resetForm,
      }}
    >
      {children}
    </AnalysisFormContext.Provider>
  )
}

export function useAnalysisForm() {
  const context = useContext(AnalysisFormContext)
  if (context === undefined) {
    throw new Error('useAnalysisForm must be used within an AnalysisFormProvider')
  }
  return context
}
