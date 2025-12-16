/**
 * Review Chat 기능 관련 타입 정의
 * Google Gemini File Search API 기반 RAG 대화
 */

// ============================================
// Database Types
// ============================================

/**
 * 대화 세션 (review_conversations 테이블)
 */
export interface ReviewConversation {
  id: string
  analysis_id: string
  gemini_store_id: string      // fileSearchStores/{id}
  gemini_file_id: string | null
  status: 'active' | 'expired' | 'deleted'
  created_at: string
  updated_at: string
  last_message_at: string | null
}

/**
 * 대화 메시지 (review_messages 테이블)
 */
export interface ReviewMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  grounding_metadata: GroundingMetadata
  created_at: string
}

/**
 * Gemini grounding_metadata (인용 정보)
 */
export interface GroundingMetadata {
  citations?: GroundingCitation[]
  search_entry_point?: {
    rendered_content: string
  }
  retrieval_metadata?: {
    web_dynamic_retrieval_score: number
  }
}

export interface GroundingCitation {
  start_index: number
  end_index: number
  uri: string
  title: string
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * 대화 초기화 요청
 */
export interface ChatInitRequest {
  analysisId: string
}

/**
 * 대화 초기화 응답
 */
export interface ChatInitResponse {
  success: boolean
  conversationId?: string
  existingConversation?: boolean  // 기존 대화가 있으면 true
  error?: string
}

/**
 * 메시지 전송 요청
 */
export interface ChatMessageRequest {
  conversationId: string
  message: string
}

/**
 * 메시지 전송 응답
 */
export interface ChatMessageResponse {
  success: boolean
  userMessage?: ReviewMessage
  assistantMessage?: ReviewMessage
  error?: string
}

/**
 * 대화 이력 조회 요청
 */
export interface ChatHistoryRequest {
  analysisId: string
}

/**
 * 대화 이력 조회 응답
 */
export interface ChatHistoryResponse {
  success: boolean
  conversationId?: string
  status?: 'active' | 'expired' | 'deleted'
  messages?: ReviewMessage[]
  error?: string
}

// ============================================
// Frontend State Types
// ============================================

/**
 * 프론트엔드 메시지 표시용
 */
export interface ChatMessageUI {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  isStreaming?: boolean  // 스트리밍 중 여부
  citations?: GroundingCitation[]
}

/**
 * ReviewChat 컴포넌트 상태
 */
export interface ReviewChatState {
  isInitialized: boolean
  isLoading: boolean
  conversationId: string | null
  messages: ChatMessageUI[]
  error: string | null
}

// ============================================
// Gemini API Types
// ============================================

/**
 * Gemini File Search Store
 */
export interface GeminiFileSearchStore {
  name: string  // fileSearchStores/{id}
  displayName: string
  createTime: string
  updateTime: string
}

/**
 * Gemini generateContent 요청 (file_search 도구 포함)
 */
export interface GeminiGenerateContentRequest {
  contents: GeminiContent[]
  tools?: GeminiTool[]
  generationConfig?: {
    temperature?: number
    maxOutputTokens?: number
  }
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export interface GeminiPart {
  text: string
}

export interface GeminiTool {
  file_search?: {
    file_search_store_names: string[]
    metadata_filter?: string
  }
}

/**
 * Gemini generateContent 응답
 */
export interface GeminiGenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
      role: string
    }
    finishReason: string
    groundingMetadata?: GroundingMetadata
  }>
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}
