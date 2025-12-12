'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnimatedNumber } from '@/components/ui/animated-number'
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Eye,
  Target,
  Trophy,
  AlertTriangle,
  Lightbulb,
  FileText,
  Link2,
  Search,
  Globe,
  Zap,
  BookOpen,
  ExternalLink,
} from 'lucide-react'
import type { AnalysisSummary, AnalysisResults } from '@/types'

interface VisibilityDashboardProps {
  summary: AnalysisSummary
  results: AnalysisResults
  myDomain?: string
  myBrand?: string
  onDomainCitationClick?: () => void
  onBrandMentionClick?: () => void
}

const LLM_NAMES = {
  perplexity: 'Perplexity',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}

/**
 * 내 도메인/브랜드 노출 현황 대시보드
 */
export function VisibilityDashboard({
  summary,
  results,
  myDomain,
  myBrand,
  onDomainCitationClick,
  onBrandMentionClick,
}: VisibilityDashboardProps) {
  // 결과가 없으면 렌더링하지 않음
  if (!results || Object.keys(results).length === 0) {
    return null
  }

  // 내 도메인이 인용된 LLM 목록 (부분 일치 - 서브도메인 포함)
  const myDomainLLMs = Object.entries(results)
    .filter(([, result]) => {
      if (!result || !result.success || !myDomain) return false
      const normalizedMyDomain = myDomain.toLowerCase().replace(/^www\./, '')
      return result.citations.some((c: { domain: string }) => {
        const citationDomain = c.domain?.toLowerCase().replace(/^www\./, '')
        return citationDomain && (citationDomain.includes(normalizedMyDomain) || normalizedMyDomain.includes(citationDomain))
      })
    })
    .map(([llm]) => LLM_NAMES[llm as keyof typeof LLM_NAMES])

  // 노출률 계산
  const visibilityRate = (myDomainLLMs.length / 4) * 100

  // 노출 등급
  const getVisibilityGrade = (rate: number) => {
    if (rate >= 75) return { grade: 'A', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', icon: Trophy }
    if (rate >= 50) return { grade: 'B', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: TrendingUp }
    if (rate >= 25) return { grade: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', icon: AlertTriangle }
    return { grade: 'D', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', icon: AlertTriangle }
  }

  const visibilityGrade = getVisibilityGrade(visibilityRate)
  const GradeIcon = visibilityGrade.icon

  // 노출되지 않은 LLM 목록 (향후 기능 확장용)
  const _notExposedLLMs = Object.entries(LLM_NAMES)
    .filter(([, name]) => !myDomainLLMs.includes(name))
    .map(([key]) => key as keyof typeof LLM_NAMES)

  // LLM별 GEO 최적화 권장사항 생성
  const generateLLMSpecificRecommendations = () => {
    const recommendations: Array<{
      llm: string
      llmKey: string
      priority: 'high' | 'medium' | 'low'
      isExposed: boolean
      strategies: Array<{
        category: string
        title: string
        actions: string[]
      }>
    }> = []

    // ChatGPT 전략
    const chatgptExposed = myDomainLLMs.includes('ChatGPT')
    recommendations.push({
      llm: 'ChatGPT',
      llmKey: 'chatgpt',
      priority: chatgptExposed ? 'low' : 'high',
      isExposed: chatgptExposed,
      strategies: [
        {
          category: 'Bing 검색 최적화 (핵심)',
          title: 'ChatGPT는 Bing 인덱스에 크게 의존합니다',
          actions: [
            'Bing 웹마스터 도구에 사이트맵 제출 및 URL 직접 제출',
            'Bing에서 타겟 키워드 검색 시 상위 노출 확보',
            '참조 도메인(백링크) 32,000개 이상 확보 시 인용 급증',
            'robots.txt에서 OAI-SearchBot, ChatGPT-User 허용 확인'
          ]
        },
        {
          category: '페이지 속도 최적화 (필수)',
          title: 'FCP 0.4초 미만 달성 시 인용 3배 증가',
          actions: [
            'First Contentful Paint(FCP) 0.4초 미만 목표 설정',
            'SSR(서버 사이드 렌더링) 필수 구현 - OpenAI 봇은 JS 렌더링 불가',
            '클라이언트 사이드 렌더링 콘텐츠는 인덱싱 안됨',
            '이미지 최적화 및 CDN 활용으로 로딩 속도 개선'
          ]
        },
        {
          category: '콘텐츠 구조 최적화',
          title: '120-180단어 섹션 구조가 최적 인용률 달성',
          actions: [
            '각 섹션(H2~H3 사이)을 120-180단어로 구성 (인용 4.6개 달성)',
            '첫 문단에 핵심 답변 배치 (BLUF: Bottom Line Up Front)',
            '2,900단어 이상의 종합 콘텐츠 작성 (5.1개 vs 3.2개)',
            '질문 형태의 H2/H3 제목 사용 - 소규모 사이트에서 7배 효과'
          ]
        },
        {
          category: '신뢰도 신호 강화',
          title: '전문가 인용과 통계 데이터가 인용률 좌우',
          actions: [
            '전문가 인용 포함 시 인용 4.1개 vs 미포함 2.4개',
            '통계 데이터 19개 이상 포함 시 인용 5.4개 vs 2.8개',
            '3개월 이내 콘텐츠 업데이트 시 인용 6.0개 vs 3.6개',
            'Reddit, Quora에서 브랜드 언급 확보 (신뢰 신호)'
          ]
        }
      ]
    })

    // Perplexity 전략
    const perplexityExposed = myDomainLLMs.includes('Perplexity')
    recommendations.push({
      llm: 'Perplexity',
      llmKey: 'perplexity',
      priority: perplexityExposed ? 'low' : 'high',
      isExposed: perplexityExposed,
      strategies: [
        {
          category: '콘텐츠 신선도 (최우선)',
          title: 'Perplexity는 2-3일 주기로 콘텐츠 감쇠 시작',
          actions: [
            '2-3일 주기로 콘텐츠 갱신 일정 수립',
            '"최종 업데이트: YYYY년 MM월 DD일" 형식으로 날짜 명시',
            'dateModified 메타태그 정확히 업데이트',
            '상시 콘텐츠(evergreen)도 정기적 갱신 필수'
          ]
        },
        {
          category: '답변 우선(Answer-First) 구조',
          title: '첫 80토큰(40-60단어) 내 직접 답변 배치',
          actions: [
            'H1 직후 40-60단어로 핵심 결론 먼저 제시',
            '질문 형태의 H2/H3 제목에 id 속성 추가 (딥링킹용)',
            '비교표와 데이터 테이블 적극 활용 (인용 32%+)',
            'Flesch 가독성 점수 55 이상 유지 (짧은 문장, 명확한 표현)'
          ]
        },
        {
          category: '학술적/객관적 톤',
          title: 'Perplexity는 학술/연구 도구 성격으로 객관적 콘텐츠 선호',
          actions: [
            '마케팅 문구, 홍보성 표현 최소화 (감점 요인)',
            '사실/수치 위주의 객관적 서술 (금융감독원, 통계청 등 인용)',
            '원본 연구/데이터 포함 시 가중치 상승',
            '종합 가이드는 10,000단어 이상 작성 (토픽 클러스터 형태)'
          ]
        },
        {
          category: '권위 도메인 연결',
          title: 'Perplexity가 신뢰하는 시드 사이트에서 언급 확보',
          actions: [
            'Reddit 서브레딧에서 전문적 답변 제공 (전체 인용의 6.6%)',
            'Wikipedia, GitHub, Stack Overflow 등 권위 사이트 언급',
            'Crunchbase, LinkedIn 회사 페이지 최적화',
            'robots.txt에서 PerplexityBot 허용 확인'
          ]
        }
      ]
    })

    // Gemini 전략
    const geminiExposed = myDomainLLMs.includes('Gemini')
    recommendations.push({
      llm: 'Gemini',
      llmKey: 'gemini',
      priority: geminiExposed ? 'low' : 'high',
      isExposed: geminiExposed,
      strategies: [
        {
          category: 'Google 검색 순위 최적화 (핵심)',
          title: 'AI Overview 인용의 74%가 SERP Top 10에서 발생',
          actions: [
            '#1 랭킹 페이지 인용 확률 33.07% (Top 10 평균의 2배)',
            'Google Search Console에서 타겟 키워드 순위 모니터링',
            'Core Web Vitals 준수 (LCP < 2.5s, FID < 100ms, CLS < 0.1)',
            '기존 SEO 최적화가 Gemini 노출의 전제조건'
          ]
        },
        {
          category: 'Google 머천트 센터 연동',
          title: '상업적 쿼리에서 GMC 데이터 최우선 반영',
          actions: [
            'GMC 피드 오류 0건 유지 및 GTIN(바코드) 정확히 입력',
            'structured_title 속성으로 AI 친화적 제목 제공',
            '가격/재고 실시간 동기화 및 고화질 다각도 이미지',
            '배송 정보와 반품 정책 명확히 명시'
          ]
        },
        {
          category: '멀티모달 콘텐츠 최적화',
          title: 'Gemini는 텍스트+이미지+비디오 동시 이해',
          actions: [
            '이미지 파일명: brand-model-feature.jpg 형식으로 명명',
            'Alt 텍스트에 브랜드명, 제품명, 주요 특징 상세 기술',
            'YouTube에 제품 시연 영상 업로드 후 웹페이지에 임베드',
            'VideoObject 스키마 마크업 적용'
          ]
        },
        {
          category: 'Knowledge Panel 확보',
          title: '브랜드 Knowledge Panel이 Gemini 신뢰도에 직접 영향',
          actions: [
            'Wikidata에 브랜드를 구조화된 엔티티로 등록',
            'Google 마이 비즈니스 프로필 최적화 및 정기 게시물',
            'Organization 스키마에 sameAs 속성으로 공식 SNS/위키 연결',
            '언론 보도 확보 및 정기 보도자료 배포'
          ]
        }
      ]
    })

    // Claude 전략
    const claudeExposed = myDomainLLMs.includes('Claude')
    recommendations.push({
      llm: 'Claude',
      llmKey: 'claude',
      priority: claudeExposed ? 'low' : 'high',
      isExposed: claudeExposed,
      strategies: [
        {
          category: 'Brave Search 최적화 (핵심)',
          title: 'Claude 인용의 86.7%가 Brave 검색 결과와 중복',
          actions: [
            'Brave Search에서 직접 검색하여 현재 순위 확인',
            '콘텐츠 독창성 중시 - AI 재가공 콘텐츠 지양',
            '팝업, 인터스티셜 광고 최소화 (Brave가 선호하는 클린 구조)',
            'robots.txt에서 Claude-SearchBot 허용 필수'
          ]
        },
        {
          category: '간결하고 밀도 높은 콘텐츠',
          title: 'Claude 최적 길이는 650-1,050단어 (타 LLM 대비 짧음)',
          actions: [
            '불필요한 서론/결론 최소화, 핵심 정보 위주 서술',
            '핵심 문장을 25단어 이내로 구성 (Claude 스니펫 추출 규칙)',
            '"암보험 민원의 47%는 보장 범위 오해에서 발생" 형태의 간결한 팩트',
            '독립적으로 이해 가능한 문장 작성 (맥락 없이도 의미 전달)'
          ]
        },
        {
          category: '권위 신호 강화',
          title: 'Claude는 도메인 권위와 평판에 높은 가중치 부여',
          actions: [
            '저자 자격증, 경력 명시 (손해사정인, AFPK 등)',
            '금융감독원, 보험연구원 등 공신력 있는 출처 인용',
            'YMYL 콘텐츠는 최고 수준 E-E-A-T 필수 (Constitutional AI)',
            '이해충돌 공개 및 투명한 정보 제공'
          ]
        },
        {
          category: '질문-답변 형식 구조',
          title: 'Claude는 질문에 직접 답하는 구조를 선호',
          actions: [
            'H2/H3에 질문 형태 제목 사용 ("암보험 진단금 적정 금액은?")',
            '질문 바로 아래 1-2문장으로 직접적인 답변 배치',
            'FAQPage 스키마 마크업 적용',
            '주장-근거 쌍 구조로 핵심 데이터 바로 뒤에 출처 배치'
          ]
        }
      ]
    })

    // 노출되지 않은 LLM을 우선순위 높게 정렬
    return recommendations.sort((a, b) => {
      if (a.isExposed !== b.isExposed) {
        return a.isExposed ? 1 : -1
      }
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  const llmRecommendations = generateLLMSpecificRecommendations()

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
    const labels = { high: '높음', medium: '보통', low: '낮음' }
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[priority]}`}>
        우선순위: {labels[priority]}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 overflow-hidden animate-fade-in-up">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Eye className="h-6 w-6 text-primary" />
            내 도메인 경쟁력 분석
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                내 도메인 경쟁력분석
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                GEO 최적화 권장사항
              </TabsTrigger>
            </TabsList>

            {/* 탭 1: 내 도메인 경쟁력분석 */}
            <TabsContent value="analysis" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 노출률 */}
                <div className={`relative overflow-hidden text-center p-6 rounded-2xl border ${visibilityGrade.borderColor} ${visibilityGrade.bgColor} transition-all duration-300 hover:shadow-lg opacity-0 animate-fade-in-scale`} style={{ animationDelay: '0.1s' }}>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <GradeIcon className="h-24 w-24" />
                  </div>
                  <div className={`text-6xl font-black ${visibilityGrade.color} mb-2 tracking-tighter`}>
                    {visibilityGrade.grade}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">노출 등급</div>
                  <div className={`text-3xl font-bold ${visibilityGrade.color}`}>
                    <AnimatedNumber value={visibilityRate} duration={1200} suffix="%" />
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 font-medium bg-white/50 dark:bg-black/20 rounded-full py-1 px-3 inline-block">
                    {myDomainLLMs.length}/4 LLM 노출
                  </div>
                </div>

                {/* 도메인 인용 수 - 클릭 시 전체 쿼리 분석결과로 이동 */}
                <button
                  onClick={() => summary.myDomainCitationCount > 0 && onDomainCitationClick?.()}
                  disabled={summary.myDomainCitationCount === 0}
                  className={`group text-center p-6 rounded-2xl bg-card border shadow-sm transition-all duration-300 opacity-0 animate-fade-in-scale w-full ${
                    summary.myDomainCitationCount > 0
                      ? 'cursor-pointer hover:shadow-md hover:border-blue-300 border-border'
                      : 'cursor-default border-border opacity-70'
                  }`}
                  style={{ animationDelay: '0.2s' }}
                >
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full w-16 h-16 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-4xl font-bold text-foreground mb-2">
                    <AnimatedNumber value={summary.myDomainCitationCount} duration={1000} delay={200} />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    내 도메인 인용 수
                  </div>
                  {myDomain && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-3 font-mono bg-blue-50 dark:bg-blue-900/20 py-1 px-2 rounded-md inline-block">
                      {myDomain}
                    </div>
                  )}
                  {summary.myDomainCitationCount > 0 && (
                    <div className="mt-3 flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <ExternalLink className="h-3 w-3" />
                      <span>클릭하여 상세 보기</span>
                    </div>
                  )}
                </button>

                {/* 브랜드 언급 수 - 클릭 시 전체 쿼리 분석결과로 이동 */}
                <button
                  onClick={() => summary.brandMentionCount > 0 && onBrandMentionClick?.()}
                  disabled={summary.brandMentionCount === 0}
                  className={`group text-center p-6 rounded-2xl bg-card border shadow-sm transition-all duration-300 opacity-0 animate-fade-in-scale w-full ${
                    summary.brandMentionCount > 0
                      ? 'cursor-pointer hover:shadow-md hover:border-purple-300 border-border'
                      : 'cursor-default border-border opacity-70'
                  }`}
                  style={{ animationDelay: '0.3s' }}
                >
                  <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full w-16 h-16 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-4xl font-bold text-foreground mb-2">
                    <AnimatedNumber value={summary.brandMentionCount} duration={1000} delay={300} />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    브랜드 언급 수
                  </div>
                  {myBrand && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-3 font-semibold bg-purple-50 dark:bg-purple-900/20 py-1 px-2 rounded-md inline-block">
                      &quot;{myBrand}&quot;
                    </div>
                  )}
                  {summary.brandMentionCount > 0 && (
                    <div className="mt-3 flex items-center justify-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                      <ExternalLink className="h-3 w-3" />
                      <span>클릭하여 상세 보기</span>
                    </div>
                  )}
                </button>
              </div>

              {/* LLM별 노출 상세 */}
              <div className="pt-6 border-t border-border/50">
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">LLM별 노출 상세</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(LLM_NAMES).map(([key, name]) => {
                    const isVisible = myDomainLLMs.includes(name)
                    const result = results[key as keyof AnalysisResults]
                    const normalizedMyDomain = myDomain?.toLowerCase().replace(/^www\./, '')
                    const citationCount = result?.citations.filter(
                      (c) => {
                        if (!myDomain) return false
                        const citationDomain = c.domain?.toLowerCase().replace(/^www\./, '')
                        return citationDomain && (citationDomain.includes(normalizedMyDomain!) || normalizedMyDomain!.includes(citationDomain))
                      }
                    ).length || 0

                    return (
                      <div
                        key={key}
                        className={`relative p-4 rounded-xl border transition-all duration-200 ${isVisible
                          ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                          : 'bg-muted/30 border-border opacity-70'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold">{name}</span>
                          {isVisible ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex items-end gap-2">
                          <span className={`text-2xl font-bold ${isVisible ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {citationCount}
                          </span>
                          <span className="text-xs text-muted-foreground mb-1">회 인용</span>
                        </div>
                        <div className={`text-xs mt-2 font-medium ${isVisible ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                          {isVisible ? '노출됨' : '미노출'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 개선 제안 */}
              {visibilityRate < 100 && (
                <div className="p-5 rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30">
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    노출 개선 제안
                  </h4>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-2 pl-1">
                    {visibilityRate === 0 && (
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        현재 어떤 LLM에도 노출되지 않고 있습니다. SEO 최적화 및 콘텐츠 품질 개선이 시급합니다.
                      </li>
                    )}
                    {visibilityRate > 0 && visibilityRate < 50 && (
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        {4 - myDomainLLMs.length}개 LLM에서 추가 노출이 필요합니다. 각 LLM의 특성에 맞는 키워드 최적화를 고려해보세요.
                      </li>
                    )}
                    {summary.brandMentionCount === 0 && myBrand && (
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        브랜드명이 답변에 언급되지 않았습니다. 브랜드 인지도 향상을 위한 PR 활동이 필요합니다.
                      </li>
                    )}
                    {summary.myDomainCitationCount < 2 && summary.myDomainCited && (
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        인용 수가 적습니다. 더 많은 고품질 콘텐츠를 제공하여 도메인 권위를 높이세요.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* 완벽한 노출 축하 */}
              {visibilityRate === 100 && summary.myDomainCitationCount > 0 && (
                <div className="p-5 rounded-xl bg-green-50 border border-green-100 dark:bg-green-900/10 dark:border-green-800/30">
                  <h4 className="text-sm font-bold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    완벽한 노출!
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    모든 LLM에서 귀하의 도메인이 검색되고 있습니다. 훌륭한 SEO와 콘텐츠 품질을 유지하세요!
                  </p>
                </div>
              )}
            </TabsContent>

            {/* 탭 2: GEO 최적화 권장사항 */}
            <TabsContent value="recommendations" className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Lightbulb className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">GEO (Generative Engine Optimization) 최적화</h3>
                    <p className="text-sm text-muted-foreground">
                      AI 검색 엔진(ChatGPT, Perplexity, Gemini, Claude)에서 더 자주 인용되고 추천받기 위한 맞춤형 전략입니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* LLM별 권장사항 */}
              <Tabs defaultValue={llmRecommendations[0]?.llmKey || 'chatgpt'} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  {llmRecommendations.map((rec) => (
                    <TabsTrigger
                      key={rec.llmKey}
                      value={rec.llmKey}
                      className="flex items-center gap-1.5 text-xs sm:text-sm"
                    >
                      {rec.isExposed ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                      )}
                      <span>{rec.llm}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {llmRecommendations.map((rec) => (
                  <TabsContent key={rec.llmKey} value={rec.llmKey} className="space-y-4">
                    {/* LLM 상태 배너 */}
                    <div className={`p-4 rounded-xl border ${
                      rec.isExposed
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                        : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
                    }`}>
                      <div className="flex items-center gap-3">
                        {rec.isExposed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        )}
                        <div>
                          <p className={`font-semibold ${
                            rec.isExposed
                              ? 'text-green-800 dark:text-green-300'
                              : 'text-amber-800 dark:text-amber-300'
                          }`}>
                            {rec.isExposed
                              ? `${rec.llm}에서 이미 노출되고 있습니다!`
                              : `${rec.llm}에서 아직 노출되지 않고 있습니다`}
                          </p>
                          <p className={`text-sm ${
                            rec.isExposed
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}>
                            {rec.isExposed
                              ? '아래 전략을 통해 노출 순위를 더욱 높일 수 있습니다.'
                              : '아래 전략을 우선적으로 실행하여 노출을 확보하세요.'}
                          </p>
                        </div>
                        {getPriorityBadge(rec.priority)}
                      </div>
                    </div>

                    {/* 전략 카드들 */}
                    <div className="space-y-4">
                      {rec.strategies.map((strategy, strategyIndex) => (
                        <div
                          key={strategyIndex}
                          className="p-5 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${
                              strategyIndex === 0
                                ? 'bg-primary/10'
                                : 'bg-muted'
                            }`}>
                              {strategyIndex === 0 ? (
                                <Zap className={`h-6 w-6 text-primary`} />
                              ) : strategyIndex === 1 ? (
                                <Globe className="h-6 w-6 text-muted-foreground" />
                              ) : strategyIndex === 2 ? (
                                <FileText className="h-6 w-6 text-muted-foreground" />
                              ) : (
                                <Link2 className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  strategyIndex === 0
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {strategy.category}
                                </span>
                                {strategyIndex === 0 && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    최우선
                                  </span>
                                )}
                              </div>
                              <h4 className="font-semibold text-foreground mb-3">{strategy.title}</h4>
                              <div className="bg-muted/50 rounded-lg p-4">
                                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                  실행 방안
                                </h5>
                                <ul className="space-y-2">
                                  {strategy.actions.map((action, actionIndex) => (
                                    <li key={actionIndex} className="flex items-start gap-2 text-sm">
                                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              {/* 추가 리소스 */}
              <div className="mt-6 p-5 rounded-xl bg-muted/30 border border-border">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  GEO 최적화 핵심 원칙
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <div>
                      <span className="font-medium">신뢰성 구축</span>
                      <p className="text-muted-foreground text-xs mt-0.5">권위 있는 소스에서의 인용과 백링크 확보</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <div>
                      <span className="font-medium">구조화된 콘텐츠</span>
                      <p className="text-muted-foreground text-xs mt-0.5">명확한 계층 구조와 Schema 마크업</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <div>
                      <span className="font-medium">고유 가치 제공</span>
                      <p className="text-muted-foreground text-xs mt-0.5">원본 데이터, 연구 결과, 전문가 인사이트</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">4</span>
                    </div>
                    <div>
                      <span className="font-medium">최신성 유지</span>
                      <p className="text-muted-foreground text-xs mt-0.5">정기적인 콘텐츠 업데이트와 신선한 정보</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
