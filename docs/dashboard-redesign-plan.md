# GEO Analyzer 대시보드 UI/UX 개편 계획

## 개요
현재 상단 헤더 네비게이션 기반의 단순 구조를 좌우 패널이 나뉜 대시보드 형태로 전면 개편합니다.

## 요구사항 요약

| 항목 | 결정 사항 |
|-----|----------|
| 좌측 패널 | 메뉴 + 필터/검색, 접기 가능 (아이콘만) |
| 우측 패널 | 상단 KPI 카드 + 하단 탭 기반 콘텐츠 |
| 트래킹 메트릭 | 인용율, 브랜드 노출률, 경쟁사 순위 전체 |
| 집계 기준 | 분석 단위 (각 분석마다 데이터 포인트) |
| 차트 형태 | 인터랙티브 (줌, 필터, 호버) |
| 분석 실행 | 우측 패널 내 탭 |
| 기존 페이지 | 대시보드에 통합 |
| 모바일 | 햄버거 메뉴 |
| 기존 데이터 | 소급 적용 + 삭제 시 즉시 반영 |
| 다크 모드 | 현재 제외 |

---

## 레이아웃 구조

```
┌────────────────────────────────────────────────────────────┐
│  [≡] GEO Analyzer                              (햄버거/모바일) │
├──────────┬─────────────────────────────────────────────────┤
│          │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  사이드바  │  │인용율│ │노출률│ │경쟁순위│ │총분석│  ← KPI 카드   │
│  (접기가능) │  └─────┘ └─────┘ └─────┘ └─────┘              │
│          ├─────────────────────────────────────────────────┤
│ ○ 새분석  │  [새 분석] [트래킹] [분석 상세]  ← 탭 네비게이션    │
│ ○ 트래킹  │  ┌─────────────────────────────────────────┐   │
│ ○ 이력   │  │                                         │   │
│          │  │         탭 콘텐츠 영역                    │   │
│ ─────── │  │                                         │   │
│ 필터/검색 │  │                                         │   │
│          │  └─────────────────────────────────────────┘   │
│  [접기]   │                                               │
└──────────┴─────────────────────────────────────────────────┘
```

---

## Phase 1: 레이아웃 기반 구축

### 1.1 새 컴포넌트 생성
- `components/layout/Sidebar.tsx` - 좌측 사이드바 컨테이너
- `components/layout/SidebarNav.tsx` - 네비게이션 메뉴 (새분석, 트래킹, 이력)
- `components/layout/SidebarFilter.tsx` - 필터/검색 영역
- `components/layout/MainPanel.tsx` - 우측 메인 패널 컨테이너
- `components/layout/MobileNav.tsx` - 모바일 햄버거 메뉴

### 1.2 레이아웃 수정
**파일**: `app/layout.tsx`
- 기존 Header 제거 또는 축소
- 대시보드 레이아웃 (Sidebar + MainPanel) 적용
- DashboardContext 추가

### 1.3 사이드바 스펙
- 펼침: 250px, 접힘: 60px (아이콘만)
- 접기/펼치기 토글 버튼 하단 배치
- localStorage에 접힘 상태 저장

---

## Phase 2: Context 및 상태 관리

### 2.1 새 Context 생성
**파일**: `contexts/DashboardContext.tsx`
```typescript
interface DashboardState {
  sidebarCollapsed: boolean
  activeTab: 'newAnalysis' | 'tracking' | 'detail'
  selectedAnalysisId: string | null
  searchQuery: string
  filters: AnalysisFilters
}
```

### 2.2 새 훅 생성
- `hooks/useDashboard.ts` - 대시보드 상태 관리
- `hooks/useTracking.ts` - 트래킹 데이터 fetch
- `hooks/useKPIData.ts` - KPI 집계 데이터

---

## Phase 3: KPI 카드 영역

### 3.1 새 컴포넌트
**파일**: `components/dashboard/KPICards.tsx`

### 3.2 KPI 카드 4개
1. **인용율 변화** - 내 도메인 인용 비율 + 추세 화살표
2. **브랜드 노출률** - LLM 커버리지 (0-4 LLM)
3. **경쟁사 비교 순위** - 경쟁사 대비 순위
4. **총 분석 수** - 완료된 분석 수 + 성공률

### 3.3 미니 스파크라인 차트
- 각 KPI 카드에 최근 7개 분석 추세 표시
- recharts의 LineChart (간소화 버전)

---

## Phase 4: 탭 기반 콘텐츠

### 4.1 새 컴포넌트
**파일**: `components/dashboard/DashboardTabs.tsx`

### 4.2 탭 구성

#### 새 분석 탭
- 기존 컴포넌트 재사용:
  - `QueryInput.tsx`
  - `QueryVariationGenerator.tsx`
  - `VariationList.tsx`
  - `AnalysisProgress.tsx`
  - `BatchAnalysisProgress.tsx`

#### 트래킹 탭
**파일**: `components/dashboard/TrackingCharts.tsx`
- 시간별 인용율 추세 (라인 차트)
- LLM별 노출 비교 (바 차트)
- 경쟁사 순위 변화 (라인 차트)
- 인터랙티브: 줌, 필터, 호버 툴팁

#### 분석 상세 탭
- 기존 `AnalysisDetailClient.tsx` 재사용
- 좌측 이력에서 클릭 시 해당 분석 표시

---

## Phase 5: 데이터베이스 스키마

### 5.1 새 테이블: `analysis_metrics`
```sql
CREATE TABLE analysis_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  citation_rate DECIMAL(5,2),
  brand_exposure_rate DECIMAL(5,2),
  llm_coverage INTEGER,
  competitor_rank INTEGER,
  brand_mention_count INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(analysis_id)
);
```

### 5.2 트리거: 자동 메트릭 계산
- 분석 완료 시 자동으로 `analysis_metrics` 생성
- 분석 삭제 시 CASCADE로 메트릭도 삭제

### 5.3 소급 적용 마이그레이션
- 기존 완료된 분석에서 메트릭 계산하여 INSERT
- Edge Function 또는 SQL 스크립트로 실행

---

## Phase 6: 사이드바 필터/검색

### 6.1 검색 기능
- 쿼리, 도메인, 브랜드명으로 검색
- 실시간 필터링 (debounce)

### 6.2 필터 옵션
- 날짜 범위 (오늘, 7일, 30일, 전체)
- 상태 (성공, 실패, 전체)
- 도메인별, 브랜드별

### 6.3 이력 목록
- 컴팩트 뷰 (AnalysisListCompact)
- 클릭 시 상세 탭으로 전환
- 무한 스크롤 또는 가상 스크롤

---

## Phase 7: 라우트 마이그레이션

### 7.1 기존 라우트 처리
| 기존 | 새 라우트 |
|-----|----------|
| `/` | `/` (대시보드) |
| `/analysis` | `/` + 좌측 이력 활성화 |
| `/analysis/[id]` | `/?tab=detail&id=[id]` 리다이렉트 |

### 7.2 URL 파라미터
```
/?tab=newAnalysis     → 새 분석 탭
/?tab=tracking        → 트래킹 탭
/?tab=detail&id=xxx   → 상세 탭 (특정 분석)
```

---

## Phase 8: 모바일 대응

### 8.1 햄버거 메뉴
- 상단 좌측에 햄버거 아이콘 (md 미만에서만)
- 클릭 시 사이드바 오버레이로 표시
- 외부 클릭 또는 메뉴 선택 시 닫힘

### 8.2 반응형 레이아웃
- Desktop (lg+): 사이드바 + 메인 패널
- Tablet (md-lg): 사이드바 접힘 + 메인 패널
- Mobile (-md): 햄버거 메뉴 + 전체 화면

---

## 수정 대상 파일

### 신규 생성
```
components/layout/Sidebar.tsx
components/layout/SidebarNav.tsx
components/layout/SidebarFilter.tsx
components/layout/MainPanel.tsx
components/layout/MobileNav.tsx
components/dashboard/KPICards.tsx
components/dashboard/DashboardTabs.tsx
components/dashboard/TrackingCharts.tsx
components/dashboard/AnalysisListCompact.tsx
contexts/DashboardContext.tsx
hooks/useDashboard.ts
hooks/useTracking.ts
hooks/useKPIData.ts
```

### 수정
```
app/layout.tsx                    - 대시보드 레이아웃 적용
app/page.tsx                      - 대시보드 메인으로 변경
app/analysis/page.tsx             - 리다이렉트 처리
app/analysis/[id]/page.tsx        - 리다이렉트 처리
lib/supabase/types.ts             - 새 테이블 타입 추가
```

### 재사용 (수정 없음)
```
components/analysis/QueryInput.tsx
components/analysis/QueryVariationGenerator.tsx
components/analysis/VariationList.tsx
components/analysis/VisibilityDashboard.tsx
components/analysis/LLMComparisonChart.tsx
components/analysis/CompetitorComparison.tsx
components/analysis/AnalysisProgress.tsx
components/analysis/FinalReview.tsx
components/analysis/ReviewChat.tsx
app/analysis/[id]/AnalysisDetailClient.tsx
```

---

## 구현 순서

1. **Phase 1**: 레이아웃 기반 (Sidebar, MainPanel, MobileNav)
2. **Phase 2**: Context 및 훅 생성
3. **Phase 3**: KPI 카드 영역
4. **Phase 4**: 탭 기반 콘텐츠 (기존 컴포넌트 통합)
5. **Phase 5**: DB 스키마 + 소급 적용
6. **Phase 6**: 사이드바 필터/검색 + 이력 목록
7. **Phase 7**: 라우트 마이그레이션 + 리다이렉트
8. **Phase 8**: 모바일 반응형 테스트 및 최적화
