import { FileQuestion } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

/**
 * 빈 상태 컴포넌트 (T055)
 */
export function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <FileQuestion className="h-16 w-16 text-gray-300" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">분석 이력이 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            첫 분석을 시작해보세요
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
