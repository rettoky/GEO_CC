import { ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { UnifiedCitation } from '@/types'
import { ConfidenceBadge } from './ConfidenceBadge'

interface CitationDetailCardProps {
  citation: UnifiedCitation
  targetDomain?: string
}

/**
 * 상세 인용 카드 컴포넌트 (T046)
 */
export function CitationDetailCard({ citation, targetDomain }: CitationDetailCardProps) {
  const normalizeTargetDomain = (domain: string) => {
    return domain.toLowerCase().replace(/^www\./, '')
  }

  const isTargetDomain = (domain: string) => {
    if (!targetDomain) return false
    return normalizeTargetDomain(domain) === normalizeTargetDomain(targetDomain)
  }

  return (
    <Card className={isTargetDomain(citation.domain) ? 'border-green-500 bg-green-50' : ''}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                {citation.title || citation.url}
                <ExternalLink className="h-4 w-4" />
              </a>
              {isTargetDomain(citation.domain) && (
                <Badge variant="default" className="bg-green-600">
                  내 도메인
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-1">{citation.domain}</p>
          </div>
        </div>

        {citation.snippet && (
          <div className="rounded-md bg-gray-100 p-3">
            <p className="text-sm text-gray-700">{citation.snippet}</p>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
          <span>순서: {citation.position}</span>

          {citation.publishedDate && <span>{citation.publishedDate}</span>}

          {citation.mentionCount > 0 && <span>{citation.mentionCount}회 언급</span>}

          {citation.avgConfidence !== null && (
            <ConfidenceBadge score={citation.avgConfidence} />
          )}
        </div>

        {citation.textSpans.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">텍스트 위치 (OpenAI)</p>
            <div className="space-y-1">
              {citation.textSpans.map((span, index) => (
                <div key={index} className="rounded bg-blue-50 p-2 text-sm">
                  <span className="text-muted-foreground">
                    [{span.start} - {span.end}]
                  </span>{' '}
                  {span.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
