'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LLMTabs } from '@/components/analysis/LLMTabs'
import { CitationDetailCard } from '@/components/analysis/CitationDetailCard'
import { AnswerView } from '@/components/analysis/AnswerView'
import type { Analysis } from '@/lib/supabase/types'
import type { LLMType } from '@/types'

interface AnalysisDetailClientProps {
  analysis: Analysis
}

export function AnalysisDetailClient({ analysis }: AnalysisDetailClientProps) {
  const successfulLLMs = (Object.keys(analysis.results) as LLMType[]).filter(
    (llm) => analysis.results[llm]?.success
  )

  const [activeLLM, setActiveLLM] = useState<LLMType>(successfulLLMs[0] || 'perplexity')

  const activeResult = analysis.results[activeLLM]

  return (
    <div className="space-y-6">
      {/* 뒤로 가기 */}
      <Link href="/analysis">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          분석 이력으로 돌아가기
        </Button>
      </Link>

      {/* 쿼리 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>쿼리 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">검색 쿼리</p>
            <p className="font-medium">{analysis.query_text}</p>
          </div>

          {analysis.my_domain && (
            <div>
              <p className="text-sm text-muted-foreground">타겟 도메인</p>
              <p className="font-medium">{analysis.my_domain}</p>
            </div>
          )}

          {analysis.my_brand && (
            <div>
              <p className="text-sm text-muted-foreground">브랜드명</p>
              <p className="font-medium">{analysis.my_brand}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">분석 시각</p>
            <p className="font-medium">{new Date(analysis.created_at).toLocaleString('ko-KR')}</p>
          </div>
        </CardContent>
      </Card>

      {/* LLM 탭 (T045) */}
      {successfulLLMs.length > 0 && (
        <Card>
          <CardHeader>
            <LLMTabs llms={successfulLLMs} onTabChange={setActiveLLM} />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 답변 전문 (T048) */}
            {activeResult && activeResult.success && (
              <>
                <AnswerView answer={activeResult.answer} model={activeResult.model} />

                {/* 인용 상세 목록 (T046, T050: 타겟 도메인 강조) */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">
                    인용 목록 ({activeResult.citations.length}개)
                  </h3>
                  {activeResult.citations.length > 0 ? (
                    <div className="space-y-3">
                      {activeResult.citations.map((citation) => (
                        <CitationDetailCard
                          key={citation.id}
                          citation={citation}
                          targetDomain={analysis.my_domain || undefined}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">인용이 없습니다</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {successfulLLMs.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              성공한 LLM 분석 결과가 없습니다
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
