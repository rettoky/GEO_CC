# Quickstart: GEO Analyzer Core MVP

**Date**: 2025-12-01
**Branch**: 001-core-mvp

## 사전 요구사항

### 필수 도구
- Node.js 18.x 이상
- npm 또는 pnpm
- Git
- Supabase CLI

### 필수 계정 및 API 키
1. **Supabase 계정**: https://supabase.com
2. **Perplexity API 키**: https://docs.perplexity.ai/
3. **OpenAI API 키**: https://platform.openai.com/
4. **Google AI API 키**: https://aistudio.google.com/
5. **Anthropic API 키**: https://console.anthropic.com/

---

## 1. 프로젝트 생성 (5분)

```bash
# Next.js 14 프로젝트 생성
npx create-next-app@latest geo-analyzer --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd geo-analyzer

# 의존성 설치
npm install @supabase/supabase-js @supabase/ssr
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge
npm install zod date-fns

# shadcn/ui 설정
npx shadcn@latest init
npx shadcn@latest add button input card badge skeleton toast
```

---

## 2. Supabase 프로젝트 설정 (10분)

### 2.1 프로젝트 생성
1. https://supabase.com 에서 새 프로젝트 생성
2. Region: `ap-northeast-2` (Seoul) 선택
3. Database password 저장

### 2.2 환경 변수 설정
```bash
# .env.local 파일 생성
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
EOF
```

### 2.3 데이터베이스 테이블 생성
Supabase Dashboard > SQL Editor에서 실행:

```sql
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    my_domain TEXT,
    my_brand TEXT,
    brand_aliases TEXT[] DEFAULT '{}',
    results JSONB NOT NULL DEFAULT '{}',
    summary JSONB,
    cross_validation JSONB,
    competitor_analysis JSONB,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
```

---

## 3. Edge Function 설정 (15분)

### 3.1 Supabase CLI 설정
```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인 및 프로젝트 연결
supabase login
supabase init
supabase link --project-ref [YOUR_PROJECT_REF]
```

### 3.2 API 키 등록
Supabase Dashboard > Project Settings > Edge Functions > Secrets:

| Name | Value |
|------|-------|
| PERPLEXITY_API_KEY | pplx-xxx... |
| OPENAI_API_KEY | sk-xxx... |
| GOOGLE_AI_API_KEY | xxx... |
| ANTHROPIC_API_KEY | sk-ant-xxx... |

### 3.3 Edge Function 생성
```bash
supabase functions new analyze-query
```

`supabase/functions/analyze-query/index.ts` 작성 후:
```bash
# 로컬 테스트
supabase functions serve analyze-query --env-file supabase/functions/.env

# 배포
supabase functions deploy analyze-query
```

---

## 4. 로컬 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

---

## 5. 빠른 테스트

### Edge Function 테스트 (cURL)
```bash
curl -X POST 'https://[PROJECT_REF].supabase.co/functions/v1/analyze-query' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [ANON_KEY]' \
  -d '{
    "query": "한국에서 가장 인기 있는 커피 브랜드는?",
    "domain": "starbucks.co.kr",
    "brand": "스타벅스"
  }'
```

### 예상 응답
```json
{
  "id": "uuid-xxx",
  "status": "completed",
  "results": {
    "perplexity": { "success": true, "citations": [...] },
    "chatgpt": { "success": true, "citations": [...] },
    "gemini": { "success": true, "citations": [...] },
    "claude": { "success": true, "citations": [...] }
  },
  "summary": {
    "totalCitations": 24,
    "myDomainCited": true,
    "myDomainCitationCount": 3
  }
}
```

---

## 6. 디렉토리 구조 확인

```
geo-analyzer/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── analysis/
│       ├── page.tsx
│       └── [id]/page.tsx
├── components/
│   ├── ui/
│   ├── layout/
│   │   └── Header.tsx
│   └── analysis/
│       ├── QueryInput.tsx
│       ├── LLMResultCard.tsx
│       └── AnalysisSummary.tsx
├── lib/
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── types.ts
├── hooks/
│   └── useAnalysis.ts
├── types/
│   └── index.ts
└── supabase/
    └── functions/
        └── analyze-query/
            └── index.ts
```

---

## 7. Vercel 배포 (선택)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 트러블슈팅

### Edge Function이 실행되지 않음
- Supabase Dashboard에서 함수 상태 확인
- Secrets가 올바르게 등록되었는지 확인
- `supabase functions deploy` 재실행

### LLM API 호출 실패
- API 키가 유효한지 확인
- API 사용량 한도 확인
- 네트워크 연결 확인

### CORS 에러
- Edge Function에 CORS 헤더 추가 확인
- `Access-Control-Allow-Origin: *` 설정 확인

---

## 다음 단계

1. `/speckit.tasks` 실행하여 세부 작업 목록 생성
2. 각 작업 순차적으로 구현
3. Phase 1 완료 후 Phase 2로 진행
