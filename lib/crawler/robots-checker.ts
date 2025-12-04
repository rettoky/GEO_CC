/**
 * Robots.txt Checker
 * 윤리적 크롤링을 위한 robots.txt 체크
 */

import type { RobotsCheckResult } from '@/types/pageCrawl'

const USER_AGENT = 'GEOAnalyzer/1.0 (Educational Research Tool)'

/**
 * robots.txt를 확인하여 크롤링 허용 여부 판단
 */
export async function isAllowedByRobots(url: string): Promise<RobotsCheckResult> {
  try {
    const { origin, pathname } = new URL(url)
    const robotsUrl = `${origin}/robots.txt`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
    })

    clearTimeout(timeout)

    // robots.txt가 없으면 허용
    if (!response.ok) {
      return { allowed: true, reason: 'No robots.txt found' }
    }

    const robotsTxt = await response.text()

    // 간단한 robots.txt 파싱
    const disallowedPaths = parseRobotsTxt(robotsTxt)

    // 현재 URL의 경로가 disallow 목록에 있는지 확인
    const isDisallowed = disallowedPaths.some((path) => pathname.startsWith(path))

    if (isDisallowed) {
      return {
        allowed: false,
        reason: `Disallowed by robots.txt: ${pathname}`,
        robotsTxt,
      }
    }

    return { allowed: true, robotsTxt }
  } catch (error: unknown) {
    // 에러 발생 시 관대하게 허용 (네트워크 문제 등)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      allowed: true,
      reason: `robots.txt check failed: ${message}`,
    }
  }
}

/**
 * robots.txt 파싱 - User-agent: * 섹션의 Disallow 경로 추출
 */
function parseRobotsTxt(content: string): string[] {
  const lines = content.split('\n')
  const disallowedPaths: string[] = []
  let isWildcardSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    // User-agent 섹션 전환
    if (trimmed.toLowerCase().startsWith('user-agent: *')) {
      isWildcardSection = true
    } else if (trimmed.toLowerCase().startsWith('user-agent:')) {
      isWildcardSection = false
    }

    // Wildcard 섹션에서 Disallow 경로 추출
    if (isWildcardSection && trimmed.toLowerCase().startsWith('disallow:')) {
      const path = trimmed.substring(trimmed.indexOf(':') + 1).trim()
      if (path && path !== '/') {
        // '/' 전체 차단은 무시 (너무 제한적)
        disallowedPaths.push(path)
      }
    }
  }

  return disallowedPaths
}

/**
 * 여러 URL에 대해 robots.txt 체크 (배치)
 */
export async function checkMultipleUrls(
  urls: string[]
): Promise<Map<string, RobotsCheckResult>> {
  const results = new Map<string, RobotsCheckResult>()

  // 병렬 처리
  await Promise.allSettled(
    urls.map(async (url) => {
      const result = await isAllowedByRobots(url)
      results.set(url, result)
    })
  )

  return results
}
