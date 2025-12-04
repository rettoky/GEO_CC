'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Tag,
  TrendingUp,
  TrendingDown,
  Building2,
  MessageSquareQuote,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import type { BrandMentionAnalysis, BrandMention } from '@/types'

interface BrandMentionCardProps {
  brandMentionAnalysis?: BrandMentionAnalysis
  myBrand?: string
}

// LLM 이름 표시
const LLM_NAMES: Record<string, string> = {
  perplexity: 'Perplexity',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}

/**
 * 브랜드 언급 현황 카드 컴포넌트
 */
export function BrandMentionCard({ brandMentionAnalysis, myBrand }: BrandMentionCardProps) {
  const [showAllCompetitors, setShowAllCompetitors] = useState(false)

  if (!brandMentionAnalysis) {
    return null
  }

  const { myBrand: myBrandMention, competitors, totalBrandMentions } = brandMentionAnalysis

  // 내 브랜드 점유율 계산
  const myBrandShare = totalBrandMentions > 0 && myBrandMention
    ? Math.round((myBrandMention.mentionCount / totalBrandMentions) * 100)
    : 0

  // 표시할 경쟁사 수 제한
  const displayedCompetitors = showAllCompetitors ? competitors : competitors.slice(0, 5)

  return (
    <TooltipProvider>
      <Card className="border-none shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5 text-primary" />
            브랜드 언급 분석
            <Badge variant="secondary" className="ml-2">
              총 {totalBrandMentions}회
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 내 브랜드 언급 현황 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              내 브랜드
            </h4>

            {myBrandMention && myBrandMention.mentionCount > 0 ? (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {myBrandMention.brand || myBrand}
                    </span>
                    <Badge variant="default" className="bg-blue-600">
                      {myBrandMention.mentionCount}회 언급
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {myBrandShare > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">{myBrandShare}% 점유율</span>
                  </div>
                </div>

                {/* 언급된 LLM 목록 */}
                <div className="flex flex-wrap gap-1">
                  {myBrandMention.mentionedInLLMs.map((llm) => (
                    <Badge key={llm} variant="outline" className="text-xs">
                      {LLM_NAMES[llm] || llm}
                    </Badge>
                  ))}
                </div>

                {/* 언급 문맥 */}
                {myBrandMention.contexts && myBrandMention.contexts.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <MessageSquareQuote className="h-3 w-3" />
                      언급 문맥
                    </p>
                    <div className="space-y-1">
                      {myBrandMention.contexts.slice(0, 2).map((context, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground bg-white dark:bg-gray-900 rounded p-2 italic">
                          "{context}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 별칭 정보 */}
                {myBrandMention.aliases && myBrandMention.aliases.length > 1 && (
                  <div className="text-xs text-muted-foreground">
                    검색된 별칭: {myBrandMention.aliases.join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  {myBrand ? (
                    <>
                      <span className="font-medium">{myBrand}</span> 브랜드가 AI 응답에서 언급되지 않았습니다
                    </>
                  ) : (
                    '브랜드명을 입력하면 언급 분석이 가능합니다'
                  )}
                </p>
              </div>
            )}
          </div>

          {/* 경쟁사 브랜드 언급 현황 */}
          {competitors.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-orange-600" />
                경쟁사 브랜드 언급
                <Badge variant="outline" className="ml-1">
                  {competitors.length}개 브랜드
                </Badge>
              </h4>

              <div className="space-y-2">
                {displayedCompetitors.map((competitor, index) => {
                  const share = totalBrandMentions > 0
                    ? Math.round((competitor.mentionCount / totalBrandMentions) * 100)
                    : 0

                  return (
                    <Tooltip key={competitor.brand}>
                      <TooltipTrigger asChild>
                        <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground w-5">
                                #{index + 1}
                              </span>
                              <span className="font-medium">{competitor.brand}</span>
                              <Badge variant="secondary" className="text-xs">
                                {competitor.mentionCount}회
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {share}%
                            </span>
                          </div>
                          <Progress value={share} className="h-1.5" />
                          <div className="flex flex-wrap gap-1 mt-2">
                            {competitor.mentionedInLLMs.map((llm) => (
                              <Badge key={llm} variant="outline" className="text-xs py-0">
                                {LLM_NAMES[llm] || llm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-2">
                          <p className="font-medium">{competitor.brand}</p>
                          {competitor.contexts && competitor.contexts.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <p className="font-medium mb-1">언급 문맥:</p>
                              {competitor.contexts.slice(0, 2).map((ctx, i) => (
                                <p key={i} className="italic">"{ctx}"</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>

              {/* 더보기/접기 버튼 */}
              {competitors.length > 5 && (
                <button
                  onClick={() => setShowAllCompetitors(!showAllCompetitors)}
                  className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:underline py-2"
                >
                  {showAllCompetitors ? (
                    <>
                      접기 <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      {competitors.length - 5}개 더보기 <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* 경쟁사 없음 */}
          {competitors.length === 0 && totalBrandMentions === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              AI 응답에서 감지된 브랜드 언급이 없습니다
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
