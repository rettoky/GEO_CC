/**
 * Korean UI Labels and Messages
 * 한국어 UI 레이블 및 메시지 상수
 */

export const LABELS = {
  // LLM 이름
  LLM_NAMES: {
    PERPLEXITY: 'Perplexity',
    CHATGPT: 'ChatGPT',
    GEMINI: 'Gemini',
    CLAUDE: 'Claude',
  },

  // 공통 액션
  ACTIONS: {
    SAVE: '저장',
    CANCEL: '취소',
    DELETE: '삭제',
    EDIT: '수정',
    ADD: '추가',
    DOWNLOAD: '다운로드',
    SHARE: '공유',
    SEARCH: '검색',
    ANALYZE: '분석',
    START: '시작',
    STOP: '중지',
    RETRY: '다시 시도',
    CONFIRM: '확인',
    CLOSE: '닫기',
  },

  // 분석 관련
  ANALYSIS: {
    QUERY_INPUT: '검색어 입력',
    DOMAIN_INPUT: '도메인 입력',
    BRAND_INPUT: '브랜드명 입력',
    START_ANALYSIS: '분석 시작',
    ANALYZING: '분석 중...',
    ANALYSIS_COMPLETE: '분석 완료',
    ANALYSIS_FAILED: '분석 실패',
    PARTIAL_FAILURE: '일부 LLM 분석 실패',
    BATCH_ANALYSIS: '배치 분석',
    SINGLE_ANALYSIS: '단일 분석',
  },

  // 쿼리 변형
  VARIATIONS: {
    GENERATE: '쿼리 변형 생성',
    GENERATING: '변형 생성 중...',
    GENERATED: '변형 생성 완료',
    COUNT_10: '10개 변형',
    COUNT_15: '15개 변형',
    COUNT_30: '30개 변형',
    EDIT_VARIATION: '변형 수정',
    DELETE_VARIATION: '변형 삭제',
  },

  // 경쟁사
  COMPETITORS: {
    TITLE: '경쟁사 분석',
    AUTO_DETECT: '자동 감지',
    MANUAL_INPUT: '직접 입력',
    MERGED: '통합 관리',
    ADD_COMPETITOR: '경쟁사 추가',
    DOMAIN: '도메인',
    BRAND_NAME: '브랜드명',
    CITATION_COUNT: '인용 횟수',
    CITATION_RATE: '인용률',
    RANK: '순위',
  },

  // 페이지 크롤링
  CRAWL: {
    TITLE: '페이지 크롤링',
    START_CRAWL: '크롤링 시작',
    CRAWLING: '크롤링 중...',
    CRAWL_COMPLETE: '크롤링 완료',
    CRAWL_FAILED: '크롤링 실패',
    SUCCESS_RATE: '성공률',
    LOAD_TIME: '로딩 시간',
    STRUCTURE_ISSUES: '구조적 문제',
  },

  // 시각화
  VISUALIZATION: {
    TITLE: '종합 시각화',
    BAR_CHART: '막대 그래프',
    PIE_CHART: '원형 차트',
    TABLE: '순위 테이블',
    LLM_COMPARISON: 'LLM별 인용 횟수 비교',
    CITATION_RATIO: '전체 인용 비율',
    RANKING_TABLE: '경쟁사 순위',
  },

  // 보고서
  REPORT: {
    TITLE: '종합 분석 보고서',
    GENERATE: '보고서 생성',
    GENERATING: '보고서 생성 중...',
    DOWNLOAD_PDF: 'PDF 다운로드',
    DOWNLOAD_JSON: 'JSON 다운로드',
    SAVE_REPORT: '보고서 저장',
    SHARE_REPORT: '보고서 공유',
    SUMMARY: '핵심 요약',
    LLM_ANALYSIS: 'LLM별 분석',
    COMPETITOR_COMPARISON: '경쟁사 비교',
    RECOMMENDATIONS: '개선 권장사항',
  },

  // 상태
  STATUS: {
    LOADING: '로딩 중...',
    SUCCESS: '성공',
    FAILED: '실패',
    PENDING: '대기 중',
    IN_PROGRESS: '진행 중',
    COMPLETED: '완료',
    ERROR: '오류',
  },

  // 우선순위
  PRIORITY: {
    HIGH: '높음',
    MEDIUM: '중간',
    LOW: '낮음',
  },

  // 단위
  UNITS: {
    TIMES: '회',
    PERCENT: '%',
    MILLISECONDS: 'ms',
    PAGES: '페이지',
    ITEMS: '개',
  },
} as const

export const MESSAGES = {
  // 성공 메시지
  SUCCESS: {
    ANALYSIS_COMPLETE: '4개 LLM의 분석 결과를 확인하세요',
    VARIATION_GENERATED: (count: number) => `${count}개의 쿼리 변형이 생성되었습니다`,
    BATCH_ANALYSIS_COMPLETE: (count: number) =>
      `${count}개 변형에 대한 분석이 완료되었습니다`,
    CRAWL_COMPLETE: '페이지 크롤링이 완료되었습니다',
    REPORT_SAVED: '보고서가 저장되었습니다',
    LINK_COPIED: '공유 링크가 클립보드에 복사되었습니다',
  },

  // 에러 메시지
  ERROR: {
    UNKNOWN: '알 수 없는 오류가 발생했습니다',
    ANALYSIS_FAILED: '분석에 실패했습니다',
    VARIATION_FAILED: '쿼리 변형 생성에 실패했습니다',
    BATCH_ANALYSIS_FAILED: '배치 분석에 실패했습니다',
    CRAWL_FAILED: '페이지 크롤링에 실패했습니다',
    REPORT_GENERATION_FAILED: '보고서 생성에 실패했습니다',
    PDF_GENERATION_FAILED: 'PDF 생성에 실패했습니다',
    SAVE_FAILED: '저장에 실패했습니다',
    LINK_COPY_FAILED: '공유 링크 복사에 실패했습니다',
    REQUIRED_FIELD: (field: string) => `${field}을(를) 입력해주세요`,
    INVALID_DOMAIN: '올바른 도메인 형식이 아닙니다',
    INVALID_URL: '올바른 URL 형식이 아닙니다',
    NO_DATA: '데이터가 없습니다',
    NETWORK_ERROR: '네트워크 오류가 발생했습니다',
    TIMEOUT: '요청 시간이 초과되었습니다',
    PARTIAL_FAILURE: (failed: string[], success: number) =>
      `${failed.join(', ')}에서 응답을 받지 못했습니다. 성공한 ${success}개 LLM 결과는 위에서 확인할 수 있습니다.`,
  },

  // 안내 메시지
  INFO: {
    NO_RESULTS: '분석 결과가 없습니다',
    NO_CITATIONS: '인용 데이터가 없습니다',
    NO_COMPETITORS: '경쟁사 데이터가 없습니다',
    NO_CRAWL_DATA: '크롤링 데이터가 없습니다',
    SELECT_VARIATION_COUNT: '생성할 변형 개수를 선택하세요',
    EDIT_VARIATIONS: '변형을 수정하거나 삭제할 수 있습니다',
    AUTO_DETECT_INFO: 'AI가 자동으로 경쟁사를 감지합니다',
    MANUAL_INPUT_INFO: '직접 경쟁사를 입력할 수 있습니다',
    ROBOTS_TXT_RESPECT: 'robots.txt를 준수하여 크롤링합니다',
  },

  // 설명 메시지
  DESCRIPTIONS: {
    QUERY_INPUT: '분석할 검색어를 입력하세요',
    DOMAIN_INPUT: '내 도메인을 입력하세요 (선택)',
    BRAND_INPUT: '브랜드명을 입력하세요 (선택)',
    VARIATION_GENERATOR: 'AI가 다양한 검색어 변형을 자동으로 생성합니다',
    LLM_COMPARISON: '각 LLM에서 도메인이 인용된 횟수를 비교합니다',
    CITATION_RATIO: '모든 LLM에서 각 도메인이 차지하는 인용 비율을 보여줍니다',
    RANKING_TABLE: '인용 횟수 기준 경쟁사 순위를 확인하세요',
    CRAWL_INSIGHTS: '페이지 구조와 성능을 분석합니다',
    RECOMMENDATIONS: 'AI가 분석 결과를 바탕으로 개선 방안을 제시합니다',
  },
} as const

export const PLACEHOLDERS = {
  QUERY: '예: 최고의 SEO 도구는?',
  DOMAIN: '예: example.com',
  BRAND: '예: 브랜드명',
  SEARCH: '검색...',
} as const

export const TOOLTIPS = {
  CITATION_COUNT: '이 도메인이 LLM 응답에서 인용된 총 횟수',
  CITATION_RATE: '전체 인용 중 이 도메인이 차지하는 비율',
  AVERAGE_POSITION: 'LLM 응답에서 인용된 평균 순위 (낮을수록 좋음)',
  LLM_COVERAGE: '인용된 LLM 개수 / 전체 LLM 개수',
  AUTO_DETECT_SCORE: 'AI가 계산한 경쟁 강도 점수 (100점 만점)',
} as const
