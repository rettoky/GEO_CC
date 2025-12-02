# 환경 설정 가이드

GEO Analyzer 프로젝트를 로컬에서 실행하기 위한 상세 가이드입니다.

## 시스템 요구사항

- **Node.js**: 18.x 이상
- **npm**: 9.x 이상
- **Git**: 2.x 이상
- **Supabase CLI**: 최신 버전 (선택)

## 1. 프로젝트 클론

```bash
git clone <repository-url>
cd GEO_CC
```

## 2. 의존성 설치

```bash
npm install
```

설치되는 주요 패키지:
- `next@14` - Next.js 프레임워크
- `react@18` - React 라이브러리
- `@supabase/supabase-js` - Supabase 클라이언트
- `recharts` - 데이터 시각화
- `tailwindcss` - CSS 프레임워크
- `openai` - OpenAI API 클라이언트

## 3. Supabase 프로젝트 설정

### 3.1. Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com)에서 계정 생성/로그인
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호, 지역 선택
4. 프로젝트 생성 완료까지 대기 (2-3분)

### 3.2. API Keys 확인

프로젝트 대시보드 → Settings → API에서 다음 키 확인:
- `Project URL`: Supabase 프로젝트 URL
- `anon public` key: 공개 익명 키
- `service_role` key: 서비스 역할 키 (⚠️ 절대 클라이언트에 노출 금지)

### 3.3. 데이터베이스 마이그레이션

#### 방법 1: Supabase CLI 사용 (추천)

```bash
# Supabase CLI 설치
npm install -g supabase

# Supabase 프로젝트 연결
supabase login
supabase link --project-ref your-project-ref

# 마이그레이션 적용
supabase db push
```

#### 방법 2: SQL Editor 사용

1. Supabase 대시보드 → SQL Editor
2. `supabase/migrations/20251203000000_enhanced_features.sql` 파일 내용 복사
3. SQL Editor에 붙여넣고 실행 (RUN)

### 3.4. Edge Functions 배포 (선택)

```bash
# 쿼리 변형 생성 함수
supabase functions deploy generate-query-variations

# 페이지 크롤링 함수
supabase functions deploy crawl-pages
```

**참고**: Edge Functions는 선택 사항입니다. Next.js API Routes로도 동일한 기능을 사용할 수 있습니다.

## 4. LLM API Keys 획득

### 4.1. OpenAI (ChatGPT + 쿼리 변형)

1. [https://platform.openai.com](https://platform.openai.com) 접속
2. API Keys → Create new secret key
3. 키 복사 및 안전한 곳에 저장

**필요한 모델**:
- `gpt-4o` (쿼리 변형 생성)
- `gpt-4o` (ChatGPT 분석)

**가격**: $5/month 최소 충전

### 4.2. Anthropic Claude

1. [https://console.anthropic.com](https://console.anthropic.com) 접속
2. API Keys → Create Key
3. 키 복사

**필요한 모델**: `claude-3-5-sonnet-20241022`

**가격**: 종량제

### 4.3. Google Gemini

1. [https://aistudio.google.com](https://aistudio.google.com) 접속
2. Get API key 클릭
3. 키 생성 및 복사

**필요한 모델**: `gemini-1.5-flash-latest`

**가격**: 무료 티어 available

### 4.4. Perplexity

1. [https://www.perplexity.ai](https://www.perplexity.ai) 접속
2. Settings → API
3. API Key 생성

**필요한 모델**: `llama-3.1-sonar-large-128k-online`

**가격**: 종량제

## 5. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (쿼리 변형 생성 + ChatGPT)
OPENAI_API_KEY=sk-your-openai-key

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-claude-key

# Google Gemini
GEMINI_API_KEY=your-gemini-key

# Perplexity
PERPLEXITY_API_KEY=pplx-your-perplexity-key
```

### 환경 변수 설명

| 변수 이름 | 용도 | 필수 여부 |
|---------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 | 필수 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 | 필수 |
| `OPENAI_API_KEY` | OpenAI API 키 | 필수 |
| `ANTHROPIC_API_KEY` | Claude API 키 | 선택* |
| `GEMINI_API_KEY` | Gemini API 키 | 선택* |
| `PERPLEXITY_API_KEY` | Perplexity API 키 | 선택* |

*선택 사항이지만, 해당 LLM 분석을 사용하려면 필수

## 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 7. 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 8. Vercel 배포 (추천)

### 8.1. Vercel 계정 생성

1. [https://vercel.com](https://vercel.com) 접속
2. GitHub로 로그인

### 8.2. 프로젝트 Import

```bash
# Vercel CLI 설치
npm install -g vercel

# 프로젝트 배포
vercel
```

또는 Vercel 대시보드에서:
1. "Add New..." → "Project"
2. GitHub 리포지토리 선택
3. 환경 변수 설정
4. Deploy 클릭

### 8.3. 환경 변수 설정

Vercel 대시보드 → Project → Settings → Environment Variables에서 모든 환경 변수 추가

**중요**:
- `NEXT_PUBLIC_*` 변수는 클라이언트에 노출됨
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 `NEXT_PUBLIC_` 접두사 사용 금지

## 9. 트러블슈팅

### 문제: npm install 실패

```bash
# 캐시 클리어 후 재시도
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 문제: Supabase 연결 실패

- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수 이름에 오타가 없는지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 문제: LLM API 호출 실패

- API Key가 올바른지 확인
- API Key에 충분한 크레딧이 있는지 확인
- Rate limit을 초과하지 않았는지 확인

### 문제: 포트 3000 이미 사용 중

```bash
# 다른 포트로 실행
PORT=3001 npm run dev
```

### 문제: TypeScript 오류

```bash
# TypeScript 타입 재생성
npm run build
```

### 문제: 스타일이 적용 안 됨

```bash
# Tailwind CSS 재빌드
npm run dev
```

## 10. 추천 VS Code 확장

- **ESLint**: 코드 린팅
- **Prettier**: 코드 포맷팅
- **Tailwind CSS IntelliSense**: Tailwind 자동완성
- **TypeScript Vue Plugin (Volar)**: TypeScript 지원

## 11. 유용한 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 린트 검사
npm run lint

# TypeScript 타입 체크
npx tsc --noEmit

# Supabase 로컬 개발 (선택)
supabase start
supabase stop
```

## 12. 다음 단계

환경 설정이 완료되었다면:

1. [integration-testing-guide.md](./integration-testing-guide.md)를 참고하여 기능 테스트
2. [korean-ui-guide.md](./korean-ui-guide.md)를 참고하여 한국어 UI 개발
3. 실제 쿼리로 분석 시작!

## 13. 도움이 필요하신가요?

- 📖 [공식 문서](./integration-testing-guide.md)
- 💬 GitHub Issues
- 📧 이메일 문의

---

**행복한 코딩 되세요!** 🚀
