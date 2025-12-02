# Phase 3 설계서
## 02. 인증 시스템 (Supabase Auth)

---

## Phase 정보
| 항목 | 내용 |
|------|------|
| Phase | 3 - 고급 기능 |
| 문서 | 02/03 |
| 예상 기간 | 3-4일 |
| 선행 작업 | Phase3_01_PageAnalysis 완료 |

---

## 1. 개요

### 1.1 목표
- Supabase Auth를 이용한 사용자 인증
- 이메일/비밀번호 로그인
- Google OAuth 소셜 로그인
- 사용자별 데이터 분리 (RLS)
- 세션 관리

### 1.2 산출물
- [ ] 로그인/회원가입 페이지
- [ ] 인증 미들웨어
- [ ] RLS 정책 설정
- [ ] 보호된 라우트 구현
- [ ] 사용자 프로필 페이지

---

## 2. Supabase Auth 설정

### Task 3.2.1: Supabase Dashboard 설정

#### 작업 내용

**1. Authentication 설정**

Supabase Dashboard > Authentication > Providers:

```
Email:
- Enable Email provider: ON
- Confirm email: ON (프로덕션) / OFF (개발)
- Secure email change: ON

Google:
- Enable Google provider: ON
- Client ID: [Google Cloud Console에서 생성]
- Client Secret: [Google Cloud Console에서 생성]
```

**2. URL Configuration**

Supabase Dashboard > Authentication > URL Configuration:

```
Site URL: https://your-domain.vercel.app (또는 http://localhost:3000)
Redirect URLs:
  - http://localhost:3000/auth/callback
  - https://your-domain.vercel.app/auth/callback
```

**3. Email Templates (선택)**

Supabase Dashboard > Authentication > Email Templates:
- Confirm signup
- Reset password
- Magic link

#### 체크리스트
- [ ] Email provider 활성화
- [ ] Google OAuth 설정 (선택)
- [ ] URL Configuration 완료
- [ ] Email Templates 커스터마이징 (선택)

---

### Task 3.2.2: 데이터베이스 RLS 설정

#### 작업 내용

```sql
-- ============================================
-- GEO Analyzer: Row Level Security (RLS)
-- ============================================

-- 1. users 프로필 테이블 (Supabase Auth와 연동)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    company TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. 기존 테이블에 user_id 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE page_analyses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analyses ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책: profiles
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- 5. RLS 정책: projects
CREATE POLICY "Users can view own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- 6. RLS 정책: queries (프로젝트 기반)
CREATE POLICY "Users can view queries of own projects"
    ON queries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = queries.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert queries to own projects"
    ON queries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = queries.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update queries of own projects"
    ON queries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = queries.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete queries of own projects"
    ON queries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = queries.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- 7. RLS 정책: competitors (프로젝트 기반)
CREATE POLICY "Users can view competitors of own projects"
    ON competitors FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = competitors.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert competitors to own projects"
    ON competitors FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = competitors.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete competitors of own projects"
    ON competitors FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = competitors.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- 8. RLS 정책: analyses
CREATE POLICY "Users can view own analyses"
    ON analyses FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own analyses"
    ON analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own analyses"
    ON analyses FOR DELETE
    USING (auth.uid() = user_id);

-- 9. RLS 정책: page_analyses
CREATE POLICY "Users can view own page analyses"
    ON page_analyses FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own page analyses"
    ON page_analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 10. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_page_analyses_user_id ON page_analyses(user_id);
```

#### 체크리스트
- [ ] profiles 테이블 생성
- [ ] user_id 컬럼 추가
- [ ] RLS 활성화
- [ ] RLS 정책 생성

---

## 3. 프론트엔드 인증 구현

### Task 3.2.3: Supabase Auth 클라이언트 설정

#### 작업 내용

**lib/supabase/auth.ts** 생성:

```typescript
import { createClient } from './client'
import { createServerClient } from './server'
import type { User, Session } from '@supabase/supabase-js'

// 클라이언트 사이드 인증 함수들

// 회원가입
export async function signUp(email: string, password: string, fullName?: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })
  
  return { data, error }
}

// 로그인
export async function signIn(email: string, password: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  return { data, error }
}

// Google 로그인
export async function signInWithGoogle() {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  
  return { data, error }
}

// 로그아웃
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

// 비밀번호 재설정 이메일
export async function resetPassword(email: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  
  return { data, error }
}

// 비밀번호 업데이트
export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  
  return { data, error }
}

// 현재 사용자 가져오기
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// 세션 가져오기
export async function getSession(): Promise<Session | null> {
  const supabase = createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// 프로필 가져오기
export async function getProfile(userId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

// 프로필 업데이트
export async function updateProfile(userId: string, updates: {
  full_name?: string
  company?: string
  avatar_url?: string
}) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  return { data, error }
}
```

#### 체크리스트
- [ ] auth.ts 생성 완료
- [ ] 모든 인증 함수 구현

---

### Task 3.2.4: 인증 Context 및 Hook

#### 작업 내용

**contexts/AuthContext.tsx** 생성:

```typescript
'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    // 초기 세션 가져오기
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    }

    getInitialSession()

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

**app/layout.tsx** 수정:

```typescript
import { AuthProvider } from '@/contexts/AuthContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {/* 기존 레이아웃 */}
        </AuthProvider>
      </body>
    </html>
  )
}
```

#### 체크리스트
- [ ] AuthContext.tsx 생성 완료
- [ ] layout.tsx에 AuthProvider 추가

---

### Task 3.2.5: 로그인 페이지

#### 작업 내용

**app/login/page.tsx**:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { signIn, signInWithGoogle } from '@/lib/supabase/auth'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { data, error } = await signIn(email, password)

    if (error) {
      toast({
        title: '로그인 실패',
        description: error.message,
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    toast({ title: '로그인 성공' })
    router.push('/')
    router.refresh()
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    const { error } = await signInWithGoogle()
    
    if (error) {
      toast({
        title: 'Google 로그인 실패',
        description: error.message,
        variant: 'destructive',
      })
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">GEO Analyzer</CardTitle>
          <CardDescription>계정에 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">비밀번호</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  비밀번호 찾기
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              로그인
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">또는</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Google로 계속하기
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-primary hover:underline">
              회원가입
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
```

shadcn 컴포넌트 추가:
```bash
npx shadcn@latest add separator
```

#### 체크리스트
- [ ] login/page.tsx 생성 완료
- [ ] 이메일 로그인 동작
- [ ] Google 로그인 동작

---

### Task 3.2.6: 회원가입 페이지

#### 작업 내용

**app/signup/page.tsx**:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle } from 'lucide-react'
import { signUp } from '@/lib/supabase/auth'
import { useToast } from '@/hooks/use-toast'

export default function SignUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: '비밀번호 불일치',
        description: '비밀번호가 일치하지 않습니다.',
        variant: 'destructive',
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: '비밀번호 오류',
        description: '비밀번호는 6자 이상이어야 합니다.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    const { data, error } = await signUp(
      formData.email,
      formData.password,
      formData.fullName
    )

    setIsLoading(false)

    if (error) {
      toast({
        title: '회원가입 실패',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <CardTitle>이메일을 확인해주세요</CardTitle>
            <CardDescription>
              {formData.email}로 인증 링크를 보냈습니다.
              <br />
              이메일을 확인하고 링크를 클릭하여 가입을 완료하세요.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/login">
              <Button variant="outline">로그인 페이지로</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>GEO Analyzer 계정을 만드세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">이름</Label>
              <Input
                id="fullName"
                placeholder="홍길동"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 *</Label>
              <Input
                id="password"
                type="password"
                placeholder="6자 이상"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              회원가입
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
```

#### 체크리스트
- [ ] signup/page.tsx 생성 완료
- [ ] 회원가입 동작
- [ ] 이메일 인증 안내 표시

---

### Task 3.2.7: OAuth Callback 처리

#### 작업 내용

**app/auth/callback/route.ts**:

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // 에러 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

#### 체크리스트
- [ ] auth/callback/route.ts 생성 완료

---

### Task 3.2.8: 보호된 라우트 미들웨어

#### 작업 내용

**middleware.ts** (프로젝트 루트):

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // 보호된 라우트 목록
  const protectedRoutes = ['/projects', '/dashboard', '/profile']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // 인증 필요한 페이지에서 미인증 시 로그인으로 리다이렉트
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 이미 로그인된 상태에서 로그인/회원가입 페이지 접근 시 홈으로
  const authRoutes = ['/login', '/signup']
  const isAuthRoute = authRoutes.includes(request.nextUrl.pathname)
  
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
```

#### 체크리스트
- [ ] middleware.ts 생성 완료
- [ ] 보호된 라우트 리다이렉트 동작

---

### Task 3.2.9: Header에 사용자 정보 표시

#### 작업 내용

**components/layout/Header.tsx** 수정:

```typescript
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, LogOut, Settings } from 'lucide-react'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, signOut } = useAuth()

  const navItems = [
    { href: '/', label: '분석하기' },
    { href: '/analysis', label: '분석 기록' },
    { href: '/projects', label: '프로젝트', protected: true },
    { href: '/dashboard', label: '대시보드', protected: true },
    { href: '/page-analysis', label: '페이지 분석' },
  ]

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // 로그인 여부에 따라 표시할 네비게이션 필터링
  const visibleNavItems = navItems.filter(item => 
    !item.protected || user
  )

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            GEO Analyzer
          </Link>
          <nav className="hidden md:flex gap-6">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm transition-colors hover:text-primary',
                  pathname === item.href
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.user_metadata?.full_name || '사용자'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  프로필
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  설정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">로그인</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">회원가입</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
```

shadcn 컴포넌트 추가:
```bash
npx shadcn@latest add avatar
```

#### 체크리스트
- [ ] Header.tsx 수정 완료
- [ ] 사용자 드롭다운 메뉴 동작

---

## 4. 데이터 마이그레이션

### Task 3.2.10: 기존 데이터 처리

#### 작업 내용

기존에 user_id 없이 생성된 데이터 처리:

```sql
-- 옵션 1: 기존 데이터를 특정 관리자에게 할당
-- UPDATE projects SET user_id = '[admin-user-id]' WHERE user_id IS NULL;

-- 옵션 2: user_id가 NULL인 데이터도 접근 가능하도록 RLS 정책 수정 (위에서 이미 적용됨)
-- "Users can view own analyses" 정책에서 "OR user_id IS NULL" 조건 추가
```

#### 체크리스트
- [ ] 기존 데이터 처리 방법 결정
- [ ] 마이그레이션 실행 (필요시)

---

## 5. 검증 체크리스트

### 최종 확인 사항

| 항목 | 확인 |
|------|------|
| 이메일 회원가입 | [ ] |
| 이메일 로그인 | [ ] |
| Google 로그인 (선택) | [ ] |
| 로그아웃 | [ ] |
| 보호된 라우트 리다이렉트 | [ ] |
| RLS 정책 동작 | [ ] |
| 사용자별 데이터 분리 | [ ] |
| Header 사용자 정보 표시 | [ ] |

---

## 6. 다음 단계

이 문서 완료 후:
- **Phase3_03_Finalization.md**: 최종 마무리 및 배포

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
