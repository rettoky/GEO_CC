/**
 * Crawl Results Component
 * 크롤링 결과 목록 표시
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { CheckCircle, XCircle, Ban, ExternalLink } from 'lucide-react'
import type { PageCrawl } from '@/types/pageCrawl'

interface CrawlResultsProps {
  crawls: PageCrawl[]
  myDomain?: string
}

export function CrawlResults({ crawls, myDomain }: CrawlResultsProps) {
  const successCount = crawls.filter((c) => c.crawl_status === 'success').length
  const blockedCount = crawls.filter((c) => c.crawl_status === 'blocked_robots')
    .length
  const failedCount = crawls.filter((c) => c.crawl_status === 'failed').length

  // 내 도메인 vs 경쟁사 구분
  const myCrawls = crawls.filter((c) => {
    if (!myDomain) return false
    try {
      return c.domain === myDomain || c.domain.endsWith(`.${myDomain}`)
    } catch {
      return false
    }
  })

  const competitorCrawls = crawls.filter((c) => {
    if (!myDomain) return true
    try {
      return c.domain !== myDomain && !c.domain.endsWith(`.${myDomain}`)
    } catch {
      return true
    }
  })

  return (
    <div className="space-y-6">
      {/* 요약 통계 */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">크롤링 결과 요약</h3>
        <div className="flex gap-4">
          <Badge variant="default" className="bg-green-500">
            성공: {successCount}
          </Badge>
          <Badge variant="default" className="bg-yellow-500">
            차단: {blockedCount}
          </Badge>
          <Badge variant="destructive">실패: {failedCount}</Badge>
        </div>
        {myDomain && (
          <div className="mt-4 text-sm text-gray-600">
            내 페이지: {myCrawls.length}개 | 경쟁사 페이지: {competitorCrawls.length}
            개
          </div>
        )}
      </Card>

      {/* 내 페이지 */}
      {myCrawls.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3">내 페이지</h3>
          <div className="space-y-2">
            {myCrawls.map((crawl) => (
              <CrawlResultCard key={crawl.id} crawl={crawl} isMine />
            ))}
          </div>
        </div>
      )}

      {/* 경쟁사 페이지 */}
      {competitorCrawls.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3">경쟁사 페이지</h3>
          <div className="space-y-2">
            {competitorCrawls.map((crawl) => (
              <CrawlResultCard key={crawl.id} crawl={crawl} />
            ))}
          </div>
        </div>
      )}

      {crawls.length === 0 && (
        <Card className="p-8 text-center text-gray-500">
          크롤링된 페이지가 없습니다
        </Card>
      )}
    </div>
  )
}

/**
 * 개별 크롤링 결과 카드
 */
function CrawlResultCard({
  crawl,
  isMine = false,
}: {
  crawl: PageCrawl
  isMine?: boolean
}) {
  const statusIcon = {
    success: <CheckCircle className="text-green-500 flex-shrink-0" size={20} />,
    blocked_robots: <Ban className="text-yellow-500 flex-shrink-0" size={20} />,
    failed: <XCircle className="text-red-500 flex-shrink-0" size={20} />,
  }

  const statusLabel = {
    success: '성공',
    blocked_robots: 'robots.txt 차단',
    failed: '실패',
  }

  const success = crawl.crawl_status === 'success'

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {statusIcon[crawl.crawl_status]}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={crawl.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 truncate"
            >
              {crawl.domain}
              <ExternalLink size={14} />
            </a>
            {isMine && (
              <Badge variant="default" className="bg-blue-500 text-xs">
                내 페이지
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {statusLabel[crawl.crawl_status]}
            </Badge>
          </div>

          <p className="text-xs text-gray-500 truncate">{crawl.url}</p>

          {/* 성공 시 상세 정보 */}
          {success && crawl.meta_tags && (
            <Accordion type="single" collapsible className="mt-3">
              <AccordionItem value="details" className="border-none">
                <AccordionTrigger className="text-xs py-2">
                  상세 정보 보기
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-xs">
                    {/* 메타 태그 */}
                    {crawl.meta_tags.title && (
                      <div>
                        <span className="font-medium text-gray-700">Title:</span>
                        <p className="mt-1 text-gray-600">
                          {crawl.meta_tags.title}
                        </p>
                      </div>
                    )}
                    {crawl.meta_tags.description && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Description:
                        </span>
                        <p className="mt-1 text-gray-600">
                          {crawl.meta_tags.description}
                        </p>
                      </div>
                    )}

                    {/* 콘텐츠 구조 */}
                    {crawl.content_structure && (
                      <div>
                        <span className="font-medium text-gray-700">
                          콘텐츠 구조:
                        </span>
                        <div className="mt-1 grid grid-cols-2 gap-2 text-gray-600">
                          <div>단어 수: {crawl.content_structure.wordCount}</div>
                          <div>이미지: {crawl.content_structure.imageCount}</div>
                          <div>
                            문단 수: {crawl.content_structure.paragraphCount}
                          </div>
                          <div>링크: {crawl.content_structure.linkCount}</div>
                        </div>
                      </div>
                    )}

                    {/* Headings */}
                    {crawl.content_structure?.headings && (
                      <div>
                        <span className="font-medium text-gray-700">
                          제목 구조:
                        </span>
                        <div className="mt-1 text-gray-600">
                          H1: {crawl.content_structure.headings.h1?.length || 0} |
                          H2: {crawl.content_structure.headings.h2?.length || 0} |
                          H3: {crawl.content_structure.headings.h3?.length || 0}
                        </div>
                      </div>
                    )}

                    {/* Schema 마크업 */}
                    {crawl.schema_markup && crawl.schema_markup.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Schema.org:
                        </span>
                        <p className="mt-1 text-gray-600">
                          {crawl.schema_markup.length}개 스키마 발견
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* 실패 시 에러 메시지 */}
          {!success && crawl.error_message && (
            <p className="text-xs text-red-600 mt-2">{crawl.error_message}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
