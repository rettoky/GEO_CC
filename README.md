# GEO Analyzer

**Generative Engine Optimization (GEO) 분석 도구**

AI 검색 엔진(ChatGPT, Claude, Gemini, Perplexity)에서 브랜드와 콘텐츠가 어떻게 인용되는지 분석하고 최적화하는 종합 플랫폼입니다.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8)

## 주요 기능

### 1. 4대 LLM 동시 분석
- **ChatGPT (GPT-4o)**: OpenAI의 대화형 AI
- **Claude (Sonnet 3.5)**: Anthropic의 고급 언어 모델
- **Gemini (1.5 Flash)**: Google의 멀티모달 AI
- **Perplexity (Sonar Large)**: 실시간 검색 기반 AI

### 2. AI 쿼리 변형 생성
- GPT-4o 기반 자동 쿼리 변형 생성 (10/15/30개)
- 의도별 분류 (정보 탐색, 비교, 구매, 트러블슈팅)
- 배치 분석으로 다양한 쿼리 패턴 커버

### 3. 경쟁사 자동 감지
- 인용 빈도 기반 자동 경쟁사 발굴
- 4차원 점수 시스템:
  - 인용 빈도 (40점)
  - LLM 다양성 (30점)
  - 인용 순위 (20점)
  - 도메인 권위도 (10점)
- 수동 입력 + 자동 감지 하이브리드 방식

### 4. 페이지 구조 분석
- robots.txt 준수 크롤링
- HTML 구조 분석 (제목, 메타, 헤딩, 이미지, 링크)
- 로딩 시간 측정
- SEO 문제 자동 감지

### 5. 종합 시각화
- **막대 그래프**: LLM별 인용 횟수 비교
- **원형 차트**: 전체 인용 비율 분포
- **순위 테이블**: 경쟁사 랭킹 (정렬 가능)

### 6. AI 기반 보고서
- 핵심 지표 요약
- LLM별 상세 분석
- 경쟁사 비교 분석
- 우선순위별 개선 권장사항
- 웹 + PDF 이중 출력

### 7. 완전한 한국어 UI
- 모든 UI 텍스트 한국어
- 한국 로케일 날짜/숫자 포맷
- 중앙 집중식 레이블 관리

## 기술 스택

### Frontend
- **Next.js 14** (App Router)
- **React 18** (Server Components)
- **TypeScript 5** (Strict Mode)
- **Tailwind CSS 3** + **shadcn/ui**
- **Recharts** (데이터 시각화)

### Backend
- **Supabase** (PostgreSQL + Edge Functions)
- **Deno** (Edge Runtime)
- **OpenAI API** (쿼리 변형 + ChatGPT)
- **Anthropic API** (Claude)
- **Google AI API** (Gemini)
- **Perplexity API**

### DevOps
- **Vercel** (배포 플랫폼)
- **Git** (버전 관리)
- **ESLint** + **Prettier** (코드 품질)

## 빠른 시작

### 사전 요구사항
- Node.js 18.x 이상
- npm 9.x 이상
- Supabase 계정
- LLM API Keys (OpenAI, Claude, Gemini, Perplexity)

### 설치

```bash
# 1. 저장소 클론
git clone <repository-url>
cd GEO_CC

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 API Keys 입력

# 4. 데이터베이스 마이그레이션
npm install -g supabase
supabase link --project-ref your-project-ref
supabase db push

# 5. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 환경 변수

`.env.local` 파일 생성 후 다음 변수 설정:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM API Keys
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-claude-key
GEMINI_API_KEY=your-gemini-key
PERPLEXITY_API_KEY=pplx-your-perplexity-key
```

자세한 설정 방법은 [docs/setup-guide.md](./docs/setup-guide.md) 참고

## 사용 방법

### 1. 기본 분석

```
1. 검색어 입력 (예: "최고의 SEO 도구는?")
2. 도메인 입력 (선택, 예: "semrush.com")
3. "분석 시작" 클릭
4. 4개 LLM 결과 확인
```

### 2. 쿼리 변형 분석

```
1. 기본 쿼리 입력
2. "쿼리 변형 생성 (AI)" 클릭
3. 변형 개수 선택 (10/15/30)
4. 생성된 변형 검토/수정
5. "N개 쿼리 분석 시작" 클릭
```

### 3. 경쟁사 분석

```
1. 분석 완료 후 자동 감지된 경쟁사 확인
2. 또는 "직접 입력" 탭에서 수동 추가
3. 시각화 탭에서 경쟁사 비교
```

### 4. 보고서 생성

```
1. 분석 완료 후 자동으로 보고서 생성
2. 웹에서 확인 또는 PDF 다운로드
3. 공유 링크로 팀원과 공유
```

## 프로젝트 구조

```
GEO_CC/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   ├── analysis/                 # 분석 페이지
│   ├── layout.tsx                # 루트 레이아웃
│   └── page.tsx                  # 홈페이지
├── components/                   # React 컴포넌트
│   ├── analysis/                 # 분석 관련
│   ├── competitors/              # 경쟁사 관련
│   ├── visualizations/           # 시각화 관련
│   ├── reports/                  # 보고서 관련
│   └── ui/                       # shadcn/ui 컴포넌트
├── lib/                          # 유틸리티 및 로직
│   ├── ai/                       # AI 관련
│   ├── analysis/                 # 분석 로직
│   ├── crawler/                  # 크롤링 로직
│   ├── supabase/                 # Supabase 쿼리
│   ├── reports/                  # 보고서 생성
│   ├── constants/                # 상수
│   └── utils/                    # 유틸리티
├── supabase/                     # Supabase 관련
│   ├── migrations/               # DB 마이그레이션
│   └── functions/                # Edge Functions
├── types/                        # TypeScript 타입
├── hooks/                        # React Hooks
├── docs/                         # 문서
│   ├── setup-guide.md
│   ├── integration-testing-guide.md
│   └── korean-ui-guide.md
└── public/                       # 정적 파일
```

## 문서

- [환경 설정 가이드](./docs/setup-guide.md)
- [통합 테스트 가이드](./docs/integration-testing-guide.md)
- [한국어 UI 가이드](./docs/korean-ui-guide.md)

## 배포

### Vercel (추천)

```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

또는 GitHub 연동으로 자동 배포

## 라이선스

MIT License

## 기여

이슈 및 PR을 환영합니다!

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 지원

- 📖 [문서](./docs/)
- 💬 GitHub Issues

## 로드맵

- [ ] 다국어 지원 (영어, 일본어)
- [ ] 히트맵 시각화 추가
- [ ] 대시보드 커스터마이징
- [ ] 예약 분석 기능
- [ ] Slack/Discord 알림 통합

---

**GEO Analyzer**로 AI 검색 시대를 선도하세요! 🚀
