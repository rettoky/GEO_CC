'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChartErrorFallbackProps {
  error: Error
  onReset?: () => void
  title?: string
  className?: string
}

/**
 * Chart Error Fallback UI Component
 *
 * 차트 컴포넌트에서 에러가 발생했을 때 표시되는 폴백 UI
 * ErrorBoundary와 함께 사용됩니다.
 */
export function ChartErrorFallback({
  error,
  onReset,
  title = '차트를 불러올 수 없습니다',
  className,
}: ChartErrorFallbackProps) {
  return (
    <Card className={cn('border-destructive/50', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription className="text-destructive/80">
          데이터를 처리하는 중 문제가 발생했습니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 에러 메시지 */}
        <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
          <p className="text-sm text-muted-foreground font-mono break-all">
            {error.message}
          </p>
        </div>

        {/* 다시 시도 버튼 */}
        {onReset && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </Button>
          </div>
        )}

        {/* 도움말 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>문제가 지속되는 경우:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>페이지를 새로고침해 보세요</li>
            <li>데이터 형식이 올바른지 확인해 보세요</li>
            <li>네트워크 연결을 확인해 보세요</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact Chart Error Fallback
 *
 * 공간이 제한된 곳에서 사용할 수 있는 컴팩트한 에러 폴백
 */
export function CompactChartErrorFallback({
  error,
  onReset,
  className,
}: Omit<ChartErrorFallbackProps, 'title'>) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-6 text-center rounded-lg border border-destructive/50 bg-destructive/5',
      className
    )}>
      <AlertCircle className="h-8 w-8 text-destructive mb-3" />
      <div className="text-sm font-medium text-destructive mb-1">
        차트 오류
      </div>
      <div className="text-xs text-muted-foreground mb-4 max-w-md">
        {error.message}
      </div>
      {onReset && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          다시 시도
        </Button>
      )}
    </div>
  )
}
