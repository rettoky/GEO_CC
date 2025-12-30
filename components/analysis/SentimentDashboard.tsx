'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { SentimentCard } from './SentimentCard'
import type { BrandMentionSentiment, LLMType } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface SentimentDashboardProps {
  /** 브랜드명 */
  brand: string
  /** 감성 분석 결과 배열 */
  sentiments: BrandMentionSentiment[]
  /** 컴포넌트 클래스 */
  className?: string
}

/**
 * 감성 분석 대시보드 컴포넌트
 *
 * 상단: 감성 분포 요약 통계
 * 하단: 긍정/부정 카드 2열 그리드
 */
export function SentimentDashboard({
  brand,
  sentiments,
  className,
}: SentimentDashboardProps) {
  const [showNeutral, setShowNeutral] = useState(false)

  // 감성별 그룹화
  const grouped = useMemo(() => {
    const positive: BrandMentionSentiment[] = []
    const negative: BrandMentionSentiment[] = []
    const neutral: BrandMentionSentiment[] = []

    for (const s of sentiments) {
      switch (s.sentiment) {
        case 'positive':
          positive.push(s)
          break
        case 'negative':
          negative.push(s)
          break
        case 'neutral':
          neutral.push(s)
          break
      }
    }

    return { positive, negative, neutral }
  }, [sentiments])

  // 통계 계산
  const stats = useMemo(() => {
    const total = sentiments.length
    if (total === 0) {
      return {
        total: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        positiveRate: 0,
        negativeRate: 0,
        neutralRate: 0,
        sentimentScore: 0,
        avgConfidence: 0,
      }
    }

    const positiveCount = grouped.positive.length
    const negativeCount = grouped.negative.length
    const neutralCount = grouped.neutral.length

    const avgConfidence =
      sentiments.reduce((sum, s) => sum + s.confidence, 0) / total

    // 감성 점수: -100 ~ +100
    const sentimentScore = Math.round(
      ((positiveCount - negativeCount) / total) * 100
    )

    return {
      total,
      positiveCount,
      negativeCount,
      neutralCount,
      positiveRate: Math.round((positiveCount / total) * 100),
      negativeRate: Math.round((negativeCount / total) * 100),
      neutralRate: Math.round((neutralCount / total) * 100),
      sentimentScore,
      avgConfidence: Math.round(avgConfidence * 100),
    }
  }, [sentiments, grouped])

  // LLM별 감성 분포
  const byLLM = useMemo(() => {
    const result: Record<LLMType, { positive: number; negative: number; neutral: number }> = {
      perplexity: { positive: 0, negative: 0, neutral: 0 },
      chatgpt: { positive: 0, negative: 0, neutral: 0 },
      gemini: { positive: 0, negative: 0, neutral: 0 },
      claude: { positive: 0, negative: 0, neutral: 0 },
    }

    for (const s of sentiments) {
      if (result[s.llmSource]) {
        result[s.llmSource][s.sentiment]++
      }
    }

    return result
  }, [sentiments])

  // 감성 점수에 따른 색상
  const scoreColor = useMemo(() => {
    if (stats.sentimentScore >= 30) return 'text-emerald-600 dark:text-emerald-400'
    if (stats.sentimentScore >= 0) return 'text-yellow-600 dark:text-yellow-400'
    if (stats.sentimentScore >= -30) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }, [stats.sentimentScore])

  const scoreIcon = useMemo(() => {
    if (stats.sentimentScore >= 30) return TrendingUp
    if (stats.sentimentScore >= 0) return Minus
    return TrendingDown
  }, [stats.sentimentScore])

  const ScoreIcon = scoreIcon

  if (sentiments.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 감성 분포 요약 */}
      <Card className="border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-pink-500" />
            감성 분석 결과
            <Badge variant="secondary" className="ml-2">
              {brand}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            AI가 분석한 브랜드 언급의 감성을 확인하세요
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 메인 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 전체 분석 */}
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">총 분석</div>
            </div>

            {/* 긍정 */}
            <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.positiveCount}
              </div>
              <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                긍정 ({stats.positiveRate}%)
              </div>
            </div>

            {/* 부정 */}
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.negativeCount}
              </div>
              <div className="text-xs text-red-600/80 dark:text-red-400/80">
                부정 ({stats.negativeRate}%)
              </div>
            </div>

            {/* 감성 점수 */}
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <div className={cn('text-2xl font-bold flex items-center justify-center gap-1', scoreColor)}>
                <ScoreIcon className="h-5 w-5" />
                {stats.sentimentScore > 0 ? '+' : ''}{stats.sentimentScore}
              </div>
              <div className="text-xs text-blue-600/80 dark:text-blue-400/80">
                감성 점수
              </div>
            </div>
          </div>

          {/* 분포 바 차트 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>감성 분포</span>
              <span>신뢰도 평균: {stats.avgConfidence}%</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              {stats.positiveRate > 0 && (
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${stats.positiveRate}%` }}
                />
              )}
              {stats.neutralRate > 0 && (
                <div
                  className="bg-gray-400 dark:bg-gray-500 transition-all duration-500"
                  style={{ width: `${stats.neutralRate}%` }}
                />
              )}
              {stats.negativeRate > 0 && (
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${stats.negativeRate}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600 dark:text-emerald-400">
                긍정 {stats.positiveRate}%
              </span>
              <span className="text-gray-500">
                중립 {stats.neutralRate}%
              </span>
              <span className="text-red-600 dark:text-red-400">
                부정 {stats.negativeRate}%
              </span>
            </div>
          </div>

          {/* LLM별 분포 (접을 수 있음) */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowNeutral(!showNeutral)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              LLM별 감성 분포
              {showNeutral ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showNeutral && (
              <div className="mt-3 space-y-2">
                {(['perplexity', 'chatgpt', 'gemini', 'claude'] as LLMType[]).map((llm) => {
                  const data = byLLM[llm]
                  const total = data.positive + data.negative + data.neutral
                  if (total === 0) return null

                  return (
                    <div key={llm} className="flex items-center gap-3">
                      <span className="text-xs w-20 text-muted-foreground capitalize">
                        {llm === 'chatgpt' ? 'ChatGPT' : llm.charAt(0).toUpperCase() + llm.slice(1)}
                      </span>
                      <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {data.positive > 0 && (
                          <div
                            className="bg-emerald-500"
                            style={{ width: `${(data.positive / total) * 100}%` }}
                          />
                        )}
                        {data.neutral > 0 && (
                          <div
                            className="bg-gray-400"
                            style={{ width: `${(data.neutral / total) * 100}%` }}
                          />
                        )}
                        {data.negative > 0 && (
                          <div
                            className="bg-red-500"
                            style={{ width: `${(data.negative / total) * 100}%` }}
                          />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {total}개
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 긍정/부정 분리 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SentimentCard
          type="positive"
          mentions={grouped.positive}
          brand={brand}
          maxDisplay={5}
        />
        <SentimentCard
          type="negative"
          mentions={grouped.negative}
          brand={brand}
          maxDisplay={5}
        />
      </div>

      {/* 중립 언급 (있을 경우) */}
      {grouped.neutral.length > 0 && (
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2 bg-gray-50 dark:bg-gray-900/30">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-gray-500" />
                중립적 언급
              </div>
              <Badge variant="secondary">{grouped.neutral.length}개</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {grouped.neutral.slice(0, 3).map((mention, idx) => (
                <div
                  key={`neutral-${idx}`}
                  className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-900/30 rounded p-2 border-l-2 border-gray-300 dark:border-gray-600"
                >
                  <p className="line-clamp-2">&quot;{mention.context}&quot;</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs py-0">
                      {mention.llmSource === 'chatgpt' ? 'ChatGPT' : mention.llmSource.charAt(0).toUpperCase() + mention.llmSource.slice(1)}
                    </Badge>
                    <span className="text-xs">{mention.reason}</span>
                  </div>
                </div>
              ))}
              {grouped.neutral.length > 3 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{grouped.neutral.length - 3}개 더 있음
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
