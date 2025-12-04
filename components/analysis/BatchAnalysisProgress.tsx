/**
 * Batch Analysis Progress Component
 * 배치 분석 진행률 표시 (쿼리 변형 분석 시)
 */

'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Database,
  FileText,
  Cpu,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react'
import type { BatchAnalysisProgress } from '@/lib/analysis/variation-orchestrator'

interface BatchAnalysisProgressProps {
  progress: BatchAnalysisProgress
  baseQuery: string
}

// 각 스테이지 정보
const STAGE_INFO = {
  init: {
    label: '준비',
    description: 'Supabase에 분석 레코드를 생성하고 있습니다...',
    icon: Database,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  variations: {
    label: '저장',
    description: '생성된 쿼리 변형을 데이터베이스에 저장하고 있습니다...',
    icon: FileText,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
  base_analysis: {
    label: '기본쿼리',
    description: '기본 쿼리를 4개 AI 엔진에서 분석하고 있습니다...',
    icon: Cpu,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
  },
  llm_analysis: {
    label: '변형분석',
    description: '변형 쿼리들을 4개 AI 엔진에서 순차적으로 분석하고 있습니다...',
    icon: Cpu,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  aggregation: {
    label: '집계',
    description: '모든 결과를 종합하고 시각화 데이터를 생성하고 있습니다...',
    icon: Zap,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
  },
  completed: {
    label: '완료',
    description: '모든 분석이 성공적으로 완료되었습니다!',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
}

// 스테이지 순서
const STAGE_ORDER = ['init', 'variations', 'base_analysis', 'llm_analysis', 'aggregation', 'completed'] as const

export function BatchAnalysisProgressTracker({
  progress,
  baseQuery,
}: BatchAnalysisProgressProps) {
  const isCompleted = progress.stage === 'completed'
  const currentStageInfo = STAGE_INFO[progress.stage as keyof typeof STAGE_INFO] || STAGE_INFO.init
  const CurrentIcon = currentStageInfo.icon
  const currentStageIndex = STAGE_ORDER.indexOf(progress.stage as typeof STAGE_ORDER[number])

  // 예상 시간 계산 (대략적인 추정)
  const estimatedTimePerVariation = 15 // 초
  const remainingVariations = progress.totalVariations - progress.currentVariation
  const estimatedRemainingSeconds = remainingVariations * estimatedTimePerVariation
  const estimatedMinutes = Math.ceil(estimatedRemainingSeconds / 60)

  return (
    <Card className="p-6 border-none shadow-lg">
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${currentStageInfo.bgColor}`}>
              {!isCompleted ? (
                <Loader2 className={`h-6 w-6 animate-spin ${currentStageInfo.color}`} />
              ) : (
                <CurrentIcon className={`h-6 w-6 ${currentStageInfo.color}`} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-xl">
                {isCompleted ? '배치 분석 완료!' : '배치 분석 진행 중'}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                기본 쿼리: <span className="font-medium text-foreground">&quot;{baseQuery}&quot;</span>
              </p>
            </div>
          </div>
          {!isCompleted && estimatedMinutes > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              약 {estimatedMinutes}분 남음
            </Badge>
          )}
        </div>

        {/* 스테이지 인디케이터 */}
        <div className="flex items-center justify-between">
          {STAGE_ORDER.map((stage, index) => {
            const info = STAGE_INFO[stage]
            const Icon = info.icon
            const isPast = index < currentStageIndex
            const isCurrent = index === currentStageIndex
            const isFuture = index > currentStageIndex

            return (
              <div key={stage} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${isPast ? 'bg-green-100 text-green-600' : ''}
                    ${isCurrent ? `${info.bgColor} ${info.color}` : ''}
                    ${isFuture ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    {isPast ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isCurrent && !isCompleted ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${isCurrent ? info.color : 'text-muted-foreground'}`}>
                    {info.label}
                  </span>
                </div>
                {index < STAGE_ORDER.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${isPast ? 'bg-green-300' : 'bg-muted'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* 현재 스테이지 상세 정보 */}
        <div className={`rounded-lg p-4 ${currentStageInfo.bgColor}`}>
          <div className="flex items-center gap-2 mb-2">
            <CurrentIcon className={`h-5 w-5 ${currentStageInfo.color}`} />
            <span className={`font-semibold ${currentStageInfo.color}`}>
              {currentStageInfo.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {progress.message || currentStageInfo.description}
          </p>

          {/* 기본 쿼리 또는 변형 쿼리 분석 중일 때 추가 정보 */}
          {(progress.stage === 'base_analysis' || progress.stage === 'llm_analysis') && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">쿼리 분석 진행</span>
                <span className="font-medium">
                  {progress.currentVariation} / {progress.totalVariations}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {['Perplexity', 'ChatGPT', 'Gemini', 'Claude'].map((llm) => (
                  <div key={llm} className="text-center">
                    <div className="text-xs text-muted-foreground">{llm}</div>
                    <Zap className="h-4 w-4 mx-auto mt-1 text-orange-400 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 집계 중일 때 추가 정보 */}
          {progress.stage === 'aggregation' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600">
              <Zap className="h-4 w-4 animate-pulse" />
              <span>종합 분석 리포트 생성 중...</span>
            </div>
          )}
        </div>

        {/* 진행률 바 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">전체 진행률</span>
            <span className="font-bold text-lg">{Math.round(progress.percentage)}%</span>
          </div>
          <Progress value={progress.percentage} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>시작</span>
            <span>{progress.currentVariation}/{progress.totalVariations} 변형 완료</span>
            <span>완료</span>
          </div>
        </div>

        {/* 완료 메시지 */}
        {isCompleted && (
          <div className="text-center py-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-lg font-semibold text-green-700">
              {progress.totalVariations}개 변형 분석 완료!
            </p>
            <p className="text-sm text-green-600 mt-1">
              분석 결과를 확인하세요
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
