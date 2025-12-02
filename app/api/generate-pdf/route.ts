/**
 * PDF Generation API Route
 * 보고서를 PDF로 변환
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ComprehensiveReport } from '@/lib/reports/report-generator'
import { MESSAGES } from '@/lib/constants/labels'

export const runtime = 'nodejs' // Playwright 사용을 위해 Node.js runtime 필요

/**
 * PDF 생성 요청 처리
 *
 * 구현 방법:
 * 1. Playwright + @sparticuz/chromium-min (추천)
 *    - 고품질 PDF, 완전한 CSS 지원
 *    - 패키지: npm install playwright-core @sparticuz/chromium-min
 *
 * 2. jsPDF (대안)
 *    - 가벼움, 클라이언트 사이드 가능
 *    - 복잡한 레이아웃 제한
 */
export async function POST(request: NextRequest) {
  try {
    const { report } = await request.json() as { report: ComprehensiveReport }

    if (!report) {
      return NextResponse.json(
        { error: MESSAGES.ERROR.NO_DATA },
        { status: 400 }
      )
    }

    // TODO: Playwright를 사용한 실제 PDF 생성 구현
    // 현재는 HTML 템플릿을 반환하도록 구현
    // 실제 구현 시 아래 주석 코드 참고:

    /*
    import playwright from 'playwright-core'
    import chromium from '@sparticuz/chromium-min'

    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    })

    await browser.close()

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="geo-analysis.pdf"',
      },
    })
    */

    // 임시 구현: HTML 템플릿 생성
    const htmlTemplate = generatePDFTemplate(report)

    // 개발 단계에서는 HTML을 반환
    // 실제 배포 시에는 위 주석의 Playwright 코드로 대체
    return new NextResponse(htmlTemplate, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'inline',
      },
    })
  } catch (error) {
    console.error('PDF 생성 오류:', error)
    return NextResponse.json(
      { error: MESSAGES.ERROR.PDF_GENERATION_FAILED },
      { status: 500 }
    )
  }
}

/**
 * PDF용 HTML 템플릿 생성
 */
function generatePDFTemplate(report: ComprehensiveReport): string {
  const { summary, llmAnalyses, competitorComparisons, crawlInsights, recommendations } = report

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GEO 분석 보고서</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      font-size: 32px;
      margin-bottom: 10px;
      color: #1e40af;
    }
    h2 {
      font-size: 24px;
      margin-top: 40px;
      margin-bottom: 20px;
      color: #1e40af;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 10px;
    }
    h3 {
      font-size: 18px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .header {
      margin-bottom: 40px;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 20px;
    }
    .meta {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .summary-card {
      padding: 20px;
      border-radius: 8px;
      background: #f3f4f6;
    }
    .summary-card .label {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
    .summary-card .value {
      font-size: 28px;
      font-weight: bold;
      color: #1e40af;
    }
    .llm-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .llm-card {
      padding: 15px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .llm-card.cited {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .llm-card.not-cited {
      background: #fef2f2;
      border-color: #fca5a5;
    }
    .competitor-item {
      padding: 15px;
      margin: 10px 0;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .competitor-item.my-domain {
      background: #eff6ff;
      border-color: #3b82f6;
    }
    .competitor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .rank {
      font-size: 24px;
      font-weight: bold;
      color: #9ca3af;
    }
    .domain {
      font-size: 18px;
      font-weight: 600;
    }
    .stats {
      font-size: 20px;
      font-weight: bold;
    }
    .recommendation {
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      border-left: 4px solid;
    }
    .recommendation.high {
      background: #fef2f2;
      border-color: #ef4444;
    }
    .recommendation.medium {
      background: #fffbeb;
      border-color: #f59e0b;
    }
    .recommendation.low {
      background: #eff6ff;
      border-color: #3b82f6;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 10px;
    }
    .badge.high { background: #ef4444; color: white; }
    .badge.medium { background: #f59e0b; color: white; }
    .badge.low { background: #3b82f6; color: white; }
    .action-items {
      margin-top: 10px;
      padding-left: 20px;
    }
    .action-items li {
      margin: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
    @media print {
      body {
        padding: 20px;
      }
      .summary-grid {
        break-inside: avoid;
      }
      .recommendation {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>GEO 분석 종합 보고서</h1>
    <div class="meta">생성일시: ${new Date(report.generatedAt).toLocaleString('ko-KR')}</div>
    <div class="meta">검색어: ${report.query}</div>
    ${report.myDomain ? `<div class="meta">분석 대상: ${report.myDomain}</div>` : ''}
  </div>

  <h2>핵심 요약</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">총 인용 횟수</div>
      <div class="value">${summary.totalCitations}</div>
    </div>
    ${summary.myDomainRank ? `
    <div class="summary-card">
      <div class="label">내 도메인 순위</div>
      <div class="value">#${summary.myDomainRank}</div>
    </div>
    ` : ''}
    <div class="summary-card">
      <div class="label">전체 도메인 수</div>
      <div class="value">${summary.totalDomains}</div>
    </div>
    ${summary.avgPosition ? `
    <div class="summary-card">
      <div class="label">평균 인용 순위</div>
      <div class="value">${summary.avgPosition.toFixed(1)}</div>
    </div>
    ` : ''}
  </div>

  <h3>LLM별 인용 현황</h3>
  <div class="llm-grid">
    ${summary.llmCoverage.map(llm => `
      <div class="llm-card ${llm.cited ? 'cited' : 'not-cited'}">
        <strong>${llm.llm}</strong><br>
        ${llm.citationCount}회 인용 ${llm.cited ? '✓' : '✗'}
      </div>
    `).join('')}
  </div>

  <h2>LLM별 상세 분석</h2>
  ${llmAnalyses.map(analysis => `
    <div style="margin-bottom: 30px;">
      <h3>${analysis.llm} ${analysis.cited ? '✓' : '✗'}</h3>
      ${analysis.avgPosition ? `<p>평균 순위: ${analysis.avgPosition.toFixed(1)}위</p>` : ''}
      ${analysis.citations.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>도메인</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            ${analysis.citations.map(citation => `
              <tr>
                <td>#${citation.position}</td>
                <td>${citation.domain}</td>
                <td style="font-size: 12px;">${citation.url}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p>인용 데이터가 없습니다.</p>'}
    </div>
  `).join('')}

  <h2>경쟁사 비교</h2>
  ${competitorComparisons.map(comp => `
    <div class="competitor-item ${comp.isMyDomain ? 'my-domain' : ''}">
      <div class="competitor-header">
        <div>
          <span class="rank">#${comp.rank}</span>
          <span class="domain">${comp.brandName || comp.domain}</span>
          ${comp.isMyDomain ? '<span class="badge low">내 도메인</span>' : ''}
        </div>
        <div class="stats">
          ${comp.citationCount}회 (${comp.citationRate.toFixed(1)}%)
        </div>
      </div>
      <div style="font-size: 14px; color: #666;">
        ${comp.llmBreakdown.map(llm => `${llm.llm}: ${llm.citations}회`).join(' | ')}
      </div>
    </div>
  `).join('')}

  ${crawlInsights ? `
    <h2>페이지 구조 분석</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">전체 페이지</div>
        <div class="value">${crawlInsights.totalPages}</div>
      </div>
      <div class="summary-card">
        <div class="label">성공한 크롤링</div>
        <div class="value">${crawlInsights.successfulCrawls}</div>
      </div>
      <div class="summary-card">
        <div class="label">평균 로딩 시간</div>
        <div class="value">${crawlInsights.avgLoadTime}ms</div>
      </div>
    </div>
    ${crawlInsights.structureIssues.length > 0 ? `
      <h3>발견된 구조적 문제</h3>
      <ul>
        ${crawlInsights.structureIssues.map(issue => `<li>${issue}</li>`).join('')}
      </ul>
    ` : ''}
  ` : ''}

  <h2>개선 권장사항</h2>
  ${recommendations.map(rec => `
    <div class="recommendation ${rec.priority}">
      <div>
        <span class="badge ${rec.priority}">
          ${rec.priority === 'high' ? '높음' : rec.priority === 'medium' ? '중간' : '낮음'}
        </span>
        <strong style="font-size: 16px;">${rec.category}</strong>
      </div>
      <h3>${rec.title}</h3>
      <p>${rec.description}</p>
      <div class="action-items">
        <strong>실행 항목:</strong>
        <ol>
          ${rec.actionItems.map(item => `<li>${item}</li>`).join('')}
        </ol>
      </div>
    </div>
  `).join('')}

  <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 14px;">
    <p>GEO Analyzer - Generative Engine Optimization Analysis Tool</p>
    <p>© ${new Date().getFullYear()} All rights reserved</p>
  </div>
</body>
</html>
  `.trim()
}
