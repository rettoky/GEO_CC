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
 * LLM별 브랜드 컬러 매핑 (Tailwind config 참조)
 */
const LLM_STYLES: Record<string, { border: string; text: string; bg: string; icon: string }> = {
  Perplexity: {
    border: 'border-perplexity',
    text: 'text-perplexity',
    bg: 'bg-perplexity/10',
    icon: 'text-perplexity',
  },
  ChatGPT: {
    border: 'border-chatgpt',
    text: 'text-chatgpt',
    bg: 'bg-chatgpt/10',
    icon: 'text-chatgpt',
  },
  Gemini: {
    border: 'border-gemini',
    text: 'text-gemini',
    bg: 'bg-gemini/10',
    icon: 'text-gemini',
  },
  Claude: {
    border: 'border-claude',
    text: 'text-claude',
    bg: 'bg-claude/10',
    icon: 'text-claude',
  },
}

/**
 * LLM 결과 카드 컴포넌트 (접기/펼치기 가능)
 */
export function LLMResultCard({ llmName, result, targetDomain }: LLMResultCardProps) {
  const styles = LLM_STYLES[llmName] || {
    border: 'border-gray-300',
    text: 'text-gray-700',
    bg: 'bg-gray-100',
    icon: 'text-gray-500',
  }

  if (!result) {
    return (
      <Card className="opacity-60 border-l-4 border-l-gray-300 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-gray-100`}>
              <XCircle className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <span className="font-bold text-lg text-gray-600">{llmName}</span>
              <p className="text-sm text-muted-foreground">응답 없음</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-gray-200 text-gray-600">No Data</Badge>
        </div>
      </Card>
    )
  }

  if (!result.success) {
    return (
      <Card className="border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-shadow bg-destructive/5">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <span className="font-bold text-lg text-destructive">{llmName}</span>
              <p className="text-sm text-destructive/80">{result.error || '알 수 없는 에러'}</p>
            </div>
          </div>
          <Badge variant="destructive">Error</Badge>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden border-l-4 ${styles.border} shadow-sm hover:shadow-md transition-all duration-200`}>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1" className="border-none">
          <AccordionTrigger className="px-5 py-4 hover:no-underline group">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${styles.bg}`}>
                  <CheckCircle2 className={`h-5 w-5 ${styles.icon}`} />
                </div>
                <div className="text-left">
                  <span className={`font-bold text-lg ${styles.text}`}>{llmName}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(result.responseTime / 1000).toFixed(1)}s
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {result.model}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`${styles.bg} ${styles.text} border-none font-medium px-3 py-1`}>
                  {result.citations.length}개 인용
                </Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-5 pb-5 pt-0">
            <div className="space-y-5">
              <div className="h-px bg-border/50 w-full" />

              {/* 답변 */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <span className={`w-1 h-4 rounded-full ${styles.bg.replace('/10', '')}`} />
                  답변 요약
                </h4>
                <div className="rounded-xl bg-muted/50 p-4 text-sm text-foreground/90 leading-relaxed max-h-60 overflow-y-auto border border-border/50">
                  {result.answer}
                </div>
              </div>

              {/* 인용 목록 */}
              {result.citations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                    <span className={`w-1 h-4 rounded-full ${styles.bg.replace('/10', '')}`} />
                    인용 출처 ({result.citations.length})
                  </h4>
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
