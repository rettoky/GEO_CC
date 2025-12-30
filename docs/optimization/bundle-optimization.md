# 번들 최적화 - Dynamic Import 적용

## 개요

무거운 차트 컴포넌트(Recharts 사용)에 Next.js dynamic import를 적용하여 초기 로딩 성능을 최적화했습니다.

## 적용된 컴포넌트

### 1. 차트 컴포넌트 (Recharts 기반)

다음 컴포넌트들을 dynamic import로 전환:

- `BubbleFlowChart` - 시간대별 버블 차트
- `CalendarHeatmap` - 캘린더 히트맵
- `SentimentTrackingDashboard` - 감성 분석 대시보드
- `TrackingLLMChart` - LLM별 추세 차트
- `TrackingLLMChartsGrid` - LLM 차트 그리드

### 2. 구현 방법

#### 파일 구조

```
components/
├── ui/
│   └── chart-skeleton.tsx       # 새로 생성
└── tracking/
    └── index.tsx                 # .ts → .tsx 변경
```

#### Dynamic Import 구현

**`components/tracking/index.tsx`**

```typescript
import dynamic from 'next/dynamic'
import { ChartSkeleton } from '@/components/ui/chart-skeleton'

// 정적 exports (가벼운 컴포넌트)
export { DrilldownModal } from './DrilldownModal'
export { TrackingChartFilters } from './TrackingChartFilters'
// ...

// Dynamic exports (무거운 차트 컴포넌트)
export const BubbleFlowChart = dynamic(
  () => import('./BubbleFlowChart').then(mod => ({ default: mod.BubbleFlowChart })),
  {
    loading: () => <ChartSkeleton title description />,
    ssr: false, // Recharts는 window 객체 필요
  }
)

// ... 다른 차트 컴포넌트들도 동일
```

#### 로딩 스켈레톤

**`components/ui/chart-skeleton.tsx`**

차트 로딩 중 표시할 스켈레톤 UI 컴포넌트:

- `ChartSkeleton` - 기본 차트 스켈레톤
- `ChartGridSkeleton` - 그리드 레이아웃용
- `DashboardChartSkeleton` - 대시보드 레이아웃용

```typescript
<ChartSkeleton title description />
```

## 최적화 효과

### 1. 번들 분할

- Recharts 라이브러리가 별도 청크로 분리
- 차트를 사용하지 않는 페이지에서는 로드되지 않음
- 초기 JavaScript 번들 크기 감소

### 2. 로딩 성능

- 초기 페이지 로드 시간 단축
- Time to Interactive (TTI) 개선
- First Contentful Paint (FCP) 최적화

### 3. 사용자 경험

- 로딩 중 스켈레톤 UI로 시각적 피드백 제공
- 부드러운 컴포넌트 전환
- 체감 성능 향상

## 주의사항

### 1. SSR 비활성화 (ssr: false)

Recharts는 브라우저 전용 라이브러리로 `window` 객체를 사용합니다.

```typescript
{
  ssr: false, // 필수!
}
```

### 2. Named Export → Default Export 변환

Dynamic import는 default export를 사용하므로 변환이 필요:

```typescript
() => import('./Component').then(mod => ({ default: mod.NamedExport }))
```

### 3. Props 타입 유지

Dynamic component도 원본과 동일한 props 인터페이스를 유지합니다.

## 사용 예시

### TrackingTab.tsx

```typescript
import {
  BubbleFlowChart,      // 자동으로 dynamic 버전 사용
  CalendarHeatmap,
  SentimentTrackingDashboard,
} from '@/components/tracking'

// 기존 코드 그대로 사용 가능
<BubbleFlowChart
  analyses={analyses}
  title="시간대별 분석 패턴"
  description="LLM별 시간대에 따른 인용률 분포"
/>
```

## 검증

### 타입 체크

```bash
npx tsc --noEmit
# ✓ 성공
```

### 빌드

```bash
npm run build
# ✓ Compiled successfully in 12.7s
```

### 개발 서버에서 확인

```bash
npm run dev
```

브라우저 개발자 도구 Network 탭에서 확인:
- 차트 컴포넌트가 별도 청크로 로드되는지 확인
- 로딩 스켈레톤이 표시되는지 확인

## 향후 개선사항

1. **번들 분석 도구 추가**
   - `@next/bundle-analyzer` 패키지 설치
   - 번들 크기 시각화

2. **추가 최적화 대상**
   - PDF 생성 관련 라이브러리
   - 크롤링 관련 무거운 패키지
   - 기타 조건부로 사용되는 라이브러리

3. **성능 모니터링**
   - Lighthouse 점수 측정
   - Core Web Vitals 추적
   - 실제 사용자 데이터 수집

## 참고 자료

- [Next.js Dynamic Imports](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [Code Splitting Best Practices](https://web.dev/code-splitting/)
- [Recharts Documentation](https://recharts.org/)
