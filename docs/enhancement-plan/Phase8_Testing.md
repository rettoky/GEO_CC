# Phase 8: 통합 테스트 & 최적화

**기간**: 5주차 - 6주차
**상태**: 📋 계획 완료
**의존성**: Phase 1-7 완료 필요

## 목표

전체 시스템을 통합 테스트하고, 성능 최적화 및 모바일 반응형을 적용하여 프로덕션 배포 준비를 완료합니다.

## 테스트 시나리오

### 1. 엔드투엔드 테스트

#### 시나리오 A: 단일 쿼리 분석 (빠른 테스트)
```
1. 기본 쿼리 입력: "암보험"
2. 도메인 입력: "meritzfire.com"
3. 브랜드 입력: "메리츠화재"
4. 분석 시작 (변형 없이)
5. 4개 LLM 결과 확인
6. 시각화 모든 탭 확인
7. 보고서 생성 확인
8. PDF 다운로드 확인

예상 소요 시간: 2-3분
성공 기준:
- 모든 LLM 성공
- 시각화 렌더링
- PDF 생성 성공
```

#### 시나리오 B: 쿼리 변형 포함 (중간 테스트)
```
1. 기본 쿼리 입력: "자동차보험"
2. 쿼리 변형 생성 (15개)
3. 생성된 변형 확인 및 수정
4. 배치 분석 시작
5. 진행 상황 실시간 확인
6. 15개 변형 + 기본 쿼리 결과 확인
7. 경쟁사 자동 감지 확인
8. 수동 경쟁사 추가
9. 페이지 크롤링 결과 확인
10. 종합 보고서 확인

예상 소요 시간: 6-8분
성공 기준:
- 변형 생성 성공
- 배치 분석 완료
- 경쟁사 자동 감지 작동
- 크롤링 성공률 80%+
```

#### 시나리오 C: 대용량 분석 (전체 테스트)
```
1. 30개 쿼리 변형 생성
2. 배치 분석 실행
3. 모든 중간 단계 검증
4. 최종 보고서 품질 확인

예상 소요 시간: 12-15분
성공 기준:
- 타임아웃 없이 완료
- 메모리 누수 없음
- DB 저장 완료
```

### 2. 에러 핸들링 테스트

#### API 실패 시나리오
```typescript
// 테스트: LLM API 실패
- 네트워크 차단 상황 시뮬레이션
- 일부 LLM만 실패 → 부분 성공 확인
- 모든 LLM 실패 → 적절한 에러 메시지

// 테스트: 타임아웃
- 크롤링 타임아웃 (30초) 확인
- Edge Function 타임아웃 확인

// 테스트: 잘못된 입력
- 빈 쿼리 입력
- 잘못된 도메인 형식
- 특수문자 포함 쿼리
```

### 3. 성능 테스트

#### 응답 시간 측정
```
- 단일 쿼리 분석: < 3분
- 10개 변형 분석: < 5분
- 30개 변형 분석: < 15분
- PDF 생성: < 20초
- 페이지 크롤링: < 30초/URL
```

#### 동시성 테스트
```
- 2명 동시 분석 실행
- DB 락 확인
- Edge Function 동시성 확인
```

### 4. 모바일 반응형 테스트

#### 테스트 기기
```
- iPhone (Safari, Chrome)
- Android (Chrome)
- iPad (Safari)
```

#### 확인 사항
```
- 모든 차트 렌더링
- 터치 인터랙션
- 긴 텍스트 줄바꿈
- 표 가로 스크롤
- 버튼 크기 (최소 44px)
```

## 성능 최적화

### 1. 프론트엔드 최적화

#### 코드 스플리팅
```typescript
// app/reports/[id]/page.tsx
const HeatmapView = dynamic(() => import('@/components/visualizations/HeatmapView'), {
  loading: () => <div>로딩 중...</div>,
  ssr: false // 차트는 클라이언트에서만 렌더링
})
```

#### 이미지 최적화
```typescript
import Image from 'next/image'

<Image
  src="/logo.png"
  width={200}
  height={50}
  alt="Logo"
  priority // LCP 최적화
/>
```

### 2. 데이터베이스 최적화

#### 인덱스 확인
```sql
-- 자주 쿼리되는 컬럼에 인덱스 추가
CREATE INDEX idx_analyses_created_at_desc ON analyses(created_at DESC);
CREATE INDEX idx_analyses_status ON analyses(status);
```

#### 쿼리 최적화
```typescript
// 불필요한 데이터 로딩 방지
const analyses = await supabase
  .from('analyses')
  .select('id, query_text, created_at, status, summary') // 필요한 필드만
  .order('created_at', { ascending: false })
  .limit(20)
```

### 3. Edge Function 최적화

#### 병렬 처리
```typescript
// 4개 LLM 호출을 병렬로
const results = await Promise.allSettled([
  callPerplexity(query),
  callChatGPT(query),
  callGemini(query),
  callClaude(query)
])
```

#### 캐싱 전략
```typescript
// 동일 쿼리 24시간 캐싱 (선택사항)
// 프로덕션에서는 실시간 데이터가 중요하므로 캐싱 최소화
```

### 4. 번들 크기 최적화

#### 분석
```bash
npm run build
npx @next/bundle-analyzer
```

#### 불필요한 패키지 제거
```bash
npm uninstall <unused-package>
```

#### Tree shaking 확인
```typescript
// 전체 라이브러리 import 대신 필요한 것만
// ❌ import * as d3 from 'd3'
// ✅ import { scaleLinear } from 'd3-scale'
```

## 보안 체크리스트

### 1. 환경 변수 보안
```
- ✅ API 키는 절대 클라이언트에 노출 금지
- ✅ SUPABASE_SERVICE_ROLE_KEY는 서버에서만 사용
- ✅ .env.local을 .gitignore에 추가
```

### 2. 입력 검증
```typescript
// 모든 사용자 입력 검증
import { z } from 'zod'

const querySchema = z.object({
  baseQuery: z.string().min(1).max(200),
  myDomain: z.string().url().optional(),
  myBrand: z.string().max(100).optional()
})
```

### 3. SQL 인젝션 방지
```typescript
// Supabase 클라이언트 사용 (파라미터화된 쿼리)
// ✅ 안전
await supabase.from('analyses').select('*').eq('id', userId)

// ❌ 위험 (사용 금지)
// await supabase.rpc('raw_sql', { query: `SELECT * FROM analyses WHERE id = ${userId}` })
```

### 4. XSS 방지
```typescript
// React는 기본적으로 XSS 방지
// dangerouslySetInnerHTML 사용 금지
```

## 배포 준비

### 1. Vercel 배포 설정

#### vercel.json
```json
{
  "functions": {
    "app/api/generate-pdf/route.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "OPENAI_API_KEY": "@openai-api-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key"
  }
}
```

### 2. Supabase 프로덕션 설정

```bash
# 프로덕션 마이그레이션 적용
supabase db push --project-ref your-project-ref

# Edge Functions 배포
supabase functions deploy generate-query-variations
supabase functions deploy analyze-query
supabase functions deploy crawl-pages
```

### 3. 환경 변수 설정

**Vercel**:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Supabase Secrets**:
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set PERPLEXITY_API_KEY=...
supabase secrets set GOOGLE_AI_API_KEY=...
supabase secrets set ANTHROPIC_API_KEY=...
```

## 문서화

### 1. README.md 업데이트

```markdown
# GEO Analyzer

AI 검색 엔진 인용 분석 플랫폼

## 기능
- 4개 LLM 동시 분석 (Perplexity, ChatGPT, Gemini, Claude)
- AI 기반 쿼리 변형 생성
- 경쟁사 자동 감지
- 페이지 구조 분석
- 종합 시각화
- PDF 보고서

## 설치 및 실행
\`\`\`bash
npm install
npm run dev
\`\`\`

## 환경 변수
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
\`\`\`

## 배포
\`\`\`bash
vercel deploy
\`\`\`
```

### 2. API 문서 작성

각 Edge Function의 요청/응답 형식 문서화

### 3. 사용자 가이드

주요 기능 사용 방법 스크린샷과 함께 설명

## 최종 체크리스트

### 기능 테스트
- [ ] 단일 쿼리 분석 성공
- [ ] 쿼리 변형 생성 (5, 15, 30개)
- [ ] 배치 분석 완료
- [ ] 경쟁사 자동 감지
- [ ] 페이지 크롤링 (robots.txt 존중)
- [ ] 4가지 시각화 모두 동작
- [ ] 웹 보고서 생성
- [ ] PDF 다운로드
- [ ] 기록 탭 필터/정렬

### 성능
- [ ] 단일 분석 < 3분
- [ ] 10개 변형 < 5분
- [ ] PDF 생성 < 20초
- [ ] 번들 크기 < 1MB (gzip)
- [ ] Lighthouse 점수 > 90

### UX
- [ ] 모든 텍스트 한국어
- [ ] 진행 상황 실시간 표시
- [ ] 에러 메시지 명확
- [ ] 로딩 상태 표시
- [ ] 모바일 반응형

### 보안
- [ ] API 키 서버 전용
- [ ] 입력 검증
- [ ] SQL 인젝션 방지
- [ ] XSS 방지

### 배포
- [ ] Vercel 배포 성공
- [ ] Supabase 마이그레이션 적용
- [ ] Edge Functions 배포
- [ ] 환경 변수 설정
- [ ] 프로덕션 테스트

---

**예상 소요 시간**: 5-7일
**난이도**: ⭐⭐⭐ (높음 - 통합 및 최적화)

## 프로젝트 완료

Phase 8 완료 후, GEO Analyzer 개선 프로젝트가 완료됩니다! 🎉

모든 Phase 문서는 `docs/enhancement-plan/` 폴더에 있습니다.
