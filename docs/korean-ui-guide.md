# 한국어 UI 가이드

GEO Analyzer는 완전한 한국어 UI를 제공합니다. 이 문서는 한국어 UI를 유지하고 확장하는 방법을 설명합니다.

## 디렉토리 구조

```
lib/
├── constants/
│   └── labels.ts          # 한국어 레이블 및 메시지 상수
└── utils/
    └── format.ts          # 날짜/숫자 포맷팅 유틸리티
```

## 1. 한국어 레이블 사용

모든 UI 텍스트는 `lib/constants/labels.ts`에서 관리됩니다.

### 사용 예시

```tsx
import { LABELS, MESSAGES } from '@/lib/constants/labels'

// 레이블 사용
<Button>{LABELS.ACTIONS.SAVE}</Button>

// 메시지 사용
alert(MESSAGES.SUCCESS.ANALYSIS_COMPLETE)

// 동적 메시지 사용
alert(MESSAGES.SUCCESS.VARIATION_GENERATED(10))
```

### 상수 구조

#### LABELS
- `LLM_NAMES`: LLM 이름
- `ACTIONS`: 버튼 액션 (저장, 취소, 삭제 등)
- `ANALYSIS`: 분석 관련 레이블
- `VARIATIONS`: 쿼리 변형 관련
- `COMPETITORS`: 경쟁사 관련
- `CRAWL`: 크롤링 관련
- `VISUALIZATION`: 시각화 관련
- `REPORT`: 보고서 관련
- `STATUS`: 상태 표시
- `PRIORITY`: 우선순위
- `UNITS`: 단위 표시

#### MESSAGES
- `SUCCESS`: 성공 메시지
- `ERROR`: 에러 메시지
- `INFO`: 안내 메시지
- `DESCRIPTIONS`: 설명 메시지

#### PLACEHOLDERS
입력 필드의 placeholder 텍스트

#### TOOLTIPS
툴팁 메시지

## 2. 날짜 및 숫자 포맷팅

모든 날짜와 숫자는 한국 로케일(`ko-KR`)로 포맷팅합니다.

### 날짜 포맷팅

```tsx
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils/format'

// 날짜만
formatDate(new Date())  // "2025년 12월 2일"

// 날짜 + 시간
formatDateTime(new Date())  // "2025년 12월 2일 오후 2:30"

// 상대 시간
formatRelativeTime(new Date())  // "3분 전"
```

### 숫자 포맷팅

```tsx
import { formatNumber, formatPercent, formatCompactNumber } from '@/lib/utils/format'

// 천 단위 구분
formatNumber(1234567)  // "1,234,567"

// 퍼센트
formatPercent(45.67, 1)  // "45.7%"

// 축약 표시
formatCompactNumber(1234567)  // "123만"
```

### 기타 포맷팅

```tsx
import {
  formatDuration,
  formatFileSize,
  formatRank,
  formatProgress
} from '@/lib/utils/format'

// 시간 duration
formatDuration(1500)  // "1.5초"

// 파일 크기
formatFileSize(1024)  // "1.0KB"

// 순위
formatRank(3)  // "3위"

// 진행률
formatProgress(7, 10)  // "70% (7/10)"
```

## 3. 새 컴포넌트 추가 시 체크리스트

새로운 컴포넌트를 만들 때는 다음 사항을 확인하세요:

### ✅ UI 텍스트
- [ ] 모든 버튼, 레이블이 한국어인가?
- [ ] 상수 파일(`labels.ts`)을 사용하는가?
- [ ] 하드코딩된 영어 텍스트가 없는가?

### ✅ 에러 메시지
- [ ] 모든 에러 메시지가 한국어인가?
- [ ] `MESSAGES.ERROR.*` 상수를 사용하는가?

### ✅ 날짜/숫자
- [ ] 날짜는 `formatDate/formatDateTime`을 사용하는가?
- [ ] 숫자는 `formatNumber`를 사용하는가?
- [ ] 단위(회, %, ms)가 `LABELS.UNITS`를 사용하는가?

### ✅ 사용자 피드백
- [ ] Toast 메시지가 한국어인가?
- [ ] Alert 메시지가 한국어인가?
- [ ] 로딩 상태 텍스트가 한국어인가?

## 4. 예제: 한국어 UI 적용 전/후

### ❌ 잘못된 예시

```tsx
// 하드코딩된 영어
<Button>Save</Button>

// 로케일 없는 날짜
{new Date().toLocaleDateString()}

// 영어 에러 메시지
throw new Error('Failed to save')

// 로케일 없는 숫자
<span>{count}</span>
```

### ✅ 올바른 예시

```tsx
import { LABELS, MESSAGES } from '@/lib/constants/labels'
import { formatDateTime, formatNumber } from '@/lib/utils/format'

// 상수 사용
<Button>{LABELS.ACTIONS.SAVE}</Button>

// 한국 로케일 날짜
<span>{formatDateTime(new Date())}</span>

// 한국어 에러 메시지
throw new Error(MESSAGES.ERROR.SAVE_FAILED)

// 한국 로케일 숫자
<span>{formatNumber(count)}{LABELS.UNITS.TIMES}</span>
```

## 5. 상수 파일에 새 항목 추가하기

새로운 레이블이나 메시지가 필요한 경우:

1. `lib/constants/labels.ts` 파일 열기
2. 적절한 카테고리에 추가
3. TypeScript 타입 안전성 유지 (`as const`)

```typescript
export const LABELS = {
  // 기존 항목들...

  NEW_CATEGORY: {
    NEW_LABEL: '새 레이블',
    ANOTHER_LABEL: '또 다른 레이블',
  },
} as const
```

## 6. 유지보수 팁

### 검색으로 영어 찾기
프로젝트에서 하드코딩된 영어를 찾으려면:

```bash
# 버튼 레이블 확인
grep -r "Save\|Cancel\|Delete" --include="*.tsx"

# 에러 메시지 확인
grep -r "Error\|Failed\|failed" --include="*.ts"

# Alert/Toast 확인
grep -r "alert\|toast" --include="*.tsx"
```

### 일관성 유지
- **DO**: 상수 파일 사용
- **DON'T**: 컴포넌트에 직접 한국어 하드코딩
- **WHY**: 일관성 유지 및 향후 다국어 지원 용이

### 스타일 가이드
- 존댓말 사용: "저장하세요" (X) → "저장" (O)
- 간결함: "저장 버튼을 클릭하세요" (X) → "저장" (O)
- 명확함: "작업" (X) → "분석" / "크롤링" (O)

## 7. 향후 다국어 지원

현재는 한국어만 지원하지만, 향후 다국어 지원을 위한 기반이 마련되어 있습니다:

1. 모든 텍스트가 상수로 분리됨
2. 컴포넌트는 상수만 참조
3. i18n 라이브러리 도입 시 쉽게 마이그레이션 가능

```typescript
// 미래: i18n 적용 예시
import { useTranslation } from 'next-i18next'

const { t } = useTranslation()
<Button>{t('actions.save')}</Button>  // 현재 로케일에 맞는 텍스트 반환
```

## 8. 참고 자료

- [Intl.DateTimeFormat - MDN](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [Intl.NumberFormat - MDN](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [Next.js Internationalization](https://nextjs.org/docs/advanced-features/i18n-routing)

---

**질문이나 개선 사항이 있다면 이슈를 등록해주세요!**
