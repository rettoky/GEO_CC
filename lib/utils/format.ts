/**
 * Formatting Utilities
 * 날짜, 숫자, 텍스트 포맷팅 유틸리티
 */

/**
 * 날짜를 한국 로케일로 포맷
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }

  return new Intl.DateTimeFormat('ko-KR', defaultOptions).format(dateObj)
}

/**
 * 날짜와 시간을 한국 로케일로 포맷
 */
export function formatDateTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }

  return new Intl.DateTimeFormat('ko-KR', defaultOptions).format(dateObj)
}

/**
 * 상대적인 시간 표시 (예: "3분 전", "2시간 전")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return '방금 전'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`
  } else if (diffDays < 7) {
    return `${diffDays}일 전`
  } else {
    return formatDate(dateObj, { year: 'numeric', month: 'short', day: 'numeric' })
  }
}

/**
 * 숫자를 한국 로케일로 포맷 (천 단위 구분)
 */
export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    maximumFractionDigits: 0,
    ...options,
  }

  return new Intl.NumberFormat('ko-KR', defaultOptions).format(num)
}

/**
 * 숫자를 퍼센트로 포맷
 */
export function formatPercent(num: number, decimals: number = 1): string {
  return `${num.toFixed(decimals)}%`
}

/**
 * 큰 숫자를 축약 표시 (예: 1,234 → 1.2K, 1,234,567 → 1.2M)
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) {
    return formatNumber(num)
  }

  const formatter = new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  })

  return formatter.format(num)
}

/**
 * 밀리초를 읽기 쉬운 형식으로 변환 (예: 1500ms → 1.5초)
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}초`
  } else if (ms < 3600000) {
    return `${(ms / 60000).toFixed(1)}분`
  } else {
    return `${(ms / 3600000).toFixed(1)}시간`
  }
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환 (예: 1024 → 1KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  }
}

/**
 * URL을 도메인만 추출 (예: https://example.com/path → example.com)
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * 텍스트를 지정된 길이로 자르고 ... 추가
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * 순위를 한글 서수로 변환 (예: 1 → 1위, 2 → 2위)
 */
export function formatRank(rank: number): string {
  return `${rank}위`
}

/**
 * 순위 변화를 표시 (예: +3, -2, 0 → "변동 없음")
 */
export function formatRankChange(change: number): { text: string; color: string } {
  if (change > 0) {
    return { text: `▲ ${change}`, color: 'text-green-600' }
  } else if (change < 0) {
    return { text: `▼ ${Math.abs(change)}`, color: 'text-red-600' }
  } else {
    return { text: '변동 없음', color: 'text-gray-600' }
  }
}

/**
 * 진행률 표시 (0-100)
 */
export function formatProgress(current: number, total: number): string {
  if (total === 0) return '0%'
  const percent = Math.round((current / total) * 100)
  return `${percent}% (${current}/${total})`
}

/**
 * 복수형 처리 (예: 1개, 2개)
 */
export function pluralize(count: number, singular: string): string {
  return `${formatNumber(count)}${singular}`
}
