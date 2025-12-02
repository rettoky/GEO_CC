/**
 * 도메인 매칭 유틸리티
 * URL에서 도메인 추출 및 비교
 */

/**
 * URL에서 도메인을 추출하고 정규화
 * @param url - 원본 URL
 * @returns 정규화된 도메인 (www 제거, 소문자)
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    let domain = urlObj.hostname.toLowerCase()

    // www 제거
    if (domain.startsWith('www.')) {
      domain = domain.substring(4)
    }

    return domain
  } catch {
    return ''
  }
}

/**
 * URL에서 쿼리 파라미터를 제거한 clean URL 생성
 * @param url - 원본 URL
 * @returns 쿼리 파라미터가 제거된 URL
 */
export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
  } catch {
    return url
  }
}

/**
 * 두 도메인이 일치하는지 확인
 * @param domain1 - 첫 번째 도메인
 * @param domain2 - 두 번째 도메인
 * @returns 일치 여부
 */
export function matchDomain(domain1: string, domain2: string): boolean {
  const normalized1 = domain1.toLowerCase().replace(/^www\./, '')
  const normalized2 = domain2.toLowerCase().replace(/^www\./, '')
  return normalized1 === normalized2
}

/**
 * URL이 특정 도메인에 속하는지 확인
 * @param url - 확인할 URL
 * @param targetDomain - 타겟 도메인
 * @returns 일치 여부
 */
export function isFromDomain(url: string, targetDomain: string): boolean {
  const domain = extractDomain(url)
  return matchDomain(domain, targetDomain)
}
