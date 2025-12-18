// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * CORS 헤더 설정
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MessageRequest {
  conversationId: string
  message: string
}

interface ReviewMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  grounding_metadata: Record<string, unknown>
  created_at: string
}

interface MessageResponse {
  success: boolean
  userMessage?: ReviewMessage
  assistantMessage?: ReviewMessage
  error?: string
}

/**
 * 시스템 프롬프트
 */
const SYSTEM_PROMPT = `당신은 GEO(Generative Engine Optimization) 전문 컨설턴트입니다.

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

/**
 * review-chat-message Edge Function
 * 사용자 메시지 전송 및 Gemini 응답 생성 (file_search RAG)
 */
Deno.serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const { conversationId, message }: MessageRequest = await req.json()

    if (!conversationId || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'conversationId and message are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Google AI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Conversation 조회
    const { data: conversation, error: convError } = await supabase
      .from('review_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ success: false, error: 'Conversation not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (conversation.status !== 'active') {
      return new Response(
        JSON.stringify({ success: false, error: 'Conversation is not active' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 2. 최근 대화 이력 조회 (컨텍스트용, 최대 10개)
    const { data: recentMessages } = await supabase
      .from('review_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10)

    // 3. Gemini API 호출 (file_search 도구 포함)
    const contents = buildContents(recentMessages || [], message)

    console.log('[DEBUG] Calling Gemini with file_search...')
    console.log('[DEBUG] Store ID:', conversation.gemini_store_id)
    console.log('[DEBUG] File ID:', conversation.gemini_file_id)

    const requestBody = {
      contents,
      tools: [{
        file_search: {
          file_search_store_names: [conversation.gemini_store_id],
        },
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }
    console.log('[DEBUG] Request body tools:', JSON.stringify(requestBody.tools))

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('[ERROR] Gemini API error:', errorText)
      return new Response(
        JSON.stringify({ success: false, error: `Gemini API error: ${geminiResponse.status}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const geminiData = await geminiResponse.json()
    console.log('[DEBUG] Gemini response received')
    console.log('[DEBUG] Full Gemini response:', JSON.stringify(geminiData).substring(0, 2000))

    // 4. 응답 추출
    const assistantContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const groundingMetadata = geminiData.candidates?.[0]?.groundingMetadata || {}

    // File search 결과 로깅
    console.log('[DEBUG] Grounding metadata:', JSON.stringify(groundingMetadata))
    if (groundingMetadata.groundingChunks) {
      console.log('[DEBUG] Grounding chunks count:', groundingMetadata.groundingChunks.length)
    }
    if (groundingMetadata.retrievalMetadata) {
      console.log('[DEBUG] Retrieval metadata:', JSON.stringify(groundingMetadata.retrievalMetadata))
    }

    if (!assistantContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty response from Gemini' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 5. 사용자 메시지 저장
    const { data: userMsg, error: userMsgError } = await supabase
      .from('review_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        grounding_metadata: {},
      })
      .select()
      .single()

    if (userMsgError) {
      console.error('[ERROR] Failed to save user message:', userMsgError)
    }

    // 6. Assistant 메시지 저장
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('review_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantContent,
        grounding_metadata: groundingMetadata,
      })
      .select()
      .single()

    if (assistantMsgError) {
      console.error('[ERROR] Failed to save assistant message:', assistantMsgError)
    }

    // 7. Conversation 업데이트 (last_message_at)
    await supabase
      .from('review_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    return new Response(
      JSON.stringify({
        success: true,
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      } as MessageResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('[ERROR] review-chat-message error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Gemini API용 contents 배열 생성
 */
function buildContents(
  recentMessages: Array<{ role: string; content: string }>,
  newMessage: string
): Array<{ role: string; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

  // 시스템 프롬프트 (user → model 패턴)
  contents.push({
    role: 'user',
    parts: [{ text: SYSTEM_PROMPT }],
  })
  contents.push({
    role: 'model',
    parts: [{ text: '네, 이해했습니다. GEO 전문 컨설턴트로서 분석 데이터를 기반으로 답변하겠습니다.' }],
  })

  // 기존 대화 이력
  for (const msg of recentMessages) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })
  }

  // 새 사용자 메시지
  contents.push({
    role: 'user',
    parts: [{ text: newMessage }],
  })

  return contents
}
