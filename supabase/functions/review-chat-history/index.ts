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

interface HistoryRequest {
  analysisId: string
}

interface ReviewMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  grounding_metadata: Record<string, unknown>
  created_at: string
}

interface HistoryResponse {
  success: boolean
  conversationId?: string
  status?: 'active' | 'expired' | 'deleted'
  messages?: ReviewMessage[]
  error?: string
}

/**
 * review-chat-history Edge Function
 * 기존 대화 이력 조회
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
    const { analysisId }: HistoryRequest = await req.json()

    if (!analysisId) {
      return new Response(
        JSON.stringify({ success: false, error: 'analysisId is required' }),
        {
          status: 400,
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
      .eq('analysis_id', analysisId)
      .single()

    if (convError || !conversation) {
      // 대화가 없는 경우 - 에러가 아닌 빈 결과 반환
      return new Response(
        JSON.stringify({
          success: true,
          conversationId: null,
          status: null,
          messages: [],
        } as HistoryResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[DEBUG] Found conversation:', conversation.id)

    // 2. 메시지 조회 (시간순 정렬)
    const { data: messages, error: msgError } = await supabase
      .from('review_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('[ERROR] Failed to fetch messages:', msgError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch messages' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[DEBUG] Found', messages?.length ?? 0, 'messages')

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: conversation.id,
        status: conversation.status,
        messages: messages || [],
      } as HistoryResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('[ERROR] review-chat-history error:', error)
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
