import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalysisSummary as AnalysisSummaryType } from '@/types'

interface AnalysisSummaryProps {
  summary: AnalysisSummaryType
}

/**
 * 분석 요약 컴포넌트 (T038)
 */
export function AnalysisSummary({ summary }: AnalysisSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>분석 요약</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">전체 인용</p>
            <p className="text-2xl font-bold">{summary.totalCitations}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">고유 도메인</p>
            <p className="text-2xl font-bold">{summary.uniqueDomains}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">내 도메인 인용</p>
            <p className="text-2xl font-bold">
              {summary.myDomainCited ? (
                <span className="text-green-600">{summary.myDomainCitationCount}</span>
              ) : (
                <span className="text-gray-400">0</span>
              )}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">브랜드 언급</p>
            <p className="text-2xl font-bold">
              {summary.brandMentioned ? (
                <span className="text-green-600">{summary.brandMentionCount}</span>
              ) : (
                <span className="text-gray-400">0</span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">평균 응답 시간</span>
            <span className="font-medium">{(summary.avgResponseTime / 1000).toFixed(2)}초</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">성공한 LLM</span>
            <span className="font-medium">
              {summary.successfulLLMs.length} / 4
            </span>
          </div>

          {summary.failedLLMs.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">실패한 LLM</span>
              <span className="font-medium text-red-600">
                {summary.failedLLMs.join(', ')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
