import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Supabase 브라우저 클라이언트
 * 클라이언트 컴포넌트에서 사용
 */
export function createClient() {
  // 빌드 시점에 환경 변수가 없을 수 있으므로 기본값 제공
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
