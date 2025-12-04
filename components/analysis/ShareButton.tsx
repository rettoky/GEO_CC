'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Share2, Download, Copy, Check, Link2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { AnalysisResults, AnalysisSummary } from '@/types'

interface ShareButtonProps {
  query: string
  domain?: string
  brand?: string
  results: AnalysisResults
  summary: AnalysisSummary
}

/**
 * 분석 결과 공유/다운로드 버튼
 */
export function ShareButton({
  query,
  domain,
  brand,
  results,
  summary,
}: ShareButtonProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // 결과 요약 텍스트 생성
  const generateSummaryText = () => {
    const lines = [
      `📊 GEO Analyzer 분석 결과`,
      ``,
      `🔍 검색어: ${query}`,
      domain ? `🌐 도메인: ${domain}` : '',
      brand ? `🏷️ 브랜드: ${brand}` : '',
      ``,
      `📈 분석 요약`,
      `• 전체 인용 수: ${summary.totalCitations}`,
      `• 고유 도메인: ${summary.uniqueDomains}`,
      `• 내 도메인 인용: ${summary.myDomainCitationCount}회`,
      `• 브랜드 언급: ${summary.brandMentionCount}회`,
      `• 성공 LLM: ${summary.successfulLLMs.length}/4`,
      ``,
      `🤖 LLM별 결과`,
      results.perplexity?.success ? `• Perplexity: ${results.perplexity.citations.length}개 인용` : '• Perplexity: 실패',
      results.chatgpt?.success ? `• ChatGPT: ${results.chatgpt.citations.length}개 인용` : '• ChatGPT: 실패',
      results.gemini?.success ? `• Gemini: ${results.gemini.citations.length}개 인용` : '• Gemini: 실패',
      results.claude?.success ? `• Claude: ${results.claude.citations.length}개 인용` : '• Claude: 실패',
      ``,
      `🔗 Powered by GEO Analyzer`,
    ].filter(Boolean)

    return lines.join('\n')
  }

  // 클립보드에 복사
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateSummaryText())
      setCopied(true)
      toast({
        title: '복사 완료',
        description: '분석 결과가 클립보드에 복사되었습니다',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: '복사 실패',
        description: '클립보드 접근이 거부되었습니다',
        variant: 'destructive',
      })
    }
  }

  // JSON 다운로드
  const handleDownloadJSON = () => {
    const data = {
      query,
      domain,
      brand,
      timestamp: new Date().toISOString(),
      results,
      summary,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `geo-analysis-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: '다운로드 완료',
      description: 'JSON 파일이 다운로드되었습니다',
    })
  }

  // CSV 다운로드
  const handleDownloadCSV = () => {
    const headers = ['LLM', '상태', '인용 수', '응답 시간(초)', '모델']
    const rows = Object.entries(results).map(([llm, result]) => [
      llm,
      result?.success ? '성공' : '실패',
      result?.citations.length ?? 0,
      result?.responseTime ? (result.responseTime / 1000).toFixed(2) : '-',
      result?.model ?? '-',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `geo-analysis-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: '다운로드 완료',
      description: 'CSV 파일이 다운로드되었습니다',
    })
  }

  // URL 공유 (실제로는 서버에서 공유 링크 생성 필요)
  const handleShareLink = async () => {
    // 현재 URL 복사 (실제 구현시에는 공유 가능한 링크 생성)
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: '링크 복사 완료',
        description: '현재 페이지 링크가 복사되었습니다',
      })
    } catch {
      toast({
        title: '복사 실패',
        description: '링크를 복사할 수 없습니다',
        variant: 'destructive',
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          공유
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          텍스트 복사
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareLink} className="cursor-pointer">
          <Link2 className="h-4 w-4 mr-2" />
          링크 복사
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadJSON} className="cursor-pointer">
          <Download className="h-4 w-4 mr-2" />
          JSON 다운로드
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadCSV} className="cursor-pointer">
          <Download className="h-4 w-4 mr-2" />
          CSV 다운로드
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
