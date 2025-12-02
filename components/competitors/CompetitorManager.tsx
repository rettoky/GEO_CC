/**
 * Competitor Manager
 * 자동 감지 + 수동 입력 경쟁사 통합 관리
 */

'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AutoDetectedList } from './AutoDetectedList'
import { ManualInput } from './ManualInput'
import type { Competitor, CompetitorScore } from '@/types/competitors'
import type { AnalysisResults } from '@/types'

interface CompetitorManagerProps {
  analysisId: string
  autoDetected: CompetitorScore[]
  manualCompetitors: Competitor[]
  results: AnalysisResults
  onUpdate: () => void
}

export function CompetitorManager({
  analysisId,
  autoDetected,
  manualCompetitors,
  results,
  onUpdate,
}: CompetitorManagerProps) {
  const allCompetitors = manualCompetitors.filter((c) => c.is_confirmed)
  const unconfirmedAuto = autoDetected.filter(
    (auto) => !allCompetitors.some((manual) => manual.domain === auto.domain)
  )

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">경쟁사 관리</h3>
          <p className="text-sm text-gray-600">
            자동 감지된 경쟁사를 확인하거나 직접 추가할 수 있습니다
          </p>
        </div>

        <Tabs defaultValue="auto" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="auto">
              자동 감지
              {unconfirmedAuto.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {unconfirmedAuto.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="manual">
              수동 입력
              {manualCompetitors.filter((c) => c.detection_method === 'manual')
                .length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {
                    manualCompetitors.filter((c) => c.detection_method === 'manual')
                      .length
                  }
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">
              전체 보기
              <Badge variant="default" className="ml-2 h-5 px-1.5">
                {allCompetitors.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto" className="mt-4">
            <AutoDetectedList
              competitors={unconfirmedAuto}
              analysisId={analysisId}
              results={results}
              onConfirm={onUpdate}
            />
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <ManualInput
              analysisId={analysisId}
              existingCompetitors={manualCompetitors}
              onAdd={onUpdate}
            />
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <AllCompetitorsView competitors={allCompetitors} />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  )
}

/**
 * 전체 경쟁사 보기
 */
function AllCompetitorsView({ competitors }: { competitors: Competitor[] }) {
  const sortedCompetitors = [...competitors].sort(
    (a, b) => b.citation_count - a.citation_count
  )

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        확인된 모든 경쟁사 목록입니다 ({competitors.length}개)
      </p>

      {sortedCompetitors.map((comp, index) => (
        <Card key={comp.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-medium text-gray-400">
                  #{index + 1}
                </span>
                <span className="font-semibold">{comp.domain}</span>
                {comp.brand_name && (
                  <span className="text-sm text-gray-500">({comp.brand_name})</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{comp.citation_count}회 인용</span>
                {comp.citation_rate !== null && (
                  <>
                    <span>·</span>
                    <span>인용률 {comp.citation_rate}%</span>
                  </>
                )}
                <span>·</span>
                <Badge variant="outline" className="text-xs">
                  {comp.detection_method === 'auto' ? '자동 감지' : '수동 추가'}
                </Badge>
              </div>
            </div>

            {comp.confidence_score !== null && (
              <Badge
                variant={
                  comp.confidence_score > 0.7
                    ? 'default'
                    : comp.confidence_score > 0.5
                      ? 'secondary'
                      : 'outline'
                }
                className={
                  comp.confidence_score > 0.7
                    ? 'bg-green-500 text-white'
                    : comp.confidence_score > 0.5
                      ? 'bg-yellow-500 text-white'
                      : ''
                }
              >
                신뢰도 {(comp.confidence_score * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        </Card>
      ))}

      {competitors.length === 0 && (
        <Card className="p-8 text-center text-gray-500">
          등록된 경쟁사가 없습니다
        </Card>
      )}
    </div>
  )
}
