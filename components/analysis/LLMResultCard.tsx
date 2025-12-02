import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { CheckCircle2, XCircle, Clock, FileText } from 'lucide-react'
import type { LLMResult } from '@/types'
import { CitationList } from './CitationList'

interface LLMResultCardProps {
  llmName: string
  result: LLMResult | null
  targetDomain?: string
}

/**
 * LLM별 색상 매핑
 */
const LLM_COLORS: Record<string, string> = {
  Perplexity: 'bg-purple-100 text-purple-700 border-purple-300',
  ChatGPT: 'bg-green-100 text-green-700 border-green-300',
  Gemini: 'bg-blue-100 text-blue-700 border-blue-300',
  Claude: 'bg-orange-100 text-orange-700 border-orange-300',
}

/**
 * LLM 결과 카드 컴포넌트 (접기/펼치기 가능)
 */
export function LLMResultCard({ llmName, result, targetDomain }: LLMResultCardProps) {
  const colorClass = LLM_COLORS[llmName] || 'bg-gray-100 text-gray-700 border-gray-300'

  if (!result) {
    return (
      <Card className="opacity-50 border-2">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="font-semibold">{llmName}</span>
            </div>
            <Badge variant="destructive">응답 없음</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            응답을 받지 못했습니다
          </p>
        </div>
      </Card>
    )
  }

  if (!result.success) {
    return (
      <Card className="border-red-200 border-2">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="font-semibold">{llmName}</span>
            </div>
            <Badge variant="destructive">에러</Badge>
          </div>
          <p className="text-sm text-red-600 mt-2">
            {result.error || '알 수 없는 에러'}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`border-2 ${colorClass.split(' ')[2]}`}>
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1" className="border-none">
          <AccordionTrigger className="px-4 pt-4 pb-2 hover:no-underline">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-semibold">{llmName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={colorClass.split(' ').slice(0, 2).join(' ')}>
                  {result.citations.length}개 인용
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {(result.responseTime / 1000).toFixed(1)}s
                </Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              {/* 메타 정보 */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{result.model}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{(result.responseTime / 1000).toFixed(2)}초</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{result.citations.length}개 인용</span>
                </div>
              </div>

              {/* 답변 */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">답변</h4>
                <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700 max-h-48 overflow-y-auto">
                  {result.answer}
                </div>
              </div>

              {/* 인용 목록 */}
              {result.citations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">인용 ({result.citations.length})</h4>
                  <CitationList citations={result.citations} targetDomain={targetDomain} />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}
