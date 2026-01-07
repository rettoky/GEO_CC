'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquareQuote,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { BrandMentionSentiment, LLMType } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

const LLM_NAMES: Record<LLMType, string> = {
  perplexity: 'Perplexity',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}

const LLM_BADGE_COLORS: Record<LLMType, string> = {
  perplexity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  chatgpt: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  gemini: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  claude: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

interface SentimentCardProps {
  /** 감성 타입: positive 또는 negative */
  type: 'positive' | 'negative'
  /** 브랜드 언급 감성 분석 결과 배열 */
  mentions: BrandMentionSentiment[]
  /** 브랜드명 (선택적) */
  brand?: string
  /** 최대 표시 개수 (기본: 5) */
  maxDisplay?: number
  /** 카드 클래스 */
  className?: string
}

/**
 * 긍정/부정 감성 분석 결과를 표시하는 카드 컴포넌트
 *
 * 긍정 카드: 녹색 테마, ThumbsUp 아이콘
 * 부정 카드: 빨간색 테마, ThumbsDown 아이콘
 */
export function SentimentCard({
  type,
  mentions,
  brand,
  maxDisplay = 5,
  className,
}: SentimentCardProps) {
  const [showAll, setShowAll] = useState(false)
  const isPositive = type === 'positive'

  // 스타일 설정
  const styles = isPositive
    ? {
        card: 'border-emerald-200 dark:border-emerald-800/50',
        headerBg: 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20',
        iconBg: 'bg-emerald-500',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        mentionBg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
        mentionBorder: 'border-l-emerald-400',
        confidenceBg: 'bg-emerald-500',
      }
    : {
        card: 'border-red-200 dark:border-red-800/50',
        headerBg: 'bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20',
        iconBg: 'bg-red-500',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        mentionBg: 'bg-red-50/50 dark:bg-red-950/20',
        mentionBorder: 'border-l-red-400',
        confidenceBg: 'bg-red-500',
      }

  const Icon = isPositive ? ThumbsUp : ThumbsDown
  const title = isPositive ? '긍정적 언급' : '부정적 언급'
  const emptyMessage = isPositive
    ? '긍정적으로 언급된 내용이 없습니다'
    : '부정적으로 언급된 내용이 없습니다'

  // 표시할 언급 (최대 개수 제한, showAll 시 전체 표시)
  const displayedMentions = showAll ? mentions : mentions.slice(0, maxDisplay)
  const remainingCount = mentions.length - maxDisplay

  return (
    <Card className={cn('overflow-hidden shadow-lg', styles.card, className)}>
      <CardHeader className={cn('pb-3', styles.headerBg)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-lg', styles.iconBg)}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold">{title}</span>
          </div>
          <Badge className={styles.badge}>
            {mentions.length}개
          </Badge>
        </CardTitle>
        {brand && (
          <p className="text-xs text-muted-foreground mt-1">
            &quot;{brand}&quot; 브랜드에 대한 {isPositive ? '긍정적' : '부정적'} 평가
          </p>
        )}
      </CardHeader>

      <CardContent className="p-4">
        {mentions.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <ScrollArea className={mentions.length > 3 ? 'h-[280px]' : ''}>
            <div className="space-y-3">
              {displayedMentions.map((mention, idx) => (
                <div
                  key={`${mention.context}-${idx}`}
                  className={cn(
                    'rounded-lg p-3 border-l-4',
                    styles.mentionBg,
                    styles.mentionBorder
                  )}
                >
                  {/* 문맥 */}
                  <div className="flex items-start gap-2 mb-2">
                    <MessageSquareQuote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      &quot;{mention.context}&quot;
                    </p>
                  </div>

                  {/* 메타 정보 */}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      {/* LLM 출처 */}
                      <Badge
                        variant="outline"
                        className={cn('text-xs py-0', LLM_BADGE_COLORS[mention.llmSource])}
                      >
                        {LLM_NAMES[mention.llmSource]}
                      </Badge>

                      {/* 판단 이유 */}
                      {mention.reason && (
                        <span className="text-xs text-muted-foreground">
                          {mention.reason}
                        </span>
                      )}
                    </div>

                    {/* 신뢰도 */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', styles.confidenceBg)}
                          style={{ width: `${Math.round(mention.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(mention.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 더 많은 항목이 있을 때 - 클릭으로 펼치기/접기 */}
              {remainingCount > 0 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full text-center py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                >
                  {showAll ? (
                    <>
                      접기
                      <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      +{remainingCount}개 더 있음
                      <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
