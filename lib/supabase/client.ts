import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Supabase 브라우저 클라이언트
 * 클라이언트 컴포넌트에서 사용
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 빌드 시점(SSR)에는 placeholder 사용, 런타임(브라우저)에서는 실제 값 필요
  if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
    console.error('Supabase 환경 변수가 설정되지 않았습니다. Vercel 환경 변수를 확인하세요.')
  }

  return createBrowserClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
  )
}
