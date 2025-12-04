import Link from 'next/link'
import { BarChart3, History } from 'lucide-react'

/**
 * 헤더 네비게이션 컴포넌트
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight">GEO Analyzer</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted hover:text-foreground text-foreground"
            >
              <BarChart3 className="h-4 w-4" />
              분석
            </Link>
            <Link
              href="/analysis"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted hover:text-foreground text-muted-foreground"
            >
              <History className="h-4 w-4" />
              이력
            </Link>
          </nav>
        </div>

        {/* 모바일 메뉴나 추가 액션 버튼이 들어갈 자리 */}
        <div className="flex items-center gap-2">
          {/* Future: User Profile / Theme Toggle */}
        </div>
      </div>
    </header>
  )
}
