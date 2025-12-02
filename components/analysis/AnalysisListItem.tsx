import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Analysis } from '@/lib/supabase/types'

interface AnalysisListItemProps {
  analysis: Analysis
}

/**
 * 분석 목록 아이템 컴포넌트 (T054)
 */
export function AnalysisListItem({ analysis }: AnalysisListItemProps) {
  const statusColors = {
    pending: 'bg-gray-500',
    processing: 'bg-blue-500',
    completed: 'bg-green-600',
    failed: 'bg-red-600',
  }

  const statusLabels = {
    pending: '대기',
    processing: '처리중',
    completed: '완료',
    failed: '실패',
  }

  return (
    <Link href={`/analysis/${analysis.id}`}>
      <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-lg line-clamp-1">{analysis.query_text}</h3>
                <Badge className={statusColors[analysis.status]}>
                  {statusLabels[analysis.status]}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {analysis.my_domain && <span>도메인: {analysis.my_domain}</span>}
                {analysis.my_brand && <span>브랜드: {analysis.my_brand}</span>}
                <span>{new Date(analysis.created_at).toLocaleString('ko-KR')}</span>
              </div>

              {analysis.summary && (
                <div className="flex items-center gap-4 text-sm">
                  <span>전체 인용: {analysis.summary.totalCitations}</span>
                  <span>
                    성공: {analysis.summary.successfulLLMs.length} / 4 LLM
                  </span>
                  {analysis.summary.myDomainCited && (
                    <Badge variant="default" className="bg-green-600">
                      내 도메인 인용됨
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
