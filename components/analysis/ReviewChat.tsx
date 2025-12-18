'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { ChatMessageUI, ReviewChatState } from '@/types'

interface ReviewChatProps {
  analysisId: string
  finalReview: string | null
  query?: string  // 향후 컨텍스트 표시용
  myDomain?: string  // 향후 컨텍스트 표시용
  myBrand?: string  // 향후 컨텍스트 표시용
}

/**
 * 예시 질문 목록
 */
const SUGGESTED_QUESTIONS = [
  '브랜드 노출을 개선하기 위한 구체적인 전략은?',
  'LLM별로 다르게 접근해야 할 점은 무엇인가요?',
  '경쟁사 대비 우리의 강점과 약점은?',
  '가장 우선적으로 개선해야 할 사항은?',
]

/**
 * ReviewChat 컴포넌트
 * AI 검토 의견 기반 RAG 대화 기능
 */
export function ReviewChat({
  analysisId,
  finalReview,
  query: _query,
  myDomain: _myDomain,
  myBrand: _myBrand,
}: ReviewChatProps) {
  // 향후 사용 예정 props (컨텍스트 표시용)
  void _query
  void _myDomain
  void _myBrand
  const [state, setState] = useState<ReviewChatState>({
    isInitialized: false,
    isLoading: false,
    conversationId: null,
    messages: [],
    error: null,
  })
  const [inputMessage, setInputMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 메시지 목록 스크롤
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [state.messages, scrollToBottom])

  // 대화 이력 조회
  const loadHistory = useCallback(async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/review-chat-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ analysisId }),
      })

      const data = await response.json()

      if (data.success && data.conversationId) {
        const messages: ChatMessageUI[] = (data.messages || []).map((msg: {
          id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
          grounding_metadata?: { citations?: Array<{ start_index: number; end_index: number; uri: string; title: string }> }
        }) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.created_at,
          citations: msg.grounding_metadata?.citations,
        }))

        setState((prev) => ({
          ...prev,
          isInitialized: true,
          conversationId: data.conversationId,
          messages,
        }))
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to load history:', err)
      return false
    }
  }, [analysisId])

  // 대화 초기화
  const initializeChat = useCallback(async () => {
    if (state.isLoading) return

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // 먼저 이력 확인
      const hasHistory = await loadHistory()
      if (hasHistory) {
        setState((prev) => ({ ...prev, isLoading: false }))
        return
      }

      // 새 대화 초기화
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/review-chat-init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ analysisId }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '대화 초기화에 실패했습니다.')
      }

      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        conversationId: data.conversationId,
        messages: [],
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
      }))
    }
  }, [analysisId, loadHistory, state.isLoading])

  // 채팅 열기 시 초기화
  useEffect(() => {
    if (isExpanded && !state.isInitialized && !state.isLoading) {
      initializeChat()
    }
  }, [isExpanded, state.isInitialized, state.isLoading, initializeChat])

  // 메시지 전송
  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim()
    if (!text || !state.conversationId || isSending) return

    setIsSending(true)
    setInputMessage('')

    // 낙관적 UI 업데이트 - 사용자 메시지 추가
    const tempUserMsg: ChatMessageUI = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }

    // 로딩 메시지 추가
    const tempAssistantMsg: ChatMessageUI = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    }

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, tempUserMsg, tempAssistantMsg],
    }))

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/review-chat-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          conversationId: state.conversationId,
          message: text,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '메시지 전송에 실패했습니다.')
      }

      // 실제 메시지로 교체
      setState((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2).concat([
          {
            id: data.userMessage?.id || tempUserMsg.id,
            role: 'user',
            content: text,
            createdAt: data.userMessage?.created_at || tempUserMsg.createdAt,
          },
          {
            id: data.assistantMessage?.id || tempAssistantMsg.id,
            role: 'assistant',
            content: data.assistantMessage?.content || '',
            createdAt: data.assistantMessage?.created_at || tempAssistantMsg.createdAt,
            citations: data.assistantMessage?.grounding_metadata?.citations,
          },
        ]),
      }))
    } catch (err) {
      // 에러 시 임시 메시지 제거
      setState((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
        error: err instanceof Error ? err.message : '메시지 전송 실패',
      }))
    } finally {
      setIsSending(false)
    }
  }

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950/30 dark:via-gray-900 dark:to-cyan-950/30 overflow-hidden mt-6">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            현재 분석 결과에 대해서 AI 컨설턴트와 대화하기
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              RAG 기반
            </Badge>
          </CardTitle>
          {finalReview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  접기
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  펼치기
                </>
              )}
            </Button>
          )}
        </div>
        {!isExpanded && finalReview && (
          <p className="text-sm text-muted-foreground mt-2">
            분석 데이터를 기반으로 GEO 개선 전략에 대해 AI와 대화해보세요.
          </p>
        )}
        {!finalReview && (
          <p className="text-sm text-muted-foreground mt-2">
            먼저 위의 &quot;검토 의견 생성&quot; 버튼을 클릭하여 AI 검토 의견을 생성해주세요.
          </p>
        )}
      </CardHeader>

      {isExpanded && finalReview && (
        <CardContent className="pt-4">
          {/* 로딩 상태 */}
          {state.isLoading && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-muted-foreground">대화를 준비하는 중...</p>
            </div>
          )}

          {/* 에러 상태 */}
          {state.error && !state.isLoading && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm text-destructive mb-3">{state.error}</p>
              <Button variant="outline" size="sm" onClick={initializeChat}>
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            </div>
          )}

          {/* 대화 영역 */}
          {state.isInitialized && !state.isLoading && (
            <div className="space-y-4">
              {/* 메시지 목록 */}
              <div className="h-[400px] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {state.messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
                      <Bot className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      대화를 시작해보세요
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      아래 예시 질문을 클릭하거나, 직접 질문을 입력해주세요.
                    </p>
                  </div>
                )}

                {state.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* 아바타 */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.role === 'user'
                          ? 'bg-blue-600'
                          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-white" />
                      )}
                    </div>

                    {/* 메시지 내용 */}
                    <div
                      className={`flex-1 max-w-[80%] ${
                        msg.role === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-block px-4 py-2.5 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        {msg.isStreaming ? (
                          <div className="flex items-center gap-2 py-1">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">응답 생성 중...</span>
                          </div>
                        ) : msg.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p className="text-sm leading-relaxed mb-2 last:mb-0">
                                    {children}
                                  </p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="text-sm space-y-1 my-2 pl-4 list-disc">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="text-sm space-y-1 my-2 pl-4 list-decimal">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="text-sm">{children}</li>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold">{children}</strong>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="font-semibold text-sm mt-3 mb-1">{children}</h3>
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* 예시 질문 */}
              {state.messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5 px-3"
                      onClick={() => sendMessage(q)}
                      disabled={isSending}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              )}

              {/* 입력 영역 */}
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="질문을 입력하세요... (Shift+Enter로 줄바꿈)"
                  className="min-h-[44px] max-h-[120px] resize-none"
                  disabled={isSending}
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isSending}
                  className="h-[44px] px-4"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* 면책 조항 */}
              <p className="text-[10px] text-muted-foreground text-center">
                이 대화는 Gemini AI가 분석 데이터를 기반으로 생성합니다. 참고용으로만 활용해주세요.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
