/**
 * Crawl Progress Component
 * 페이지 크롤링 진행률 표시
 */

'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'
import type { CrawlProgress } from '@/lib/crawler/page-crawler'

interface CrawlProgressProps {
  progress: CrawlProgress
}

export function CrawlProgressTracker({ progress }: CrawlProgressProps) {
  const stageLabels = {
    extracting: 'URL 추출 중',
    checking_robots: 'robots.txt 확인 중',
    crawling: '페이지 크롤링 중',
    completed: '크롤링 완료',
  }

  const isCompleted = progress.stage === 'completed'

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {!isCompleted && (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          )}
          <div>
            <h3 className="font-semibold text-lg">
              {isCompleted ? '✓ 페이지 크롤링 완료' : '페이지 크롤링 진행 중'}
            </h3>
            <p className="text-sm text-gray-600">{stageLabels[progress.stage]}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">진행 상황</span>
            <span className="font-medium">
              {progress.current} / {progress.total} 페이지
            </span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          <div className="text-xs text-gray-500 text-right">
            {Math.round(progress.percentage)}%
          </div>
        </div>

        {isCompleted && (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded font-medium">
            {progress.total}개 페이지 크롤링이 완료되었습니다!
          </div>
        )}
      </div>
    </Card>
  )
}
