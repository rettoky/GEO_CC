'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  TrendingUp,
  TrendingDown,
  Building2,
  MessageSquareQuote,
  ChevronDown,
  ChevronUp,
  Users,
  Info,
} from 'lucide-react'
import { useState } from 'react'
import type { BrandMentionAnalysis } from '@/types'

// 보험 상품명 → 보험사 매핑 (일반적인 패턴)
const INSURANCE_COMPANY_PATTERNS: Record<string, string[]> = {
  '삼성화재': ['삼성', 'samsung'],
  '현대해상': ['현대', 'hyundai'],
  '메리츠화재': ['메리츠', 'meritz'],
  'DB손해보험': ['db손보', 'db손해', 'db'],
  'KB손해보험': ['kb손보', 'kb손해', 'kb'],
  '한화생명': ['한화', 'hanwha'],
  '교보생명': ['교보', 'kyobo'],
  '흥국생명': ['흥국', 'heungkuk'],
  '동양생명': ['동양', 'tongyang'],
  '라이나생명': ['라이나', 'lina'],
  'NH농협생명': ['농협', 'nh'],
  '신한라이프': ['신한', 'shinhan'],
  'AIA생명': ['aia', '에이아이에이'],
  '롯데손해보험': ['롯데', 'lotte'],
}

// 브랜드명에서 소속 보험사 추출
function findParentCompany(brandName: string, aliases: string[]): string | null {
  const lowerBrand = brandName.toLowerCase()
  const lowerAliases = aliases.map(a => a.toLowerCase())

  for (const [company, patterns] of Object.entries(INSURANCE_COMPANY_PATTERNS)) {
    // 브랜드명에 보험사 패턴이 포함되어 있는지 확인
    for (const pattern of patterns) {
      if (lowerBrand.includes(pattern) || lowerAliases.some(a => a.includes(pattern))) {
        // 브랜드명 자체가 보험사명이면 null 반환
        if (brandName === company || aliases.includes(company)) {
          return null
        }
        return company
      }
    }
  }
  return null
}

interface BrandMentionCardProps {
  brandMentionAnalysis?: BrandMentionAnalysis
  myBrand?: string
  onCompetitorClick?: (brandName: string, aliases: string[]) => void
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
export function BrandMentionCard({ brandMentionAnalysis, myBrand, onCompetitorClick }: BrandMentionCardProps) {
  const [showAllCompetitors, setShowAllCompetitors] = useState(false)
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null)

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
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-orange-500" />
            경쟁사 브랜드 분석
            <Badge variant="secondary" className="ml-2">
              총 {totalBrandMentions}회 언급
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            LLM 답변에서 언급된 실제 브랜드명입니다. 브랜드 인지도 경쟁 현황을 파악하세요.
          </p>
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
                          &quot;{context}&quot;
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

          {/* 경쟁 브랜드 */}
          {competitors.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-orange-600" />
                경쟁 브랜드
                <Badge variant="outline" className="ml-1">
                  {competitors.length}개 감지
                </Badge>
              </h4>

              <div className="space-y-2">
                {displayedCompetitors.map((competitor, index) => {
                  const share = totalBrandMentions > 0
                    ? Math.round((competitor.mentionCount / totalBrandMentions) * 100)
                    : 0
                  const isExpanded = expandedCompetitor === competitor.brand
                  const parentCompany = findParentCompany(competitor.brand, competitor.aliases || [])

                  return (
                    <div
                      key={competitor.brand}
                      className="bg-gray-50 dark:bg-gray-900/30 rounded-lg overflow-hidden"
                    >
                      {/* 헤더 - 클릭하여 펼침/접힘 */}
                      <div
                        className="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors"
                        onClick={() => setExpandedCompetitor(isExpanded ? null : competitor.brand)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-5">
                              #{index + 1}
                            </span>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{competitor.brand}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {competitor.mentionCount}회
                                </Badge>
                              </div>
                              {/* 소속 보험사 표시 */}
                              {parentCompany && (
                                <span className="text-xs text-blue-600 flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  {parentCompany} 상품
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {share}%
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
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

                      {/* 펼침 영역 - 상세 문맥 */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
                          {/* 별칭 정보 */}
                          {competitor.aliases && competitor.aliases.length > 1 && (
                            <div className="pt-3 pb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">검색된 별칭</p>
                              <div className="flex flex-wrap gap-1">
                                {competitor.aliases.map((alias, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {alias}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 언급 문맥 상세 */}
                          {competitor.contexts && competitor.contexts.length > 0 ? (
                            <div className="pt-2">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                                <MessageSquareQuote className="h-3 w-3" />
                                언급 문맥 ({competitor.contexts.length}개)
                              </p>
                              <div className="space-y-2">
                                {competitor.contexts.map((context, idx) => (
                                  <div
                                    key={idx}
                                    className="text-sm bg-gray-50 dark:bg-gray-800 rounded p-3 border-l-2 border-orange-400"
                                  >
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                      {context}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="pt-3 text-sm text-muted-foreground">
                              상세 문맥 정보가 없습니다
                            </div>
                          )}

                          {/* 전체 결과에서 보기 버튼 */}
                          {onCompetitorClick && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onCompetitorClick(competitor.brand, competitor.aliases || [competitor.brand])
                              }}
                              className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 py-2 rounded-md transition-colors border border-orange-200 dark:border-orange-800"
                            >
                              <ChevronDown className="h-4 w-4" />
                              전체 LLM 결과에서 &quot;{competitor.brand}&quot; 보기
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
