/**
 * Web Report Component
 * 종합 보고서 웹 뷰
 */

'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import type { ComprehensiveReport } from '@/lib/reports/report-generator'
import { VisualizationDashboard } from '@/components/visualizations/VisualizationDashboard'
import type { AnalysisResults } from '@/types'
import type { Competitor } from '@/types/competitors'
import { formatDateTime } from '@/lib/utils/format'

interface WebReportProps {
  report: ComprehensiveReport
  results: AnalysisResults
  competitors: Competitor[]
}

export function WebReport({ report, results, competitors }: WebReportProps) {
  const { summary, llmAnalyses, competitorComparisons, crawlInsights, recommendations } =
    report

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">종합 분석 보고서</h1>
        </div>
        <p className="text-gray-600">
          생성일시: {formatDateTime(report.generatedAt)}
        </p>
        <p className="text-gray-600">검색어: {report.query}</p>
        {report.myDomain && (
          <p className="text-gray-600">분석 대상: {report.myDomain}</p>
        )}
      </div>

      {/* 요약 섹션 */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          핵심 요약
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">총 인용 횟수</div>
            <div className="text-3xl font-bold text-blue-600">
              {summary.totalCitations}
            </div>
          </div>

          {summary.myDomainRank && (
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">내 도메인 순위</div>
              <div className="text-3xl font-bold text-green-600">
                #{summary.myDomainRank}
              </div>
            </div>
          )}

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">전체 도메인 수</div>
            <div className="text-3xl font-bold text-purple-600">
              {summary.totalDomains}
            </div>
          </div>

          {summary.avgPosition && (
            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">평균 인용 순위</div>
              <div className="text-3xl font-bold text-amber-600">
                {summary.avgPosition.toFixed(1)}
              </div>
            </div>
          )}
        </div>

        {/* LLM 커버리지 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">LLM별 인용 현황</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summary.llmCoverage.map((llm) => (
              <div
                key={llm.llm}
                className="p-3 border rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{llm.llm}</div>
                  <div className="text-sm text-gray-600">
                    {llm.citationCount}회
                  </div>
                </div>
                {llm.cited ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* LLM별 상세 분석 */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">LLM별 상세 분석</h2>
        <div className="space-y-6">
          {llmAnalyses.map((analysis) => (
            <div key={analysis.llm} className="border-b last:border-0 pb-6 last:pb-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{analysis.llm}</h3>
                <div className="flex items-center gap-2">
                  {analysis.cited ? (
                    <Badge className="bg-green-500">인용됨</Badge>
                  ) : (
                    <Badge variant="secondary">미인용</Badge>
                  )}
                  <span className="text-sm text-gray-600">
                    {analysis.citationCount}회
                  </span>
                </div>
              </div>

              {analysis.avgPosition && (
                <div className="text-sm text-gray-600 mb-3">
                  평균 순위: {analysis.avgPosition.toFixed(1)}위
                </div>
              )}

              {analysis.citations.length > 0 ? (
                <div className="space-y-2">
                  {analysis.citations.map((citation, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded">
                      <div className="flex items-start gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          #{citation.position}
                        </Badge>
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {citation.domain}
                        </a>
                      </div>
                      {citation.snippet && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {citation.snippet}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">인용 데이터가 없습니다.</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 경쟁사 비교 */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">경쟁사 비교</h2>
        <div className="space-y-4">
          {competitorComparisons.map((comp) => (
            <div
              key={comp.domain}
              className={`p-4 border rounded-lg ${
                comp.isMyDomain ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-400">
                    #{comp.rank}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {comp.brandName || comp.domain}
                    </div>
                    {comp.brandName && (
                      <div className="text-sm text-gray-600">{comp.domain}</div>
                    )}
                  </div>
                  {comp.isMyDomain && (
                    <Badge className="bg-blue-500">내 도메인</Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{comp.citationCount}회</div>
                  <div className="text-sm text-gray-600">
                    {comp.citationRate.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {comp.llmBreakdown.map((llm) => (
                  <div key={llm.llm} className="text-center p-2 bg-white rounded">
                    <div className="text-xs text-gray-600">{llm.llm}</div>
                    <div className="font-semibold">{llm.citations}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 시각화 */}
      <VisualizationDashboard
        results={results}
        myDomain={report.myDomain}
        competitors={competitors}
      />

      {/* 크롤링 인사이트 */}
      {crawlInsights && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">페이지 구조 분석</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">전체 페이지</div>
              <div className="text-2xl font-bold">{crawlInsights.totalPages}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">성공한 크롤링</div>
              <div className="text-2xl font-bold text-green-600">
                {crawlInsights.successfulCrawls}
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">평균 로딩 시간</div>
              <div className="text-2xl font-bold text-blue-600">
                {crawlInsights.avgLoadTime}ms
              </div>
            </div>
          </div>

          {crawlInsights.structureIssues.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                발견된 구조적 문제
              </h3>
              <ul className="space-y-1">
                {crawlInsights.structureIssues.map((issue, idx) => (
                  <li key={idx} className="text-sm text-gray-700">
                    • {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* 개선 권장사항 */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">개선 권장사항</h2>
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className={`p-4 border rounded-lg ${
                rec.priority === 'high'
                  ? 'border-red-200 bg-red-50'
                  : rec.priority === 'medium'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <Badge
                  className={
                    rec.priority === 'high'
                      ? 'bg-red-500'
                      : rec.priority === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                  }
                >
                  {rec.priority === 'high'
                    ? '높음'
                    : rec.priority === 'medium'
                      ? '중간'
                      : '낮음'}
                </Badge>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-600 uppercase">
                      {rec.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{rec.title}</h3>
                  <p className="text-sm text-gray-700 mb-3">{rec.description}</p>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">실행 항목:</div>
                    <ul className="space-y-1">
                      {rec.actionItems.map((item, itemIdx) => (
                        <li key={itemIdx} className="text-sm text-gray-700">
                          {itemIdx + 1}. {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
