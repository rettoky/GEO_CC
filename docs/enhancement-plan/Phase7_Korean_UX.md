# Phase 7: 한국어 UI & UX 완성

**기간**: 4주차 후반 - 5주차
**상태**: 📋 계획 완료
**의존성**: Phase 1-6 완료 필요

## 목표

모든 UI 텍스트를 한국어로 번역하고, 사용자 친화적인 UX를 제공합니다.

## 작업 항목

### 1. 번역 상수 파일

#### 파일: `lib/i18n/ko.ts`

```typescript
export const KO = {
  common: {
    analyze: '분석하기',
    loading: '로딩 중...',
    error: '오류',
    success: '성공',
    cancel: '취소',
    confirm: '확인',
    delete: '삭제',
    edit: '수정',
    save: '저장',
    download: '다운로드',
    export: '내보내기',
    search: '검색',
    filter: '필터',
    sort: '정렬',
    refresh: '새로고침',
    close: '닫기',
    back: '뒤로',
    next: '다음',
    previous: '이전',
    submit: '제출',
    reset: '초기화'
  },

  analysis: {
    title: 'LLM 검색 노출 분석',
    newAnalysis: '새 분석',
    queryInput: '검색 쿼리 입력',
    queryPlaceholder: '예: 암보험',
    domainInput: '내 도메인',
    domainPlaceholder: '예: meritzfire.com',
    brandInput: '브랜드명',
    brandPlaceholder: '예: 메리츠화재',
    startAnalysis: '분석 시작',

    variations: {
      title: '쿼리 변형 생성',
      count: '변형 개수',
      generate: '생성하기',
      generated: '개 쿼리 생성됨',
      edit: '수정',
      approve: '승인',
      options: {
        small: '5-10개 (빠름, 약 2-3분)',
        medium: '15-20개 (권장, 약 5-7분)',
        large: '30개 이상 (포괄적, 약 10-15분)'
      }
    },

    progress: {
      generating: '쿼리 변형 생성 중...',
      analyzing: 'LLM 분석 중...',
      crawling: '페이지 크롤링 중...',
      detecting: '경쟁사 감지 중...',
      reporting: '보고서 생성 중...',
      completed: '분석 완료!',
      estimatedTime: '예상 남은 시간',
      minutes: '분',
      seconds: '초'
    },

    results: {
      title: '분석 결과',
      summary: '요약',
      citations: '인용',
      competitors: '경쟁사',
      pages: '페이지 구조',
      visualizations: '시각화',
      report: '보고서'
    }
  },

  competitors: {
    title: '경쟁사 분석',
    manual: '수동 입력',
    autoDetected: '자동 감지',
    addManual: '경쟁사 추가',
    domainLabel: '도메인',
    brandLabel: '브랜드명',
    confirm: '확인',
    remove: '제거',
    confidence: '신뢰도',
    citationCount: '인용 건수',
    llmAppearances: 'LLM 출현'
  },

  visualization: {
    barChart: '막대 그래프',
    pieChart: '원형 그래프',
    heatmap: '히트맵',
    table: '상세 데이터',

    labels: {
      citations: '인용 건수',
      citationRate: '인용률',
      llm: 'LLM',
      domain: '도메인',
      myDomain: '내 도메인',
      competitors: '경쟁사',
      position: '위치',
      url: 'URL'
    }
  },

  report: {
    title: '분석 보고서',
    downloadPDF: 'PDF 다운로드',
    generatingPDF: 'PDF 생성 중...',

    sections: {
      executiveSummary: '요약',
      queryAnalysis: '쿼리 분석',
      citationAnalysis: '인용 분석',
      competitorComparison: '경쟁사 비교',
      pageInsights: '페이지 구조 인사이트',
      recommendations: '개선 제안'
    },

    grades: {
      A: 'A등급 - 우수',
      B: 'B등급 - 양호',
      C: 'C등급 - 보통',
      D: 'D등급 - 개선 필요'
    },

    recommendations: {
      priority: {
        high: '높음',
        medium: '중간',
        low: '낮음'
      },
      difficulty: {
        easy: '쉬움',
        medium: '보통',
        hard: '어려움'
      }
    }
  },

  history: {
    title: '분석 기록',
    empty: '분석 기록이 없습니다',
    filters: {
      all: '전체',
      today: '오늘',
      week: '최근 7일',
      month: '최근 30일'
    },
    actions: {
      view: '보기',
      delete: '삭제',
      rerun: '재실행',
      download: 'PDF 다운로드'
    },
    sortBy: {
      latest: '최신순',
      oldest: '오래된순',
      citationRate: '인용률 높은순'
    }
  },

  errors: {
    networkError: '네트워크 오류가 발생했습니다',
    serverError: '서버 오류가 발생했습니다',
    invalidInput: '입력값이 올바르지 않습니다',
    analysisError: '분석 중 오류가 발생했습니다',
    pdfError: 'PDF 생성 중 오류가 발생했습니다',
    crawlError: '페이지 크롤링 중 오류가 발생했습니다',
    notFound: '데이터를 찾을 수 없습니다',
    unauthorized: '권한이 없습니다',
    timeout: '요청 시간이 초과되었습니다'
  },

  crawling: {
    status: {
      pending: '대기 중',
      success: '성공',
      failed: '실패',
      blocked: 'robots.txt 차단'
    },
    summary: {
      total: '총',
      success: '성공',
      blocked: '차단',
      failed: '실패',
      urls: '개 URL'
    }
  }
}
```

### 2. 포매터 유틸리티

#### 파일: `lib/i18n/formatters.ts`

```typescript
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 날짜를 한국어 형식으로 포맷
 * 예: 2025년 12월 02일 14:30
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
}

/**
 * 짧은 날짜 포맷
 * 예: 12/02 14:30
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MM/dd HH:mm', { locale: ko })
}

/**
 * 상대 시간 포맷
 * 예: 3시간 전, 2일 전
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: ko })
}

/**
 * 숫자를 한국어 형식으로 포맷
 * 예: 1,234,567
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num)
}

/**
 * 백분율 포맷
 * 예: 15.5%
 */
export function formatPercent(num: number, decimals: number = 1): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num / 100)
}

/**
 * 소수점 포맷
 * 예: 12.34
 */
export function formatDecimal(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

/**
 * 시간 길이 포맷
 * 예: 2분 30초, 5분
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}초`
  }

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (secs === 0) {
    return `${minutes}분`
  }

  return `${minutes}분 ${secs}초`
}

/**
 * 파일 크기 포맷
 * 예: 1.5 MB, 250 KB
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
```

### 3. 진행 상황 표시 컴포넌트

#### 파일: `components/analysis/DetailedProgress.tsx`

```typescript
'use client'

import { Progress } from '@/components/ui/progress'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import { KO } from '@/lib/i18n/ko'
import { formatDuration } from '@/lib/i18n/formatters'

interface ProgressState {
  stage: 'variations' | 'llm_analysis' | 'crawling' | 'competitors' | 'report' | 'completed'
  currentStep: string
  percentage: number
  estimatedTimeRemaining: number
  stageDetails?: {
    current: number
    total: number
  }
}

const stageDescriptions = {
  variations: 'AI가 다양한 검색 쿼리를 생성하고 있습니다.',
  llm_analysis: '4개 LLM에 동시에 쿼리를 전송하고 결과를 수집하는 중입니다.',
  crawling: '인용된 페이지의 구조를 분석하고 있습니다.',
  competitors: '경쟁사를 자동으로 감지하고 있습니다.',
  report: '종합 리포트를 생성하고 있습니다.',
  completed: '분석이 완료되었습니다!'
}

const stages = [
  { key: 'variations', label: '쿼리 변형 생성' },
  { key: 'llm_analysis', label: 'LLM 분석' },
  { key: 'crawling', label: '페이지 크롤링' },
  { key: 'competitors', label: '경쟁사 감지' },
  { key: 'report', label: '보고서 생성' }
]

export function DetailedProgress({ state }: { state: ProgressState }) {
  const currentStageIndex = stages.findIndex(s => s.key === state.stage)

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-white">
      {/* 전체 진행률 */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="font-medium text-lg">{state.currentStep}</span>
          <span className="text-sm text-gray-500">{state.percentage}%</span>
        </div>
        <Progress value={state.percentage} className="h-3" />
      </div>

      {/* 설명 텍스트 */}
      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
        {stageDescriptions[state.stage]}
      </p>

      {/* 세부 진행 상황 */}
      {state.stageDetails && (
        <div className="text-sm font-medium">
          진행: {state.stageDetails.current} / {state.stageDetails.total}
        </div>
      )}

      {/* 예상 남은 시간 */}
      {state.estimatedTimeRemaining > 0 && (
        <div className="text-sm text-gray-500">
          {KO.analysis.progress.estimatedTime}: 약 {formatDuration(state.estimatedTimeRemaining)}
        </div>
      )}

      {/* 단계별 체크리스트 */}
      <div className="space-y-2 pt-4 border-t">
        {stages.map((stage, index) => {
          const status = index < currentStageIndex ? 'completed' :
                         index === currentStageIndex ? 'in_progress' : 'pending'

          return (
            <div key={stage.key} className="flex items-center gap-3">
              {status === 'completed' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {status === 'in_progress' && (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              )}
              {status === 'pending' && (
                <Circle className="h-5 w-5 text-gray-300" />
              )}

              <span className={
                status === 'completed' ? 'line-through text-gray-400' :
                status === 'in_progress' ? 'font-medium' : 'text-gray-500'
              }>
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

## 컴포넌트 업데이트 가이드

### 기존 컴포넌트 수정 예시

**Before:**
```typescript
<Button>Analyze</Button>
<p>Loading...</p>
```

**After:**
```typescript
import { KO } from '@/lib/i18n/ko'

<Button>{KO.common.analyze}</Button>
<p>{KO.common.loading}</p>
```

### Recharts 한국어화

```typescript
import { KO } from '@/lib/i18n/ko'
import { formatNumber } from '@/lib/i18n/formatters'

<BarChart data={data}>
  <XAxis dataKey="name" />
  <YAxis
    label={{
      value: KO.visualization.labels.citations,
      angle: -90,
      position: 'insideLeft'
    }}
  />
  <Tooltip
    formatter={(value) => `${formatNumber(value)}건`}
    labelFormatter={(label) => label}
  />
  <Legend
    formatter={(value) => {
      if (value === 'myDomain') return KO.visualization.labels.myDomain
      return value
    }}
  />
</BarChart>
```

## 체크리스트

- [ ] `lib/i18n/ko.ts` 생성 (200+ 문자열)
- [ ] `lib/i18n/formatters.ts` 생성
- [ ] `DetailedProgress.tsx` 생성
- [ ] 모든 기존 컴포넌트에 KO 적용 (20-30개 파일)
- [ ] 모든 페이지에 KO 적용
- [ ] Recharts 레이블 한국어화
- [ ] 날짜/숫자 포맷터 적용
- [ ] 에러 메시지 한국어화
- [ ] 전체 UI 한국어 확인

## 다음 단계

Phase 7 완료 후 → **Phase 8: 테스트 & 최적화**

---

**예상 소요 시간**: 3-4일
**난이도**: ⭐⭐ (중간 - 반복 작업)
