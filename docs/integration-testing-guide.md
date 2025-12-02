# 통합 테스트 가이드

GEO Analyzer의 전체 워크플로우를 테스트하는 가이드입니다.

## 사전 준비

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 항목을 설정:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (쿼리 변형 생성용)
OPENAI_API_KEY=your_openai_api_key

# LLM API Keys (실제 분석용)
PERPLEXITY_API_KEY=your_perplexity_key
OPENAI_API_KEY=your_openai_key  # ChatGPT용
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_claude_key
```

### 2. 데이터베이스 마이그레이션

```bash
# Supabase CLI 설치 (아직 안 했다면)
npm install -g supabase

# Supabase 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 적용
supabase db push
```

### 3. 의존성 설치

```bash
npm install
```

### 4. 개발 서버 시작

```bash
npm run dev
```

## E2E 워크플로우 테스트

### 워크플로우 1: 기본 분석

#### 1단계: 쿼리 입력
- [ ] 브라우저에서 `http://localhost:3000` 접속
- [ ] 검색어 입력 (예: "최고의 SEO 도구는?")
- [ ] 도메인 입력 (선택, 예: "semrush.com")
- [ ] 브랜드명 입력 (선택, 예: "Semrush")
- [ ] "분석 시작" 버튼 클릭

#### 2단계: 분석 진행 확인
- [ ] 로딩 인디케이터 표시 확인
- [ ] 진행 상태 (0% → 100%) 확인
- [ ] 로그 메시지 표시 확인
- [ ] 각 LLM별 분석 진행 상황 확인

#### 3단계: 결과 확인
- [ ] 핵심 지표 대시보드 표시
  - 총 인용 횟수
  - 내 도메인 노출률
  - LLM별 인용 현황
- [ ] LLM별 상세 결과 카드 (4개)
  - Perplexity, ChatGPT, Gemini, Claude
  - 인용 목록, 순위, 스니펫
- [ ] 경쟁사 비교 표시
  - 자동 감지된 경쟁사 목록
  - 순위, 인용 횟수, 인용률

#### 4단계: 에러 핸들링
- [ ] 일부 LLM 실패 시 경고 메시지 표시
- [ ] 성공한 LLM 결과는 정상 표시
- [ ] 전체 실패 시 에러 메시지 표시

### 워크플로우 2: AI 쿼리 변형 생성

#### 1단계: 변형 생성
- [ ] 쿼리 입력 후 "쿼리 변형 생성 (AI)" 버튼 클릭
- [ ] 변형 개수 선택 (10/15/30개)
- [ ] 선택한 개수만큼 변형 생성 확인
- [ ] 각 변형의 의도 레이블 확인

#### 2단계: 변형 수정
- [ ] 각 변형 클릭하여 수정 가능 확인
- [ ] X 버튼으로 변형 삭제 확인
- [ ] 수정/삭제 후 변형 개수 업데이트 확인

#### 3단계: 배치 분석
- [ ] "N개 쿼리 분석 시작" 버튼 클릭
- [ ] 배치 분석 진행률 표시
  - 전체 진행률 (X/N 완료)
  - 현재 쿼리 표시
  - 각 쿼리별 LLM 분석 상태
- [ ] 배치 분석 완료 알림

### 워크플로우 3: 경쟁사 분석

#### 1단계: 자동 감지
- [ ] 분석 완료 후 자동으로 경쟁사 감지
- [ ] 상위 5개 경쟁사 표시
- [ ] 각 경쟁사의 점수, 인용 횟수 확인
- [ ] 원하는 경쟁사 선택/해제

#### 2단계: 직접 입력
- [ ] "직접 입력" 탭 클릭
- [ ] 도메인, 브랜드명 입력
- [ ] "추가" 버튼으로 경쟁사 추가
- [ ] 추가된 경쟁사가 목록에 표시 확인

#### 3단계: 통합 관리
- [ ] "통합 관리" 탭에서 모든 경쟁사 확인
- [ ] 자동 감지 + 직접 입력 경쟁사 통합 표시
- [ ] 각 경쟁사 삭제 가능 확인

### 워크플로우 4: 페이지 크롤링

#### 1단계: 크롤링 시작
- [ ] 분석 결과에서 인용된 URL 선택
- [ ] "페이지 크롤링" 버튼 클릭
- [ ] robots.txt 체크 메시지 확인

#### 2단계: 크롤링 진행
- [ ] 각 페이지별 크롤링 진행 상태
- [ ] 성공/실패 표시
- [ ] 로딩 시간 표시

#### 3단계: 결과 확인
- [ ] 크롤링 성공한 페이지 목록
- [ ] 각 페이지의 구조 정보
  - 제목, 메타 설명
  - 헤딩 구조 (H1, H2, H3)
  - 이미지 개수
  - 링크 개수
- [ ] 구조적 문제 발견 시 경고 표시

### 워크플로우 5: 시각화

#### 1단계: 막대 그래프
- [ ] "막대 그래프" 탭 클릭
- [ ] LLM별 인용 횟수 비교 표시
- [ ] 내 도메인 vs 경쟁사 (상위 3개) 비교
- [ ] 각 LLM별 합계 통계 표시

#### 2단계: 원형 차트
- [ ] "원형 차트" 탭 클릭
- [ ] 전체 인용 비율 표시
- [ ] 상위 10개 도메인 색상별 구분
- [ ] 각 도메인의 퍼센트 표시
- [ ] 상위 5개 도메인 상세 정보

#### 3단계: 순위 테이블
- [ ] "순위 테이블" 탭 클릭
- [ ] 경쟁사 순위 정렬 테이블
- [ ] 컬럼 헤더 클릭으로 정렬 변경
  - 순위, 도메인, 인용 횟수, 인용률
- [ ] 내 도메인 하이라이트 표시
- [ ] 1~3위 메달 아이콘 표시

### 워크플로우 6: 종합 보고서

#### 1단계: 보고서 생성
- [ ] 모든 분석 완료 후 보고서 자동 생성
- [ ] 보고서 헤더 정보
  - 생성일시, 검색어, 분석 대상
- [ ] 핵심 요약 섹션
  - 총 인용 횟수, 순위, 평균 순위
  - LLM별 인용 현황

#### 2단계: 상세 내용 확인
- [ ] LLM별 상세 분석 섹션
  - 각 LLM의 인용 상태
  - 인용 목록 및 스니펫
- [ ] 경쟁사 비교 섹션
  - 순위별 경쟁사 목록
  - LLM별 인용 분포
- [ ] 시각화 통합 표시
- [ ] 크롤링 인사이트 (있는 경우)
  - 구조적 문제 요약
  - 로딩 시간 통계

#### 3단계: 개선 권장사항
- [ ] 우선순위별 권장사항 표시
  - 높음 (빨강), 중간 (노랑), 낮음 (파랑)
- [ ] 각 권장사항의 카테고리
- [ ] 구체적인 실행 항목 리스트

#### 4단계: 보고서 다운로드
- [ ] "PDF 다운로드" 버튼 클릭
- [ ] PDF 생성 중 로딩 표시
- [ ] PDF 파일 자동 다운로드
- [ ] "JSON 다운로드" 버튼으로 원시 데이터 다운로드

#### 5단계: 보고서 공유
- [ ] "공유" 버튼 클릭
- [ ] 공유 링크 클립보드 복사 확인
- [ ] 복사된 링크로 접속 시 동일한 보고서 표시

## 단위 기능 테스트

### 데이터베이스 연동

```typescript
// 테스트 스크립트 예시
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 1. 분석 데이터 저장
const { data, error } = await supabase
  .from('analyses')
  .insert({
    query: '테스트 쿼리',
    user_domain: 'test.com',
    results: { /* ... */ }
  })

// 2. 쿼리 변형 저장
const { data: variations } = await supabase
  .from('query_variations')
  .insert([
    { analysis_id: 'xxx', variation_query: '변형1' },
    { analysis_id: 'xxx', variation_query: '변형2' }
  ])

// 3. 경쟁사 저장
const { data: competitors } = await supabase
  .from('competitors')
  .insert({
    analysis_id: 'xxx',
    domain: 'competitor.com',
    citation_count: 10
  })
```

### API 엔드포인트 테스트

```bash
# 1. 쿼리 변형 생성 API
curl -X POST http://localhost:3000/api/generate-variations \
  -H "Content-Type: application/json" \
  -d '{
    "query": "최고의 SEO 도구는?",
    "count": 10
  }'

# 2. 페이지 크롤링 API
curl -X POST http://localhost:3000/api/crawl-pages \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com"]
  }'

# 3. PDF 생성 API
curl -X POST http://localhost:3000/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "report": { /* ... */ }
  }' \
  --output report.pdf
```

## 성능 테스트

### 1. 단일 분석 성능
- [ ] 단일 쿼리 분석 시간 측정 (< 60초 목표)
- [ ] 각 LLM API 응답 시간 측정
- [ ] 메모리 사용량 모니터링

### 2. 배치 분석 성능
- [ ] 10개 변형 배치 분석 시간 측정
- [ ] 병렬 처리 효율성 확인
- [ ] Rate limiting 동작 확인

### 3. 크롤링 성능
- [ ] 10개 페이지 동시 크롤링 시간 측정
- [ ] robots.txt 체크 오버헤드 측정
- [ ] 크롤링 실패율 확인

## 에러 시나리오 테스트

### 1. API Key 오류
- [ ] LLM API Key 누락 시 에러 처리
- [ ] 잘못된 API Key 사용 시 에러 메시지
- [ ] 일부 LLM 실패 시 부분 성공 처리

### 2. 네트워크 오류
- [ ] API 타임아웃 시 재시도 로직
- [ ] 네트워크 단절 시 에러 처리
- [ ] Rate limit 초과 시 에러 메시지

### 3. 데이터 오류
- [ ] 빈 쿼리 입력 시 validation
- [ ] 잘못된 도메인 형식 validation
- [ ] 크롤링 불가능한 URL 처리

### 4. 브라우저 호환성
- [ ] Chrome 최신 버전
- [ ] Firefox 최신 버전
- [ ] Safari 최신 버전
- [ ] Edge 최신 버전

## 보안 테스트

### 1. API Key 보안
- [ ] .env 파일이 .gitignore에 포함
- [ ] 클라이언트에 API Key 노출 안 됨
- [ ] Service Role Key는 서버 사이드에서만 사용

### 2. CORS 설정
- [ ] API 엔드포인트 CORS 정책 확인
- [ ] 허용된 origin만 접근 가능

### 3. 입력 검증
- [ ] SQL Injection 방지
- [ ] XSS 방지
- [ ] CSRF 토큰 확인

## 접근성 테스트

- [ ] 키보드 네비게이션 가능
- [ ] 스크린 리더 호환성
- [ ] 색상 대비 충분
- [ ] ARIA 레이블 적절

## 모바일 반응형 테스트

- [ ] 모바일 화면 (320px~)
- [ ] 태블릿 화면 (768px~)
- [ ] 데스크톱 화면 (1024px~)
- [ ] 터치 인터랙션 동작

## 회귀 테스트 체크리스트

배포 전 필수 확인 항목:

- [ ] 모든 E2E 워크플로우 통과
- [ ] API 엔드포인트 정상 동작
- [ ] 데이터베이스 마이그레이션 성공
- [ ] 환경 변수 올바르게 설정
- [ ] 빌드 오류 없음 (`npm run build`)
- [ ] TypeScript 타입 오류 없음
- [ ] ESLint 경고 없음
- [ ] 한국어 UI 모든 페이지 확인

## 트러블슈팅

### 문제: 분석이 실패함
- API Key가 올바르게 설정되었는지 확인
- 네트워크 연결 확인
- 콘솔 로그에서 상세 에러 확인

### 문제: 크롤링이 안 됨
- robots.txt가 크롤링을 허용하는지 확인
- URL이 올바른 형식인지 확인
- CORS 에러인지 확인

### 문제: PDF 생성 안 됨
- PDF 생성 API route가 정상 동작하는지 확인
- 보고서 데이터가 올바른 형식인지 확인

---

**모든 테스트 통과 시 프로덕션 배포 준비 완료!**
