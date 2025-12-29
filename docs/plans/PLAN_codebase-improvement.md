# GEO_CC 코드베이스 개선 계획

## 개요

3개의 전문 에이전트(code-reviewer, architect-reviewer, react-specialist)가 수행한 종합 분석 결과를 바탕으로 작성된 개선 계획입니다.

### 분석 결과 요약

| 카테고리 | 발견된 이슈 | 우선순위 |
|---------|-----------|---------|
| 타입 안전성 | `any` 타입 5개소 (variation-orchestrator.ts) | 높음 |
| React 최적화 | React.memo 사용률 0%, useCallback 미활용 | 높음 |
| 메모리 관리 | queryHistory 배열 무제한 증가 가능성 | 높음 |
| 컴포넌트 구조 | 400줄 이상 컴포넌트 존재 | 중간 |
| 데이터 페칭 | KPICards 매 마운트시 30개 레코드 조회 | 중간 |
| Provider 구조 | 3단계 Provider 중첩 | 낮음 |

---

## Phase 1: Critical Fixes (긴급 수정)

### 1.1 타입 안전성 강화

**대상 파일**: `lib/variation-orchestrator.ts`

**현재 문제**:
```typescript
// 5개소에서 any 타입 사용
const result = response as any
```

**개선 방향**:
- LLM 응답에 대한 명시적 타입 정의
- 타입 가드 함수 구현
- unknown 타입 사용 후 타입 좁히기

**작업 항목**:
- [ ] LLMResponse 인터페이스 정의
- [ ] 타입 가드 함수 `isValidLLMResponse()` 구현
- [ ] any → unknown 변환 후 타입 좁히기 적용
- [ ] 단위 테스트 추가

**예상 영향**: 런타임 오류 감소, IDE 자동완성 개선

---

### 1.2 React.memo 적용

**대상 컴포넌트**:
- `components/dashboard/KPICards.tsx` - KPICard
- `components/tracking/*.tsx` - 차트 컴포넌트들
- `components/ui/*.tsx` - 재사용 UI 컴포넌트

**현재 문제**:
- 부모 리렌더링시 모든 자식 리렌더링
- 차트 컴포넌트 불필요한 재계산

**개선 방향**:
```typescript
// Before
function KPICard({ title, value, ...props }: KPICardProps) { ... }

// After
const KPICard = memo(function KPICard({ title, value, ...props }: KPICardProps) {
  ...
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value &&
         prevProps.trend === nextProps.trend
})
```

**작업 항목**:
- [ ] KPICard에 React.memo 적용
- [ ] 차트 컴포넌트들에 React.memo 적용
- [ ] 커스텀 비교 함수 구현 (복잡한 props용)
- [ ] React DevTools로 리렌더링 검증

---

### 1.3 메모리 누수 방지

**대상**: queryHistory 상태 관리

**현재 문제**:
```typescript
// 무제한 배열 증가
setQueryHistory(prev => [...prev, newQuery])
```

**개선 방향**:
```typescript
const MAX_HISTORY_SIZE = 100

setQueryHistory(prev => {
  const updated = [...prev, newQuery]
  return updated.length > MAX_HISTORY_SIZE
    ? updated.slice(-MAX_HISTORY_SIZE)
    : updated
})
```

**작업 항목**:
- [ ] MAX_HISTORY_SIZE 상수 정의
- [ ] 배열 크기 제한 로직 추가
- [ ] 오래된 항목 자동 정리 구현
- [ ] 메모리 사용량 모니터링 추가

---

## Phase 2: Performance Optimization (성능 최적화)

### 2.1 useCallback 적용

**대상 파일**: 이벤트 핸들러가 있는 모든 컴포넌트

**현재 문제**:
```typescript
// 매 렌더링마다 새 함수 생성
const handleClick = () => { ... }
```

**개선 방향**:
```typescript
const handleClick = useCallback(() => {
  // ...
}, [dependencies])
```

**작업 항목**:
- [ ] 이벤트 핸들러에 useCallback 적용
- [ ] 콜백 props에 useCallback 적용
- [ ] 의존성 배열 최적화
- [ ] eslint-plugin-react-hooks 규칙 강화

---

### 2.2 데이터 페칭 최적화

**대상**: `components/dashboard/KPICards.tsx`

**현재 문제**:
- 매 마운트시 30개 레코드 조회
- 캐싱 없음
- 병렬 쿼리 미사용

**개선 방향**:
```typescript
// React Query 또는 SWR 도입
const { data, isLoading } = useQuery({
  queryKey: ['kpi-data'],
  queryFn: fetchKPIData,
  staleTime: 5 * 60 * 1000, // 5분 캐시
  refetchOnWindowFocus: false,
})
```

**작업 항목**:
- [ ] React Query 또는 SWR 설치
- [ ] KPICards 데이터 페칭 훅 분리
- [ ] 캐싱 전략 구현 (staleTime, cacheTime)
- [ ] 병렬 쿼리로 변환 (useQueries)

---

### 2.3 차트 렌더링 최적화

**대상**: Recharts 컴포넌트들

**개선 방향**:
- 데이터 변환 useMemo 적용
- 차트 옵션 객체 메모이제이션
- 대량 데이터시 데이터 샘플링

**작업 항목**:
- [ ] chartData 계산에 useMemo 적용 (이미 일부 적용됨)
- [ ] 차트 설정 객체 메모이제이션
- [ ] 1000개 이상 데이터 포인트 샘플링 로직

---

## Phase 3: Code Quality (코드 품질)

### 3.1 대형 컴포넌트 분리

**대상**: 400줄 이상 컴포넌트

**분리 기준**:
- 단일 책임 원칙 적용
- 200줄 이하로 분리
- 재사용 가능한 훅 추출

**작업 항목**:
- [ ] TrackingTab.tsx 분리 (차트별 컴포넌트)
- [ ] 커스텀 훅 추출 (useTrackingChartData 등)
- [ ] 공통 차트 설정 추출

---

### 3.2 테스트 커버리지 확대

**현재 상태**: 테스트 파일 미존재

**목표**:
- 유틸리티 함수 100% 커버리지
- 주요 컴포넌트 70% 이상
- E2E 테스트 핵심 플로우

**작업 항목**:
- [ ] Jest + React Testing Library 설정
- [ ] lib/*.ts 유틸리티 함수 테스트
- [ ] 주요 컴포넌트 통합 테스트
- [ ] Playwright E2E 테스트

---

### 3.3 에러 바운더리 구현

**대상**: 차트 컴포넌트, 데이터 페칭 영역

**구현**:
```typescript
class ChartErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <ChartErrorFallback onRetry={this.reset} />
    }
    return this.props.children
  }
}
```

**작업 항목**:
- [ ] 범용 ErrorBoundary 컴포넌트 생성
- [ ] 차트별 에러 폴백 UI 구현
- [ ] 에러 로깅 연동 (Sentry 등)

---

## Phase 4: Long-term Improvements (장기 개선)

### 4.1 접근성 개선

**작업 항목**:
- [ ] 차트에 aria-label 추가
- [ ] 키보드 네비게이션 지원
- [ ] 고대비 모드 지원
- [ ] 스크린 리더 호환성

---

### 4.2 모니터링 도입

**작업 항목**:
- [ ] 성능 메트릭 수집 (Web Vitals)
- [ ] 에러 추적 시스템 연동
- [ ] 사용자 행동 분석

---

### 4.3 번들 최적화

**작업 항목**:
- [ ] 코드 스플리팅 (dynamic import)
- [ ] 트리 쉐이킹 검증
- [ ] 번들 분석 및 최적화

---

## 위험 평가 및 롤백 전략

### 위험 요소

| 변경 사항 | 위험도 | 완화 전략 |
|----------|-------|----------|
| React.memo 적용 | 낮음 | 점진적 적용, 성능 비교 측정 |
| 데이터 페칭 라이브러리 변경 | 중간 | 피처 플래그로 단계적 전환 |
| 컴포넌트 분리 | 낮음 | 기존 API 유지, props 호환성 |
| 타입 변경 | 낮음 | 단계적 마이그레이션 |

### 롤백 전략

1. **Git 브랜치 전략**: 각 Phase별 별도 브랜치
2. **피처 플래그**: 주요 변경사항 토글 가능
3. **모니터링**: 배포 후 24시간 집중 모니터링
4. **단계적 배포**: Canary 또는 Blue-Green 배포

---

## 일정 및 우선순위

### 권장 실행 순서

1. **즉시 (Phase 1)**: 타입 안전성, 메모리 누수 방지
2. **단기 (Phase 2)**: React 최적화, 데이터 페칭
3. **중기 (Phase 3)**: 컴포넌트 분리, 테스트
4. **장기 (Phase 4)**: 접근성, 모니터링

### Quality Gates

각 Phase 완료 조건:
- [ ] 코드 리뷰 완료
- [ ] 테스트 통과
- [ ] 성능 회귀 없음 (Lighthouse 점수 유지)
- [ ] 빌드 성공

---

## 참고 자료

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Recharts Optimization](https://recharts.org/en-US/guide/customize)
