# AI 검토 의견 기반 RAG 대화 기능 구현 계획

> 작성일: 2025-12-16
> 상태: 구현 예정

## 1. 개요

FinalReview 컴포넌트에서 생성된 AI 최종 검토 의견을 기반으로 사용자가 추가 질문을 할 수 있는 대화 기능을 **Google Gemini File Search API**를 활용하여 구현합니다.

### 1.1 목표
- AI 최종 검토 의견 생성 후, 해당 검토 의견을 기반으로 대화 가능
- 분석 데이터를 Vector DB에 임베딩하여 RAG 기반 답변 제공
- 대화 이력을 Supabase DB에 저장하여 재방문 시 복원

### 1.2 기술 스택
- **RAG 엔진**: Google Gemini File Search API
- **백엔드**: Supabase Edge Functions (Deno)
- **프론트엔드**: React (Next.js 14)
- **데이터베이스**: Supabase (PostgreSQL)

---

## 2. 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 UI                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    ReviewChat                            │   │
│  │  ┌──────────────┐  ┌─────────────────────────────────┐  │   │
│  │  │ MessageList  │  │        ChatInput                │  │   │
│  │  │              │  │  [텍스트 입력] [전송]           │  │   │
│  │  │  User: ...   │  └─────────────────────────────────┘  │   │
│  │  │  AI: ...     │  ┌─────────────────────────────────┐  │   │
│  │  │              │  │    SuggestedQuestions           │  │   │
│  │  └──────────────┘  └─────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Supabase Edge Functions                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ review-chat-   │  │ review-chat-   │  │ review-chat-   │    │
│  │     init       │  │    message     │  │    history     │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘    │
└──────────┼───────────────────┼───────────────────┼──────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Gemini API                                   │
│  ┌────────────────────┐  ┌────────────────────────────────┐    │
│  │ File Search Store  │  │      generateContent           │    │
│  │ (임베딩 + 검색)     │  │   (file_search 도구 포함)      │    │
│  └────────────────────┘  └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase DB                                   │
│  ┌────────────────────┐  ┌────────────────────────────────┐    │
│  │ review_conversations│  │      review_messages           │    │
│  │ - gemini_store_id  │  │ - role (user/assistant)        │    │
│  │ - analysis_id      │  │ - content                      │    │
│  └────────────────────┘  └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Gemini File Search API 특징

| 특징 | 설명 |
|------|------|
| **RAG 내장** | 시맨틱 검색 기반, 키워드가 아닌 의미/컨텍스트 이해 |
| **비용 효율** | 임베딩 $0.15/1M 토큰 (1회), 저장/쿼리 무료 |
| **지원 모델** | gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash |
| **파일 형식** | PDF, Word, Excel, JSON, 텍스트 등 100+ 형식 |
| **용량 제한** | 파일당 100MB, 스토어당 권장 20GB 미만 |

### 3.1 API 엔드포인트

```
# Store 생성
POST https://generativelanguage.googleapis.com/v1beta/fileSearchStores

# 파일 업로드
POST https://generativelanguage.googleapis.com/v1beta/{storeName}:uploadFile

# 대화 생성 (file_search 도구 포함)
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

---

## 4. 데이터베이스 스키마

### 4.1 `review_conversations` 테이블

대화 세션 관리 테이블. 분석당 1개의 대화 세션 유지.

```sql
CREATE TABLE review_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,

  -- Gemini File Search Store 리소스 ID
  gemini_store_id TEXT NOT NULL,        -- fileSearchStores/{id}
  gemini_file_id TEXT,                  -- 업로드된 파일 ID

  -- 상태 관리
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deleted')),

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ,

  -- 분석당 1개 대화
  UNIQUE(analysis_id)
);

-- 인덱스
CREATE INDEX idx_review_conversations_analysis_id ON review_conversations(analysis_id);
CREATE INDEX idx_review_conversations_status ON review_conversations(status);
```

### 4.2 `review_messages` 테이블

대화 메시지 저장 테이블.

```sql
CREATE TABLE review_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES review_conversations(id) ON DELETE CASCADE,

  -- 메시지 정보
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,

  -- Gemini 인용 정보 (grounding_metadata)
  grounding_metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_review_messages_conversation_id ON review_messages(conversation_id);
CREATE INDEX idx_review_messages_created_at ON review_messages(created_at);
```

---

## 5. Edge Functions 설계

### 5.1 `review-chat-init` - 대화 초기화

**역할**: File Search Store 생성, 분석 데이터 업로드

**요청**:
```typescript
interface InitRequest {
  analysisId: string
}
```

**응답**:
```typescript
interface InitResponse {
  success: boolean
  conversationId?: string
  error?: string
}
```

**처리 흐름**:
1. 기존 대화 확인 (있으면 반환)
2. 분석 데이터 조회 (results, summary, final_review)
3. File Search Store 생성
4. JSON 파일로 분석 데이터 업로드 (임베딩 자동 생성)
5. DB 저장 및 conversationId 반환

**API 호출 예시**:
```typescript
// 1. Store 생성
const storeResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: `analysis-${analysisId}` })
  }
)

// 2. 파일 업로드 (임베딩 자동)
const formData = new FormData()
formData.append('file', new Blob([JSON.stringify(analysisData)], { type: 'application/json' }), 'analysis.json')

const uploadResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/${storeName}:uploadFile?key=${apiKey}`,
  {
    method: 'POST',
    body: formData
  }
)
```

### 5.2 `review-chat-message` - 메시지 전송

**역할**: 사용자 메시지 + RAG 검색 + Gemini 응답

**요청**:
```typescript
interface MessageRequest {
  conversationId: string
  message: string
}
```

**응답**:
```typescript
interface MessageResponse {
  success: boolean
  userMessage?: ReviewMessage
  assistantMessage?: ReviewMessage
  error?: string
}
```

**처리 흐름**:
1. conversation 조회 (gemini_store_id)
2. 최근 대화 이력 조회 (컨텍스트용, 최대 10개)
3. Gemini generateContent 호출 (file_search 도구 포함)
4. 응답에서 grounding_metadata (인용) 추출
5. 양쪽 메시지 DB 저장
6. 응답 반환

**API 호출 예시**:
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        // 시스템 프롬프트
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: '네, 이해했습니다.' }] },
        // 대화 이력
        ...conversationHistory,
        // 사용자 메시지
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      tools: [{
        file_search: {
          file_search_store_names: [storeId]
        }
      }]
    })
  }
)

// 인용 정보 추출
const groundingMetadata = response.candidates[0].grounding_metadata
```

### 5.3 `review-chat-history` - 대화 이력 조회

**역할**: 기존 대화 이력 로드 (재방문 시)

**요청**: `GET /functions/v1/review-chat-history?analysisId={id}`

**응답**:
```typescript
interface HistoryResponse {
  success: boolean
  conversationId?: string
  messages?: ReviewMessage[]
  error?: string
}
```

---

## 6. 프론트엔드 컴포넌트

### 6.1 ReviewChat 컴포넌트

**경로**: `components/analysis/ReviewChat.tsx`

**Props**:
```typescript
interface ReviewChatProps {
  analysisId: string
  finalReview: string | null
  query: string
  myDomain?: string
  myBrand?: string
}
```

### 6.2 UI 구조

```
ReviewChat
├── ChatHeader
│   ├── 제목: "AI 검토 의견 Q&A"
│   ├── 상태 배지 (활성/만료)
│   └── 접기/펼치기 버튼
│
├── MessageList (스크롤 영역)
│   ├── Message (role: user)
│   │   └── 오른쪽 정렬, 파란 배경
│   ├── Message (role: assistant)
│   │   └── 왼쪽 정렬, 마크다운 렌더링
│   └── TypingIndicator (로딩 시)
│
├── SuggestedQuestions
│   ├── "미노출 LLM에서 노출되려면?"
│   ├── "상위 경쟁사 분석해줘"
│   ├── "구체적인 콘텐츠 개선 방법은?"
│   └── "우선순위 높은 작업은?"
│
├── ChatInput
│   ├── Textarea (Enter: 전송, Shift+Enter: 줄바꿈)
│   └── SendButton (로딩 시 비활성화)
│
└── ChatFooter
    └── 면책 조항
```

### 6.3 FinalReview 통합

**파일**: `components/analysis/FinalReview.tsx`

검토 의견 마크다운 렌더링 하단에 ReviewChat 추가:

```tsx
{review && !isLoading && (
  <>
    {/* 기존 마크다운 렌더링 */}
    <div className="prose ...">
      <ReactMarkdown>{review}</ReactMarkdown>
    </div>

    {/* 면책 조항 */}
    <div className="mt-6 pt-4 border-t">
      <p className="text-xs text-muted-foreground">...</p>
    </div>

    {/* 새로운 채팅 섹션 */}
    <ReviewChat
      analysisId={analysisId}
      finalReview={review}
      query={query}
      myDomain={myDomain}
      myBrand={myBrand}
    />
  </>
)}
```

---

## 7. 타입 정의

**경로**: `types/reviewChat.ts`

```typescript
// 대화 세션
export interface ReviewConversation {
  id: string
  analysisId: string
  geminiStoreId: string      // fileSearchStores/{id}
  geminiFileId: string | null
  status: 'active' | 'expired' | 'deleted'
  createdAt: string
  lastMessageAt: string | null
}

// 대화 메시지
export interface ReviewMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  groundingMetadata?: {
    citations?: Array<{
      startIndex: number
      endIndex: number
      uri: string
      title: string
    }>
  }
  createdAt: string
}

// API 요청/응답
export interface ChatInitRequest {
  analysisId: string
}

export interface ChatInitResponse {
  success: boolean
  conversationId?: string
  error?: string
}

export interface ChatMessageRequest {
  conversationId: string
  message: string
}

export interface ChatMessageResponse {
  success: boolean
  userMessage?: ReviewMessage
  assistantMessage?: ReviewMessage
  error?: string
}
```

---

## 8. 시스템 프롬프트

```typescript
const systemPrompt = `당신은 GEO(Generative Engine Optimization) 전문 컨설턴트입니다.

file_search 도구를 사용하여 업로드된 분석 데이터를 검색하고 답변하세요.

## 역할
- AI 검색 엔진(Perplexity, ChatGPT, Gemini, Claude) 분석 결과 기반 답변
- 실제 데이터 수치를 인용하여 구체적 조언 제공
- LLM별 차이점 분석 및 맞춤 전략 제시
- 실행 가능한 GEO 개선 방안 제안

## 규칙
- 항상 분석 데이터에서 관련 정보를 검색하세요
- 추측하지 말고 데이터 기반으로 답변하세요
- 한국어로 답변하세요
- 답변 시 어떤 데이터를 참조했는지 명시하세요

## 답변 형식
- 마크다운 형식 사용
- 구체적인 수치와 LLM 이름 포함
- 실행 가능한 액션 아이템 제시`
```

---

## 9. 비용 분석

| 항목 | 비용 | 비고 |
|------|------|------|
| 임베딩 생성 | $0.15 / 1M 토큰 | 최초 1회 |
| 파일 저장 | 무료 | - |
| 쿼리 시 임베딩 | 무료 | - |
| 검색된 문서 토큰 | ~$0.075 / 1M 토큰 | 일반 입력 토큰 가격 |
| generateContent | 모델별 가격 | gemini-2.5-flash 권장 |

**예상 비용** (분석당):
- 초기 임베딩: ~50KB JSON → ~$0.001
- 대화당: ~$0.01 (검색 + 생성)
- 월 1,000건 대화: ~$10

---

## 10. 구현 순서

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| 1 | DB 마이그레이션 | Supabase MCP | 10분 |
| 2 | 타입 정의 | `types/reviewChat.ts` | 10분 |
| 3 | review-chat-init Edge Function | `supabase/functions/review-chat-init/index.ts` | 30분 |
| 4 | review-chat-message Edge Function | `supabase/functions/review-chat-message/index.ts` | 30분 |
| 5 | review-chat-history Edge Function | `supabase/functions/review-chat-history/index.ts` | 15분 |
| 6 | ReviewChat 컴포넌트 | `components/analysis/ReviewChat.tsx` | 45분 |
| 7 | FinalReview 통합 | `components/analysis/FinalReview.tsx` | 15분 |

---

## 11. 참고 문서

- [Gemini File Search API 공식 문서](https://ai.google.dev/gemini-api/docs/file-search?hl=ko)
- [Gemini API 가격](https://ai.google.dev/pricing)
- [Supabase Edge Functions 가이드](https://supabase.com/docs/guides/functions)
