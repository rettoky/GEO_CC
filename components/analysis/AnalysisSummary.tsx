import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle2, XCircle, BarChart3, Globe, Target, TrendingUp } from 'lucide-react'
import type { AnalysisSummary as AnalysisSummaryType } from '@/types'

interface AnalysisSummaryProps {
  summary: AnalysisSummaryType
}

/**
 * 분석 요약 컴포넌트 (T038)
 */
export function AnalysisSummary({ summary }: AnalysisSummaryProps) {
  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="h-5 w-5" />
          분석 요약
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-1 p-4 rounded-xl bg-background border border-border/50 shadow-sm transition-all hover:shadow-md hover:border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Globe className="h-4 w-4" />
              전체 인용
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground">{summary.totalCitations}</p>
          </div>

          <div className="space-y-1 p-4 rounded-xl bg-background border border-border/50 shadow-sm transition-all hover:shadow-md hover:border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Target className="h-4 w-4" />
              고유 도메인
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground">{summary.uniqueDomains}</p>
          </div>

          <div className="space-y-1 p-4 rounded-xl bg-background border border-border/50 shadow-sm transition-all hover:shadow-md hover:border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Target className="h-4 w-4" />
              내 도메인 인용
            </div>
            <p className="text-3xl font-bold tracking-tight">
              {summary.myDomainCited ? (
                <span className="text-blue-600 dark:text-blue-400">{summary.myDomainCitationCount}</span>
              ) : (
                <span className="text-muted-foreground/50">0</span>
              )}
            </p>
          </div>

          <div className="space-y-1 p-4 rounded-xl bg-background border border-border/50 shadow-sm transition-all hover:shadow-md hover:border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              브랜드 언급
            </div>
            <p className="text-3xl font-bold tracking-tight">
              {summary.brandMentioned ? (
                <span className="text-purple-600 dark:text-purple-400">{summary.brandMentionCount}</span>
              ) : (
                <span className="text-muted-foreground/50">0</span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              평균 응답 시간
            </span>
            <span className="font-medium font-mono">{(summary.avgResponseTime / 1000).toFixed(2)}s</span>
          </div>

          <div className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              성공한 LLM
            </span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(summary.successfulLLMs.length / 4) * 100}%` }}
                />
              </div>
              <span className="font-medium">
                {summary.successfulLLMs.length} / 4
              </span>
            </div>
          </div>

          {summary.failedLLMs.length > 0 && (
            <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-destructive/5 border border-destructive/10">
              <span className="text-destructive flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                실패한 LLM
              </span>
              <span className="font-medium text-destructive">
                {summary.failedLLMs.join(', ')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
