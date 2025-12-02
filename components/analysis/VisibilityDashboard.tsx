'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, TrendingUp, Eye, Target } from 'lucide-react'
import type { AnalysisSummary, AnalysisResults } from '@/types'

interface VisibilityDashboardProps {
  summary: AnalysisSummary
  results: AnalysisResults
  myDomain?: string
  myBrand?: string
}

const LLM_NAMES = {
  perplexity: 'Perplexity',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}

/**
 * 내 도메인/브랜드 노출 현황 대시보드
 */
export function VisibilityDashboard({
  summary,
  results,
  myDomain,
  myBrand,
}: VisibilityDashboardProps) {
  // 내 도메인이 인용된 LLM 목록
  const myDomainLLMs = Object.entries(results)
    .filter(([_, result]) => {
      if (!result || !result.success || !myDomain) return false
      return result.citations.some((c) => c.domain === myDomain.toLowerCase().replace(/^www\./, ''))
    })
    .map(([llm]) => LLM_NAMES[llm as keyof typeof LLM_NAMES])

  // 노출률 계산
  const visibilityRate = (myDomainLLMs.length / 4) * 100

  // 노출 등급
  const getVisibilityGrade = (rate: number) => {
    if (rate >= 75) return { grade: 'A', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-300' }
    if (rate >= 50) return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' }
    if (rate >= 25) return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' }
    return { grade: 'D', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300' }
  }

  const visibilityGrade = getVisibilityGrade(visibilityRate)

  return (
    <div className="space-y-6">
      {/* 메인 노출 현황 카드 */}
      <Card className={`border-4 ${visibilityGrade.borderColor}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-6 w-6" />
            LLM 검색 노출 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 노출률 */}
            <div className={`text-center p-6 rounded-lg ${visibilityGrade.bgColor}`}>
              <div className={`text-6xl font-bold ${visibilityGrade.color} mb-2`}>
                {visibilityGrade.grade}
              </div>
              <div className="text-sm text-muted-foreground mb-1">노출 등급</div>
              <div className={`text-3xl font-bold ${visibilityGrade.color}`}>
                {visibilityRate.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {myDomainLLMs.length}/4 LLM 노출
              </div>
            </div>

            {/* 도메인 인용 수 */}
            <div className="text-center p-6 rounded-lg bg-blue-50 border-2 border-blue-300">
              <Target className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {summary.myDomainCitationCount}
              </div>
              <div className="text-sm text-muted-foreground">
                내 도메인 인용 수
              </div>
              {myDomain && (
                <div className="text-xs text-blue-600 mt-2 font-mono">
                  {myDomain}
                </div>
              )}
            </div>

            {/* 브랜드 언급 수 */}
            <div className="text-center p-6 rounded-lg bg-purple-50 border-2 border-purple-300">
              <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {summary.brandMentionCount}
              </div>
              <div className="text-sm text-muted-foreground">
                브랜드 언급 수
              </div>
              {myBrand && (
                <div className="text-xs text-purple-600 mt-2 font-semibold">
                  "{myBrand}"
                </div>
              )}
            </div>
          </div>

          {/* LLM별 노출 상세 */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-semibold mb-4">LLM별 노출 상세</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(LLM_NAMES).map(([key, name]) => {
                const isVisible = myDomainLLMs.includes(name)
                const result = results[key as keyof AnalysisResults]
                const citationCount = result?.citations.filter(
                  (c) => myDomain && c.domain === myDomain.toLowerCase().replace(/^www\./, '')
                ).length || 0

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border-2 ${
                      isVisible
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-300 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">{name}</span>
                      {isVisible ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-700">
                      {citationCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isVisible ? '인용됨' : '미노출'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 개선 제안 */}
          {visibilityRate < 100 && (
            <div className="mt-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">💡 노출 개선 제안</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {visibilityRate === 0 && (
                  <li>• 현재 어떤 LLM에도 노출되지 않고 있습니다. SEO 최적화 및 콘텐츠 품질 개선이 필요합니다.</li>
                )}
                {visibilityRate > 0 && visibilityRate < 50 && (
                  <li>• {4 - myDomainLLMs.length}개 LLM에서 추가 노출이 필요합니다. 다양한 키워드 최적화를 고려해보세요.</li>
                )}
                {summary.brandMentionCount === 0 && myBrand && (
                  <li>• 브랜드명이 답변에 언급되지 않았습니다. 브랜드 인지도 향상이 필요합니다.</li>
                )}
                {summary.myDomainCitationCount < 2 && summary.myDomainCited && (
                  <li>• 인용 수가 적습니다. 더 많은 고품질 콘텐츠를 제공하여 권위를 높이세요.</li>
                )}
              </ul>
            </div>
          )}

          {/* 완벽한 노출 축하 */}
          {visibilityRate === 100 && summary.myDomainCitationCount > 0 && (
            <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-2">🎉 완벽한 노출!</h4>
              <p className="text-sm text-green-700">
                모든 LLM에서 귀하의 도메인이 검색되고 있습니다. 훌륭한 SEO와 콘텐츠 품질을 유지하세요!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
