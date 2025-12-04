/**
 * Auto-Detected Competitors List
 * 자동 감지된 경쟁사 목록 표시
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createCompetitor } from '@/lib/supabase/queries/competitors'
import { extractLLMAppearances, inferBrandName } from '@/lib/analysis/competitor-detector'
import { useToast } from '@/hooks/use-toast'
import type { CompetitorScore } from '@/types/competitors'
import type { AnalysisResults } from '@/types'

interface AutoDetectedListProps {
  competitors: CompetitorScore[]
  analysisId: string
  results: AnalysisResults
  onConfirm: () => void
}

export function AutoDetectedList({
  competitors,
  analysisId,
  results,
  onConfirm,
}: AutoDetectedListProps) {
  const [confirmingDomains, setConfirmingDomains] = useState<Set<string>>(
    new Set()
  )
  const { toast } = useToast()
  const supabase = createClient()

  const handleConfirm = async (comp: CompetitorScore) => {
    setConfirmingDomains((prev) => new Set(prev).add(comp.domain))

    try {
      // LLM별 출현 횟수 추출
      const llmAppearances = extractLLMAppearances(results, comp.domain)

      // 브랜드명 추론
      const brandName = inferBrandName(comp.domain)

      await createCompetitor(supabase, {
        analysis_id: analysisId,
        domain: comp.domain,
        brand_name: brandName,
        detection_method: 'auto',
        citation_count: comp.citationCount,
        citation_rate: 0, // 나중에 업데이트
        confidence_score: comp.confidenceScore,
        llm_appearances: llmAppearances,
        is_confirmed: true,
      })

      toast({
        title: '경쟁사 확인 완료',
        description: `${comp.domain}을(를) 경쟁사로 추가했습니다`,
      })

      onConfirm()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      toast({
        title: '경쟁사 확인 실패',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setConfirmingDomains((prev) => {
        const next = new Set(prev)
        next.delete(comp.domain)
        return next
      })
    }
  }

  const getConfidenceBadgeVariant = (score: number) => {
    if (score >= 0.7) return 'default'
    if (score >= 0.5) return 'secondary'
    return 'outline'
  }

  const getConfidenceBadgeClass = (score: number) => {
    if (score >= 0.7) return 'bg-green-500 text-white'
    if (score >= 0.5) return 'bg-yellow-500 text-white'
    return 'bg-gray-300 text-gray-700'
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        LLM 검색 결과에서 자동으로 감지된 경쟁사입니다. 확인하여 경쟁사 목록에
        추가하세요.
      </p>

      {competitors.map((comp, index) => (
        <Card key={comp.domain} className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-medium text-gray-400">
                  #{index + 1}
                </span>
                <span className="font-semibold truncate">{comp.domain}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  {comp.citationCount}회 인용
                </span>
                <span>·</span>
                <span>{comp.llmDiversity}개 LLM</span>
                <span>·</span>
                <span>평균 {comp.avgPosition}위</span>
                <span>·</span>
                <span className="font-medium">
                  점수: {comp.competitorScore}/100
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge
                variant={getConfidenceBadgeVariant(comp.confidenceScore)}
                className={getConfidenceBadgeClass(comp.confidenceScore)}
              >
                신뢰도 {(comp.confidenceScore * 100).toFixed(0)}%
              </Badge>

              <Button
                size="sm"
                onClick={() => handleConfirm(comp)}
                disabled={confirmingDomains.has(comp.domain)}
              >
                <Check className="h-4 w-4 mr-1" />
                확인
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {competitors.length === 0 && (
        <Card className="p-8 text-center text-gray-500">
          자동 감지된 경쟁사가 없습니다.
        </Card>
      )}
    </div>
  )
}
