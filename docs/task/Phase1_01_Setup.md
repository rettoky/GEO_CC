# Phase 1 설계서
## 01. 프로젝트 초기 설정

---

## Phase 정보
| 항목 | 내용 |
|------|------|
| Phase | 1 - Core MVP |
| 문서 | 01/04 |
| 예상 기간 | 3-4일 |
| 선행 작업 | 없음 |

---

## 1. 개요

### 1.1 목표
- Next.js 14 프로젝트 생성 및 기본 설정
- Tailwind CSS + shadcn/ui 설정
- Supabase 프로젝트 연결
- 기본 프로젝트 구조 구축

### 1.2 산출물
- [ ] Next.js 프로젝트 (App Router)
- [ ] Tailwind CSS 설정 완료
- [ ] shadcn/ui 컴포넌트 설치
- [ ] Supabase 클라이언트 설정
- [ ] 기본 레이아웃 구현
- [ ] GitHub 저장소 생성

---

## 2. 작업 상세

### Task 1.1.1: Next.js 프로젝트 생성

#### 작업 내용
```bash
# 프로젝트 생성
npx create-next-app@latest geo-analyzer --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 디렉토리 이동
cd geo-analyzer
```

#### 체크리스트
- [ ] 프로젝트 생성 완료
- [ ] TypeScript 설정 확인
- [ ] App Router 구조 확인
- [ ] 개발 서버 실행 테스트 (`npm run dev`)

---

### Task 1.1.2: 추가 의존성 설치

#### 작업 내용
```bash
# 핵심 의존성
npm install @supabase/supabase-js @supabase/ssr

# UI 관련
npm install lucide-react recharts
npm install class-variance-authority clsx tailwind-merge

# 유틸리티
npm install zod date-fns

# 개발 의존성
npm install -D @types/node
```

#### 체크리스트
- [ ] Supabase 클라이언트 설치
- [ ] UI 라이브러리 설치
- [ ] 유틸리티 라이브러리 설치
- [ ] package.json 확인

---

### Task 1.1.3: shadcn/ui 설정

#### 작업 내용
```bash
# shadcn/ui 초기화
npx shadcn@latest init

# 설정 선택:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes

# 필수 컴포넌트 설치
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add skeleton
npx shadcn@latest add toast
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

#### 체크리스트
- [ ] shadcn/ui 초기화 완료
- [ ] components.json 생성 확인
- [ ] 기본 컴포넌트 설치 완료
- [ ] 컴포넌트 import 테스트

---

### Task 1.1.4: 프로젝트 구조 생성

#### 작업 내용

```
src/
├── app/
│   ├── layout.tsx              # 수정
│   ├── page.tsx                # 수정
│   ├── globals.css             # 확인
│   ├── analysis/
│   │   ├── page.tsx           # 생성
│   │   └── [id]/
│   │       └── page.tsx       # 생성
│   └── api/
│       └── analyze/
│           └── route.ts       # 생성 (placeholder)
│
├── components/
│   ├── ui/                     # shadcn 컴포넌트 (자동 생성됨)
│   ├── layout/
│   │   ├── Header.tsx         # 생성
│   │   └── Footer.tsx         # 생성
│   └── analysis/
│       └── .gitkeep           # placeholder
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # 생성
│   │   └── types.ts           # 생성
│   └── utils.ts               # shadcn이 생성
│
├── hooks/
│   └── .gitkeep               # placeholder
│
└── types/
    └── index.ts               # 생성
```

#### 파일 생성 스크립트
```bash
# 디렉토리 생성
mkdir -p src/app/analysis/[id]
mkdir -p src/app/api/analyze
mkdir -p src/components/layout
mkdir -p src/components/analysis
mkdir -p src/lib/supabase
mkdir -p src/hooks
mkdir -p src/types

# Placeholder 파일 생성
touch src/components/analysis/.gitkeep
touch src/hooks/.gitkeep
```

#### 체크리스트
- [ ] 디렉토리 구조 생성 완료
- [ ] 각 디렉토리 확인

---

### Task 1.1.5: Supabase 프로젝트 설정

#### 작업 내용

1. **Supabase 프로젝트 생성**
   - https://supabase.com 접속
   - New Project 생성
   - 프로젝트명: `geo-analyzer`
   - Region: Northeast Asia (Seoul) - ap-northeast-2

2. **API 키 확인**
   - Project Settings > API
   - `URL`, `anon key`, `service_role key` 복사

3. **환경 변수 파일 생성**

```bash
# .env.local 생성
touch .env.local
```

```env
# .env.local 내용
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```

4. **.gitignore 확인**
```gitignore
# .env 파일들이 포함되어 있는지 확인
.env*.local
```

#### 체크리스트
- [ ] Supabase 프로젝트 생성 완료
- [ ] API 키 확인 및 복사
- [ ] .env.local 파일 생성
- [ ] .gitignore 확인

---

### Task 1.1.6: Supabase 클라이언트 설정

#### 작업 내용

**lib/supabase/client.ts**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**lib/supabase/server.ts**
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 무시
          }
        },
      },
    }
  )
}
```

**lib/supabase/types.ts**
```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      analyses: {
        Row: {
          id: string
          query_text: string
          my_domain: string | null
          my_brand: string | null
          results: Json
          summary: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          query_text: string
          my_domain?: string | null
          my_brand?: string | null
          results?: Json
          summary?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          query_text?: string
          my_domain?: string | null
          my_brand?: string | null
          results?: Json
          summary?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
```

#### 체크리스트
- [ ] client.ts 생성 완료
- [ ] server.ts 생성 완료
- [ ] types.ts 생성 완료
- [ ] import 에러 없음 확인

---

### Task 1.1.7: 기본 레이아웃 구현

#### 작업 내용

**components/layout/Header.tsx**
```typescript
import Link from 'next/link'

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          GEO Analyzer
        </Link>
        <nav className="flex gap-4">
          <Link href="/" className="text-sm hover:underline">
            분석하기
          </Link>
          <Link href="/analysis" className="text-sm hover:underline">
            분석 기록
          </Link>
        </nav>
      </div>
    </header>
  )
}
```

**app/layout.tsx**
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GEO Analyzer - AI 검색 최적화 분석',
  description: 'ChatGPT, Gemini, Perplexity에서 당신의 콘텐츠가 어떻게 인용되는지 분석합니다.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
```

**app/page.tsx** (임시)
```typescript
export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">GEO Analyzer</h1>
      <p className="text-muted-foreground">
        AI 검색 최적화 분석 플랫폼
      </p>
    </div>
  )
}
```

#### 체크리스트
- [ ] Header 컴포넌트 생성
- [ ] layout.tsx 수정
- [ ] page.tsx 수정
- [ ] 개발 서버에서 확인

---

### Task 1.1.8: GitHub 저장소 설정

#### 작업 내용
```bash
# Git 초기화 (create-next-app이 이미 했을 수 있음)
git init

# .gitignore 확인/수정
# 이미 있는 내용에 추가
echo ".env*.local" >> .gitignore

# 첫 커밋
git add .
git commit -m "Initial commit: Next.js 14 + Tailwind + Supabase setup"

# GitHub 저장소 생성 후
git remote add origin https://github.com/[username]/geo-analyzer.git
git branch -M main
git push -u origin main
```

#### 체크리스트
- [ ] Git 초기화 확인
- [ ] .gitignore 확인
- [ ] 첫 커밋 완료
- [ ] GitHub push 완료

---

## 3. 검증 체크리스트

### 최종 확인 사항

| 항목 | 확인 |
|------|------|
| `npm run dev` 정상 실행 | [ ] |
| http://localhost:3000 접속 가능 | [ ] |
| Header 컴포넌트 표시됨 | [ ] |
| Tailwind CSS 스타일 적용됨 | [ ] |
| shadcn/ui Button 동작 확인 | [ ] |
| Supabase 연결 에러 없음 | [ ] |
| TypeScript 에러 없음 | [ ] |
| ESLint 에러 없음 | [ ] |

### 테스트 코드 (선택)
```typescript
// Supabase 연결 테스트 (임시로 page.tsx에서)
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const testConnection = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('analyses').select('count')
    console.log('Supabase test:', { data, error })
  }
  
  return (
    <div>
      <button onClick={testConnection}>Test Supabase</button>
    </div>
  )
}
```

---

## 4. 트러블슈팅

### 자주 발생하는 문제

| 문제 | 원인 | 해결 방법 |
|------|------|----------|
| `Module not found: @supabase/ssr` | 설치 안됨 | `npm install @supabase/ssr` |
| `NEXT_PUBLIC_* undefined` | .env.local 미생성 | 파일 생성 및 값 입력 |
| shadcn 컴포넌트 import 에러 | 경로 문제 | `@/components/ui/xxx` 확인 |
| Tailwind 스타일 미적용 | 설정 문제 | `tailwind.config.ts` content 확인 |

---

## 5. 다음 단계

이 문서 완료 후 진행:
- **Phase1_02_Database.md**: Supabase 데이터베이스 테이블 생성

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
