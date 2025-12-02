# GEO Analyzer 개선 프로젝트 개요

## 프로젝트 목표

GEO Analyzer를 확장하여 AI 검색 엔진(4개 LLM)에서의 브랜드/상품 노출도를 종합적으로 분석하고, 경쟁사 대비 개선점을 도출하는 완전한 분석 플랫폼 구축

## 현재 상태

- **Phase 1 (Core MVP)** 부분 구현 완료
- Next.js 14 + Supabase 인프라 구축
- 4개 LLM 통합 (Perplexity, ChatGPT, Gemini, Claude)
- 단일 쿼리 분석 기능 동작
- 기본 시각화 컴포넌트 존재

## 핵심 요구사항 (8가지)

### 1. AI 기반 쿼리 변형 생성
- GPT-4o로 5-30개 다양한 검색 쿼리 자동 생성
- 사용자가 개수 선택 가능 (5-10 / 15-20 / 30+)
- Demographic, Informational, Comparison, Recommendation 타입

### 2. 하이브리드 경쟁사 분석
- 수동 입력: 사용자가 주요 경쟁사 직접 입력
- 자동 감지: LLM 결과에서 경쟁사 자동 추출 및 점수화
- 통합 뷰: 수동 + 자동 경쟁사 통합 표시

### 3. 페이지 구조 분석 (크롤링)
- 인용된 URL의 실제 HTML 콘텐츠 페칭
- Meta tags, Schema.org, 콘텐츠 구조 분석
- robots.txt 존중 (윤리적 크롤링)

### 4. 종합 시각화 시스템
- 막대 그래프: LLM별, 도메인별 인용 건수
- 원형 차트: 시장 점유율 시각화
- 히트맵: LLM × 도메인 교차 분석
- 데이터 테이블: 정렬/필터/CSV 내보내기

### 5. 이중 포맷 보고서
- 웹 대시보드: 브라우저에서 즉시 확인
- PDF 다운로드: Vercel + Playwright로 생성

### 6. 전체 데이터 저장
- 모든 중간 단계 결과 Supabase 저장
- 원본 API 응답, 분석 과정, 시각화 데이터 모두 보존
- 디버깅 및 재분석 가능

### 7. 완전한 한국어 UI
- 모든 UI 텍스트 한국어화
- 날짜/숫자 한국 형식 포맷팅
- 차트 레이블 한국어

### 8. 사용자 친화적 UX
- 실시간 진행 상황 표시 (동기식 처리)
- 각 단계별 명확한 설명
- 예상 소요 시간 표시

## 구현 단계 (8 Phases)

| Phase | 기간 | 핵심 작업 | 상태 |
|-------|------|-----------|------|
| Phase 1 | 1주차 | 데이터베이스 기반 구축 | 📋 계획 완료 |
| Phase 2 | 1-2주차 | 쿼리 변형 생성 (AI) | 📋 계획 완료 |
| Phase 3 | 2주차 | 페이지 크롤러 | 📋 계획 완료 |
| Phase 4 | 2-3주차 | 경쟁사 분석 강화 | 📋 계획 완료 |
| Phase 5 | 3주차 | 시각화 시스템 | 📋 계획 완료 |
| Phase 6 | 3-4주차 | 보고서 생성 | 📋 계획 완료 |
| Phase 7 | 4-5주차 | 한국어 & UX | 📋 계획 완료 |
| Phase 8 | 5-6주차 | 테스트 & 최적화 | 📋 계획 완료 |

## 기술 스택

### 기존 (유지)
- Next.js 14 (App Router)
- TypeScript 5.x (strict mode)
- Supabase (PostgreSQL + Edge Functions)
- Tailwind CSS 3.x
- shadcn/ui
- Recharts

### 신규 추가
- **GPT-4o**: 쿼리 변형 생성
- **Deno DOM Parser**: HTML 파싱
- **D3.js**: 히트맵 시각화
- **Playwright**: PDF 생성
- **@sparticuz/chromium-min**: Vercel용 Chromium

## 데이터베이스 변경사항

### 신규 테이블 (4개)
1. `query_variations` - 생성된 쿼리 변형
2. `competitors` - 수동/자동 경쟁사
3. `page_crawls` - 크롤링된 페이지 데이터
4. `reports` - 생성된 보고서

### 확장 테이블
- `analyses` - 9개 컬럼 추가 (citation_metrics, intermediate_results 등)

## 예상 비용 & 성능

### API 비용 (per analysis)
- **5-10개 변형**: ~$2-3
- **15-20개 변형**: ~$4-6
- **30개 변형**: ~$8-10

### 처리 시간 (동기식)
- **5-10개 변형**: 3-5분
- **15-20개 변형**: 6-8분
- **30개 변형**: 10-15분

## 주요 기술 결정

### 1. PDF 생성: Playwright on Vercel
- **선택 이유**: 웹 페이지를 그대로 PDF로 변환, 차트 완벽 보존
- **구현**: Vercel API Route + @sparticuz/chromium-min
- **대안**: react-pdf (복잡한 차트 구현 어려움)

### 2. 크롤링 정책: robots.txt 존중
- **선택 이유**: 윤리적 크롤링, 법적 리스크 최소화
- **구현**: robots.txt 파싱 후 Disallow 체크
- **결과**: 일부 URL은 크롤링 불가 (사용자에게 명시)

### 3. 처리 방식: 동기식 실시간
- **선택 이유**: 사용자가 진행 상황 확인 가능, 즉시 결과 확인
- **구현**: 실시간 진행률 표시 + 예상 시간 안내
- **대안**: 비동기 (이메일 알림 필요, 구현 복잡도 증가)

### 4. 변형 개수: 사용자 선택
- **선택 이유**: 비용/시간/품질 트레이드오프를 사용자가 결정
- **구현**: UI에서 3가지 옵션 제공 (5-10 / 15-20 / 30+)

## 성공 기준

### 기능적 기준
- ✅ 쿼리 변형 자동 생성 (5-30개)
- ✅ 모든 변형에 대해 4개 LLM 분석
- ✅ 경쟁사 자동 감지 + 수동 입력
- ✅ 페이지 크롤링 (robots.txt 존중)
- ✅ 4가지 시각화 제공
- ✅ 웹 보고서 + PDF 다운로드
- ✅ 모든 중간 데이터 저장
- ✅ 100% 한국어 UI

### 성능 기준
- ✅ 10개 변형 분석: 5분 이내
- ✅ PDF 생성: 20초 이내
- ✅ 페이지 크롤링: 30초/URL

### 사용성 기준
- ✅ 모든 단계 설명 제공
- ✅ 직관적인 UI 흐름
- ✅ 명확한 에러 메시지

## 문서 구조

```
docs/enhancement-plan/
├── 00_Overview.md (이 파일)
├── Phase1_Database.md
├── Phase2_QueryVariations.md
├── Phase3_PageCrawler.md
├── Phase4_Competitors.md
├── Phase5_Visualizations.md
├── Phase6_Reports.md
├── Phase7_Korean_UX.md
└── Phase8_Testing.md
```

각 Phase 문서에는 다음 내용 포함:
- 목표 및 범위
- 상세 작업 항목
- 생성/수정할 파일 목록
- 코드 예시
- 검증 방법
- 다음 Phase로의 연결

## 시작하기

1. Phase 1 문서 확인: `Phase1_Database.md`
2. 데이터베이스 마이그레이션 생성
3. 로컬 환경에서 테스트
4. Phase 2로 진행

---

**작성일**: 2025-12-02
**버전**: 1.0
**작성자**: Claude Code
