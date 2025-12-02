import { ExternalLink } from 'lucide-react'
import type { UnifiedCitation } from '@/types'
import { Badge } from '@/components/ui/badge'

interface CitationListProps {
  citations: UnifiedCitation[]
  targetDomain?: string
}

/**
 * 인용 목록 컴포넌트 (T037)
 */
export function CitationList({ citations, targetDomain }: CitationListProps) {
  if (citations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">인용이 없습니다</p>
    )
  }

  const normalizeTargetDomain = (domain: string) => {
    return domain.toLowerCase().replace(/^www\./, '')
  }

  const isTargetDomain = (domain: string) => {
    if (!targetDomain) return false
    return normalizeTargetDomain(domain) === normalizeTargetDomain(targetDomain)
  }

  return (
    <div className="space-y-3">
      {citations.map((citation) => (
        <div
          key={citation.id}
          className={`rounded-lg border p-3 ${
            isTargetDomain(citation.domain)
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                >
                  {citation.title || citation.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {isTargetDomain(citation.domain) && (
                  <Badge variant="default" className="bg-green-600">
                    내 도메인
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground">{citation.domain}</p>

              {citation.snippet && (
                <p className="text-sm text-gray-700 mt-2">{citation.snippet}</p>
              )}

              <div className="flex items-center gap-4 mt-2">
                {citation.publishedDate && (
                  <span className="text-xs text-muted-foreground">
                    {citation.publishedDate}
                  </span>
                )}

                {citation.mentionCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {citation.mentionCount}회 언급
                  </span>
                )}

                {citation.avgConfidence !== null && (
                  <span className="text-xs text-muted-foreground">
                    신뢰도: {(citation.avgConfidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
