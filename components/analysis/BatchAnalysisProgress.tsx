/**
 * Batch Analysis Progress Component
 * 배치 분석 진행률 표시 (쿼리 변형 분석 시)
 */

'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'
import type { BatchAnalysisProgress } from '@/lib/analysis/variation-orchestrator'

interface BatchAnalysisProgressProps {
  progress: BatchAnalysisProgress
  baseQuery: string
}

export function BatchAnalysisProgressTracker({
  progress,
  baseQuery,
}: BatchAnalysisProgressProps) {
  const stageLabels = {
    variations: '쿼리 변형 저장 중',
    llm_analysis: 'LLM 분석 진행 중',
    completed: '분석 완료',
  }

  const isCompleted = progress.stage === 'completed'

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {!isCompleted && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
          <div>
            <h3 className="font-semibold text-lg">
              {isCompleted ? '✓ 배치 분석 완료' : '배치 분석 진행 중'}
            </h3>
            <p className="text-sm text-gray-600">
              기본 쿼리: <span className="font-medium">{baseQuery}</span>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{stageLabels[progress.stage]}</span>
            <span className="font-medium">
              {progress.currentVariation} / {progress.totalVariations} 변형
            </span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          <div className="text-xs text-gray-500 text-right">
            {Math.round(progress.percentage)}%
          </div>
        </div>

        {progress.currentLLM && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            현재 분석 중: <span className="font-medium">{progress.currentLLM}</span>
          </div>
        )}

        {isCompleted && (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded font-medium">
            {progress.totalVariations}개 변형 분석이 모두 완료되었습니다!
          </div>
        )}
      </div>
    </Card>
  )
}
