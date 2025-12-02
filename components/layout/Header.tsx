import Link from 'next/link'

/**
 * 헤더 네비게이션 컴포넌트
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">GEO Analyzer</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              분석
            </Link>
            <Link
              href="/analysis"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              이력
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
