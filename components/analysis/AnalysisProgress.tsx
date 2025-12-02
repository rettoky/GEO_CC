'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface AnalysisLog {
  timestamp: Date
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
  llm?: string
}

interface AnalysisProgressProps {
  isLoading: boolean
  logs: AnalysisLog[]
  progress: number
}

const LOG_ICONS = {
  info: <Clock className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  warning: <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />,
}

const LOG_COLORS = {
  info: 'text-blue-700 bg-blue-50',
  success: 'text-green-700 bg-green-50',
  error: 'text-red-700 bg-red-50',
  warning: 'text-yellow-700 bg-yellow-50',
}

/**
 * 분석 진행률 및 로그 표시 컴포넌트
 */
export function AnalysisProgress({ isLoading, logs, progress }: AnalysisProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress)
    }, 100)
    return () => clearTimeout(timer)
  }, [progress])

  if (!isLoading && logs.length === 0) {
    return null
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
            <span>분석 진행 상황</span>
          </div>
          <Badge variant={isLoading ? 'default' : 'secondary'}>
            {isLoading ? '진행 중' : '완료'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 진행률 바 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">진행률</span>
            <span className="font-semibold">{displayProgress}%</span>
          </div>
          <Progress value={displayProgress} className="h-2" />
        </div>

        {/* 로그 */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">작업 로그</h4>
          <ScrollArea className="h-48 w-full rounded-md border p-2">
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 rounded-md p-2 text-xs ${
                    LOG_COLORS[log.type]
                  }`}
                >
                  <div className="mt-0.5">{LOG_ICONS[log.type]}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {log.timestamp.toLocaleTimeString('ko-KR')}
                      </span>
                      {log.llm && (
                        <Badge variant="outline" className="text-xs">
                          {log.llm}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
