import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ChartSkeletonProps {
  title?: boolean
  description?: boolean
  className?: string
}

/**
 * 차트 로딩 스켈레톤 컴포넌트
 * Dynamic import된 차트가 로딩되는 동안 표시
 */
export function ChartSkeleton({
  title = true,
  description = false,
  className
}: ChartSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader>
        {title && <Skeleton className="h-6 w-48 mb-2" />}
        {description && <Skeleton className="h-4 w-64" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* 차트 영역 */}
          <Skeleton className="h-[280px] w-full" />

          {/* 범례 영역 */}
          <div className="flex justify-center gap-4 pt-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 그리드 레이아웃용 차트 스켈레톤
 */
export function ChartGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ChartSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * 대시보드 레이아웃용 차트 스켈레톤
 */
export function DashboardChartSkeleton() {
  return (
    <div className="space-y-6">
      {/* 상단 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartSkeleton className="lg:col-span-2" />
        <ChartSkeleton />
      </div>

      {/* 하단 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  )
}
