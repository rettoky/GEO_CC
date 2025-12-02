/**
 * Report Actions Component
 * 보고서 다운로드, 저장, 공유 액션
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Save, Share2, Loader2 } from 'lucide-react'
import type { ComprehensiveReport } from '@/lib/reports/report-generator'
import { LABELS, MESSAGES } from '@/lib/constants/labels'

interface ReportActionsProps {
  report: ComprehensiveReport
  onSave?: () => Promise<void>
}

export function ReportActions({ report, onSave }: ReportActionsProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  /**
   * PDF 생성 및 다운로드
   */
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report }),
      })

      if (!response.ok) {
        throw new Error(MESSAGES.ERROR.PDF_GENERATION_FAILED)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `geo-analysis-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('PDF 다운로드 오류:', error)
      alert(MESSAGES.ERROR.PDF_GENERATION_FAILED)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  /**
   * JSON 다운로드
   */
  const handleDownloadJSON = () => {
    const dataStr = JSON.stringify(report, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = window.URL.createObjectURL(dataBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `geo-analysis-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  /**
   * 보고서 저장
   */
  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave()
      alert(MESSAGES.SUCCESS.REPORT_SAVED)
    } catch (error) {
      console.error('저장 오류:', error)
      alert(MESSAGES.ERROR.SAVE_FAILED)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * 공유 링크 복사
   */
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      alert(MESSAGES.SUCCESS.LINK_COPIED)
    } catch (error) {
      console.error('공유 링크 복사 오류:', error)
      alert(MESSAGES.ERROR.LINK_COPY_FAILED)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={handleDownloadPDF}
        disabled={isGeneratingPDF}
        className="flex items-center gap-2"
      >
        {isGeneratingPDF ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {LABELS.REPORT.GENERATING}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            {LABELS.REPORT.DOWNLOAD_PDF}
          </>
        )}
      </Button>

      <Button
        onClick={handleDownloadJSON}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        {LABELS.REPORT.DOWNLOAD_JSON}
      </Button>

      {onSave && (
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="outline"
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {LABELS.STATUS.LOADING}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {LABELS.ACTIONS.SAVE}
            </>
          )}
        </Button>
      )}

      <Button
        onClick={handleShare}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        {LABELS.ACTIONS.SHARE}
      </Button>
    </div>
  )
}
