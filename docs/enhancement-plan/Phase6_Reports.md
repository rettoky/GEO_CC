# Phase 6: 보고서 생성 (웹 + PDF)

**기간**: 3주차 후반 - 4주차
**상태**: 📋 계획 완료
**의존성**: Phase 1-5 완료 필요

## 목표

종합 분석 보고서를 웹 대시보드와 PDF 두 가지 형식으로 제공합니다.

## 보고서 구조

### 1. 요약 (Executive Summary)
- 총 쿼리 수, 평균 인용률
- 등급 (A/B/C/D)
- 핵심 인사이트 3-5개

### 2. 쿼리 분석 (Query Analysis)
- 기본 쿼리 + 생성된 변형 목록
- 각 변형별 결과 요약

### 3. 인용 분석 (Citation Analysis)
- 내 인용률 vs 경쟁사 평균
- LLM별 상세 분석

### 4. 경쟁사 비교 (Competitor Comparison)
- 경쟁사 순위
- Gap 분석
- 강점/약점

### 5. 페이지 구조 인사이트 (Page Structure Insights)
- 내 페이지 vs 경쟁사 페이지
- 구조적 차이점

### 6. 개선 제안 (Recommendations)
- 우선순위별 제안 (High/Medium/Low)
- 기대 효과 및 난이도

## 보고서 빌더

### 파일: `lib/reports/report-builder.ts`

```typescript
import type { Analysis, Competitor, PageCrawl, QueryVariation } from '@/types'

export interface ReportData {
  analysis: Analysis
  variations: QueryVariation[]
  competitors: Competitor[]
  pageCrawls: PageCrawl[]
}

/**
 * 종합 보고서 생성
 */
export async function buildReport(analysisId: string) {
  // 1. 데이터 수집
  const analysis = await getAnalysisById(analysisId)
  const variations = await getQueryVariationsByAnalysis(analysisId)
  const competitors = await getCompetitorsByAnalysis(analysisId)
  const pageCrawls = await getPageCrawlsByAnalysis(analysisId)

  // 2. 요약 섹션 생성
  const executiveSummary = generateExecutiveSummary({
    analysis,
    variations,
    competitors
  })

  // 3. 각 섹션 생성
  const queryAnalysis = generateQueryAnalysisSection({ analysis, variations })
  const citationAnalysis = generateCitationAnalysisSection({ analysis, competitors })
  const competitorComparison = generateCompetitorComparisonSection({ competitors })
  const pageInsights = generatePageInsightsSection({ pageCrawls, competitors })
  const recommendations = generateRecommendations({
    analysis,
    competitors,
    pageCrawls
  })

  // 4. 보고서 데이터 통합
  const reportWebData = {
    executiveSummary,
    queryAnalysis,
    citationAnalysis,
    competitorComparison,
    pageInsights,
    recommendations
  }

  // 5. DB 저장
  const report = await createReport({
    analysis_id: analysisId,
    report_type: 'comprehensive',
    web_data: reportWebData
  })

  return report
}

function generateExecutiveSummary({ analysis, variations, competitors }) {
  const metrics = analysis.citation_metrics || {}

  // 등급 계산
  const gradeRating = calculateGrade(metrics.myCitationRate)

  // 핵심 인사이트
  const keyInsights = [
    `전체 ${variations.length + 1}개 쿼리 분석 완료`,
    `평균 인용률: ${metrics.myCitationRate?.toFixed(1)}%`,
    `상위 경쟁사 대비 ${(metrics.avgCompetitorRate - metrics.myCitationRate).toFixed(1)}%p 낮음`
  ]

  return {
    totalQueries: variations.length + 1,
    avgCitationRate: metrics.myCitationRate || 0,
    topCompetitor: competitors[0]?.domain || null,
    gradeRating,
    keyInsights
  }
}

function calculateGrade(citationRate: number): 'A' | 'B' | 'C' | 'D' {
  if (citationRate >= 30) return 'A'
  if (citationRate >= 20) return 'B'
  if (citationRate >= 10) return 'C'
  return 'D'
}
```

## PDF 생성 (Vercel + Playwright)

### 파일: `app/api/generate-pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright-core'
import chromiumBin from '@sparticuz/chromium-min'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60 // Vercel Pro/Enterprise 필요

export async function POST(req: NextRequest) {
  const { reportId } = await req.json()

  if (!reportId) {
    return NextResponse.json({ error: 'reportId required' }, { status: 400 })
  }

  try {
    // 1. 보고서 웹 페이지 URL
    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reports/${reportId}?print=true`

    // 2. Chromium 실행
    const browser = await chromium.launch({
      args: chromiumBin.args,
      executablePath: await chromiumBin.executablePath(),
      headless: true
    })

    const page = await browser.newPage()

    // 3. 페이지 로드 (차트 렌더링 대기)
    await page.goto(reportUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // 추가 대기 (차트 애니메이션)
    await page.waitForTimeout(2000)

    // 4. PDF 생성
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;">
        GEO Analyzer 분석 보고서
      </div>`,
      footerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>`
    })

    await browser.close()

    // 5. Supabase Storage 업로드
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role 필요
    )

    const fileName = `reports/${reportId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw uploadError

    // 6. Public URL 생성
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName)

    // 7. reports 테이블 업데이트
    await supabase
      .from('reports')
      .update({
        pdf_url: urlData.publicUrl,
        pdf_status: 'completed',
        generated_at: new Date().toISOString()
      })
      .eq('id', reportId)

    return NextResponse.json({
      success: true,
      pdfUrl: urlData.publicUrl
    })

  } catch (error) {
    console.error('PDF generation failed:', error)

    // 에러 상태 업데이트
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase
      .from('reports')
      .update({
        pdf_status: 'failed',
        pdf_error: error.message
      })
      .eq('id', reportId)

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

## 웹 보고서 페이지

### 파일: `app/reports/[id]/page.tsx`

```typescript
import { getReportByAnalysis } from '@/lib/supabase/queries/reports'
import { ExecutiveSummary } from '@/components/reports/ExecutiveSummary'
import { QueryAnalysisSection } from '@/components/reports/QueryAnalysisSection'
import { CitationSection } from '@/components/reports/CitationSection'
import { CompetitorSection } from '@/components/reports/CompetitorSection'
import { PageInsightsSection } from '@/components/reports/PageInsightsSection'
import { RecommendationsSection } from '@/components/reports/RecommendationsSection'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default async function ReportPage({ params }: { params: { id: string } }) {
  const report = await getReportByAnalysis(params.id)

  if (!report) {
    return <div>보고서를 찾을 수 없습니다</div>
  }

  const { web_data } = report

  const handleDownloadPDF = async () => {
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: report.id })
    })

    const data = await response.json()

    if (data.pdfUrl) {
      window.open(data.pdfUrl, '_blank')
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">분석 보고서</h1>

        <Button onClick={handleDownloadPDF}>
          <Download className="mr-2 h-4 w-4" />
          PDF 다운로드
        </Button>
      </div>

      {/* 보고서 섹션들 */}
      <div className="space-y-8 print:space-y-4">
        <ExecutiveSummary data={web_data.executiveSummary} />
        <QueryAnalysisSection data={web_data.queryAnalysis} />
        <CitationSection data={web_data.citationAnalysis} />
        <CompetitorSection data={web_data.competitorComparison} />
        <PageInsightsSection data={web_data.pageInsights} />
        <RecommendationsSection data={web_data.recommendations} />
      </div>
    </div>
  )
}
```

## 패키지 설치

```bash
npm install playwright-core @sparticuz/chromium-min
```

## 체크리스트

- [ ] `lib/reports/report-builder.ts` 생성
- [ ] `app/api/generate-pdf/route.ts` 생성
- [ ] `app/reports/[id]/page.tsx` 생성
- [ ] 6개 보고서 섹션 컴포넌트 생성
- [ ] Playwright 패키지 설치
- [ ] PDF 생성 테스트 (로컬)
- [ ] Supabase Storage bucket 생성
- [ ] Vercel 배포 및 PDF 생성 테스트

## 다음 단계

Phase 6 완료 후 → **Phase 7: 한국어 & UX**

---

**예상 소요 시간**: 4-5일
**난이도**: ⭐⭐⭐⭐ (매우 높음 - PDF 생성)
