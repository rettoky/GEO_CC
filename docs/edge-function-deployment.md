# Edge Function 배포 가이드

GEO Analyzer의 `analyze-query` Edge Function을 배포하는 방법을 설명합니다.

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [Supabase CLI 설치](#supabase-cli-설치)
3. [프로젝트 연결](#프로젝트-연결)
4. [환경 변수 설정](#환경-변수-설정)
5. [Edge Function 배포](#edge-function-배포)
6. [배포 확인](#배포-확인)
7. [로컬 테스트](#로컬-테스트)
8. [문제 해결](#문제-해결)

---

## 사전 요구사항

- Node.js 18+ 설치
- Supabase 프로젝트 생성 완료
- LLM API 키 준비 (선택사항):
  - `PERPLEXITY_API_KEY`
  - `OPENAI_API_KEY`
  - `GOOGLE_AI_API_KEY`
  - `ANTHROPIC_API_KEY`

> **참고**: API 키가 없는 LLM은 실패하지만, 나머지 LLM은 정상적으로 작동합니다.

---

## Supabase CLI 설치

```bash
# npm을 사용하여 설치
npm install -g supabase

# 설치 확인
supabase --version
```

---

## 프로젝트 연결

```bash
# Supabase 로그인
supabase login

# 프로젝트 연결 (프로젝트 루트에서 실행)
supabase link --project-ref <your-project-ref>
```

프로젝트 레퍼런스는 다음에서 확인:
- Supabase Dashboard → Settings → General → Reference ID
- 또는 프로젝트 URL: `https://<your-project-ref>.supabase.co`

---

## 환경 변수 설정

Edge Function에서 사용할 API 키를 Supabase Secrets로 등록합니다.

### 1. Supabase Dashboard에서 설정

1. Dashboard → Settings → Edge Functions → Secrets
2. 각 API 키를 추가:

```
PERPLEXITY_API_KEY=your-perplexity-key
OPENAI_API_KEY=your-openai-key
GOOGLE_AI_API_KEY=your-google-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### 2. CLI로 설정 (선택사항)

```bash
# 개별 설정
supabase secrets set PERPLEXITY_API_KEY=your-perplexity-key
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set GOOGLE_AI_API_KEY=your-google-key
supabase secrets set ANTHROPIC_API_KEY=your-anthropic-key

# 설정 확인
supabase secrets list
```

> **자동 주입되는 환경 변수**:
> - `SUPABASE_URL`: 자동으로 주입됨
> - `SUPABASE_ANON_KEY`: 자동으로 주입됨

---

## Edge Function 배포

### 디렉토리 구조 확인

```
supabase/
└── functions/
    └── analyze-query/
        ├── index.ts          # 메인 핸들러
        └── llm/
            ├── types.ts      # 타입 정의
            ├── perplexity.ts # Perplexity API 클라이언트
            ├── openai.ts     # OpenAI API 클라이언트
            ├── gemini.ts     # Gemini API 클라이언트
            └── claude.ts     # Claude API 클라이언트
```

### 배포 명령어

```bash
# analyze-query 함수 배포
supabase functions deploy analyze-query

# 모든 함수 배포
supabase functions deploy
```

### 배포 옵션

```bash
# 특정 import map 사용
supabase functions deploy analyze-query --import-map import_map.json

# 디버그 모드로 배포
supabase functions deploy analyze-query --debug

# 로컬에서 즉시 제공 (배포 전 테스트)
supabase functions serve analyze-query
```

---

## 배포 확인

### 1. Dashboard에서 확인

1. Supabase Dashboard → Edge Functions
2. `analyze-query` 함수 확인
3. Status가 "Active"인지 확인

### 2. CLI로 확인

```bash
# 함수 목록 확인
supabase functions list

# 함수 상태 확인
supabase functions inspect analyze-query
```

### 3. 로그 확인

```bash
# 실시간 로그 모니터링
supabase functions logs analyze-query --follow

# 최근 로그 확인
supabase functions logs analyze-query --limit 50
```

---

## 로컬 테스트

### 1. 로컬 Edge Function 실행

```bash
# Edge Function 로컬 서버 시작
supabase functions serve analyze-query
```

로컬 URL: `http://localhost:54321/functions/v1/analyze-query`

### 2. 테스트 요청

```bash
# curl로 테스트
curl -X POST http://localhost:54321/functions/v1/analyze-query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "query": "best marketing tools 2024",
    "domain": "example.com",
    "brand": "Example"
  }'
```

### 3. 프로덕션 테스트

```bash
# 프로덕션 Edge Function 테스트
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/analyze-query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "query": "best marketing tools 2024",
    "domain": "example.com",
    "brand": "Example"
  }'
```

---

## Next.js API Proxy 연동

Edge Function은 Next.js API Route를 통해 호출됩니다:

```typescript
// app/api/analyze/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data, error } = await supabase.functions.invoke('analyze-query', {
    body: { query, domain, brand }
  })

  return NextResponse.json(data)
}
```

프론트엔드에서는 다음과 같이 호출:

```typescript
// hooks/useAnalysis.ts
const res = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, domain, brand })
})

const response: AnalyzeResponse = await res.json()
```

---

## 문제 해결

### 1. 배포 실패

```bash
# 에러 로그 확인
supabase functions logs analyze-query --limit 100

# Edge Function 상태 확인
supabase functions inspect analyze-query
```

### 2. API 키 오류

```bash
# Secrets 확인
supabase secrets list

# 올바른 키인지 확인하고 재설정
supabase secrets set PERPLEXITY_API_KEY=your-correct-key
```

### 3. CORS 오류

Edge Function의 CORS 헤더가 올바르게 설정되어 있는지 확인:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```

### 4. 타임아웃 오류

LLM API 호출이 느릴 수 있습니다. `Promise.allSettled`를 사용하여 부분 실패를 허용:

```typescript
const results = await Promise.allSettled([
  callPerplexity(query),
  callOpenAI(query),
  callGemini(query),
  callClaude(query),
])
```

### 5. 로컬 테스트 실패

```bash
# Supabase 로컬 스택 시작
supabase start

# Edge Function 재시작
supabase functions serve analyze-query --env-file ./supabase/.env.local
```

---

## 성능 최적화

### 1. 병렬 처리

4개 LLM API를 동시에 호출하여 응답 시간 단축:

```typescript
const results = await Promise.allSettled([...])
```

### 2. 부분 실패 허용

한 LLM이 실패해도 나머지는 계속 작동:

```typescript
if (result.status === 'fulfilled') {
  analysisResults.perplexity = result.value
} else {
  analysisResults.perplexity = null
}
```

### 3. 응답 시간 추적

각 LLM의 응답 시간을 측정하여 성능 모니터링:

```typescript
const startTime = Date.now()
// ... API 호출
const responseTime = Date.now() - startTime
```

---

## 추가 리소스

- [Supabase Edge Functions 공식 문서](https://supabase.com/docs/guides/functions)
- [Deno Deploy 문서](https://deno.com/deploy/docs)
- [JSR 패키지 레지스트리](https://jsr.io/)

---

## 배포 체크리스트

- [ ] Supabase CLI 설치 완료
- [ ] 프로젝트 연결 완료
- [ ] API 키 Secrets 등록 완료
- [ ] Edge Function 배포 완료
- [ ] 로컬 테스트 성공
- [ ] 프로덕션 테스트 성공
- [ ] Next.js API Proxy 연동 완료
- [ ] 로그 모니터링 설정 완료

---

**마지막 업데이트**: 2025-12-02
