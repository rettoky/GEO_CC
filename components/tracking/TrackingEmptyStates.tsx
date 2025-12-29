'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Folder, TrendingUp } from 'lucide-react'

/**
 * 섹션 미선택 상태
 */
export function NoSectionSelected() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Folder className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">트래킹 섹션을 선택하세요</h3>
        <p className="text-muted-foreground text-center max-w-md">
          좌측 사이드바에서 트래킹할 섹션을 선택하세요.
          <br />
          섹션이 없다면 새 분석 탭에서 섹션을 먼저 생성하세요.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * 데이터 없음 상태
 */
export function NoTrackingData({ sectionName }: { sectionName?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {sectionName ? `"${sectionName}" 섹션` : '선택한 섹션'}에 분석 데이터가 없습니다
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          새 분석 탭에서 이 섹션을 선택하고 분석을 실행하세요.
          <br />
          분석 결과가 여기에 추적됩니다.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * 에러 상태
 */
export function TrackingError({ error }: { error: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive text-center">{error}</p>
      </CardContent>
    </Card>
  )
}
