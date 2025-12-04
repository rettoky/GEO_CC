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
  MessageSquare,
  Search,
  Globe,
  Zap,
  BookOpen
} from 'lucide-react'
import type { AnalysisSummary, AnalysisResults } from '@/types'

interface VisibilityDashboardProps {
  summary: AnalysisSummary
  results: AnalysisResults
  myDomain?: string
  myBrand?: string
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
}: VisibilityDashboardProps) {
  // 내 도메인이 인용된 LLM 목록
  const myDomainLLMs = Object.entries(results)
    .filter(([, result]) => {
      if (!result || !result.success || !myDomain) return false
      return result.citations.some((c: { domain: string }) => c.domain === myDomain.toLowerCase().replace(/^www\./, ''))
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

  // GEO 최적화 권장사항 생성
  const generateGEORecommendations = () => {
    const recommendations: Array<{
      priority: 'high' | 'medium' | 'low'
      category: string
      title: string
      description: string
      icon: React.ElementType
      actions: string[]
    }> = []

    // 노출률 기반 권장사항
    if (visibilityRate === 0) {
      recommendations.push({
        priority: 'high',
        category: '긴급 조치',
        title: 'LLM 검색 노출 확보 필요',
        description: '현재 어떤 LLM에도 노출되지 않고 있습니다. 기본적인 GEO 최적화가 시급합니다.',
        icon: AlertTriangle,
        actions: [
          '구조화된 데이터(Schema.org) 마크업 추가',
          'FAQ 섹션 및 Q&A 콘텐츠 확대',
          '신뢰할 수 있는 외부 사이트에서 백링크 확보',
          '콘텐츠 E-E-A-T(경험, 전문성, 권위, 신뢰) 강화'
        ]
      })
    } else if (visibilityRate < 50) {
      recommendations.push({
        priority: 'high',
        category: '노출 확대',
        title: '추가 LLM 노출 확보',
        description: `현재 ${myDomainLLMs.length}개 LLM에만 노출되고 있습니다. 더 많은 LLM에서 인용되도록 개선이 필요합니다.`,
        icon: Target,
        actions: [
          '각 LLM의 학습 데이터 소스 파악 및 타겟팅',
          '권위 있는 뉴스/미디어 사이트에 기고',
          '위키피디아 및 나무위키 등 참조 사이트 활용',
          '학술 자료 및 연구 보고서 발행'
        ]
      })
    }

    // 브랜드 언급 관련 권장사항
    if (summary.brandMentionCount === 0 && myBrand) {
      recommendations.push({
        priority: 'high',
        category: '브랜드 인지도',
        title: '브랜드명 노출 확보',
        description: `"${myBrand}" 브랜드가 LLM 답변에 언급되지 않았습니다.`,
        icon: MessageSquare,
        actions: [
          '브랜드 관련 보도자료 배포 확대',
          '업계 전문 매체에 브랜드 스토리 기고',
          '소셜 미디어 브랜드 언급 확대',
          '인플루언서 마케팅 및 리뷰 확보'
        ]
      })
    } else if (summary.brandMentionCount > 0 && summary.brandMentionCount < 3) {
      recommendations.push({
        priority: 'medium',
        category: '브랜드 강화',
        title: '브랜드 언급 빈도 증가',
        description: `브랜드가 ${summary.brandMentionCount}회 언급되었지만, 더 자주 언급되도록 개선이 필요합니다.`,
        icon: TrendingUp,
        actions: [
          '브랜드명을 포함한 고품질 콘텐츠 생산',
          '경쟁사 대비 차별화된 브랜드 포지셔닝',
          '고객 후기 및 사례 연구 콘텐츠 확대'
        ]
      })
    }

    // 인용 수 관련 권장사항
    if (summary.myDomainCitationCount === 0 && myDomain) {
      recommendations.push({
        priority: 'high',
        category: '콘텐츠 품질',
        title: '인용 가능한 콘텐츠 생성',
        description: '도메인이 인용 소스로 사용되지 않고 있습니다.',
        icon: FileText,
        actions: [
          '통계, 연구 결과 등 원본 데이터 제공',
          '업계 전문가 인터뷰 및 인사이트 콘텐츠',
          '깊이 있는 가이드 및 튜토리얼 작성',
          '정기적인 업계 리포트 발행'
        ]
      })
    } else if (summary.myDomainCitationCount > 0 && summary.myDomainCitationCount < 3) {
      recommendations.push({
        priority: 'medium',
        category: '콘텐츠 확장',
        title: '인용 소스로서의 가치 강화',
        description: `현재 ${summary.myDomainCitationCount}회 인용되었습니다. 더 많은 인용을 위해 콘텐츠 품질을 높이세요.`,
        icon: BookOpen,
        actions: [
          '기존 콘텐츠 업데이트 및 최신화',
          '데이터 시각화 및 인포그래픽 추가',
          '전문가 코멘트 및 인용구 포함'
        ]
      })
    }

    // 기술적 SEO 권장사항 (항상 포함)
    recommendations.push({
      priority: 'medium',
      category: '기술적 최적화',
      title: '구조화된 데이터 최적화',
      description: 'LLM이 콘텐츠를 더 잘 이해할 수 있도록 기술적 최적화가 필요합니다.',
      icon: Zap,
      actions: [
        'JSON-LD 형식의 Schema.org 마크업 적용',
        'FAQ, HowTo, Article 스키마 우선 적용',
        'Open Graph 및 메타 태그 최적화',
        '사이트맵 및 robots.txt 최적화'
      ]
    })

    // 콘텐츠 전략 권장사항
    recommendations.push({
      priority: 'low',
      category: '콘텐츠 전략',
      title: 'LLM 친화적 콘텐츠 구조',
      description: 'LLM이 콘텐츠를 쉽게 파싱하고 인용할 수 있는 구조로 개선하세요.',
      icon: Globe,
      actions: [
        '명확한 헤딩 계층 구조(H1-H6) 사용',
        '핵심 정보를 문단 초반에 배치',
        '불릿 포인트와 번호 목록 활용',
        '질문-답변 형식의 콘텐츠 구성'
      ]
    })

    // 링크 빌딩 권장사항
    if (visibilityRate < 75) {
      recommendations.push({
        priority: 'medium',
        category: '권위도 구축',
        title: '외부 링크 및 인용 확보',
        description: '신뢰할 수 있는 외부 소스에서의 링크와 인용을 늘려 도메인 권위를 높이세요.',
        icon: Link2,
        actions: [
          '업계 권위 사이트에 게스트 포스팅',
          '디렉토리 및 리스팅 사이트 등록',
          'HARO 등 미디어 기회 활용',
          '파트너십 및 협업 콘텐츠 제작'
        ]
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  const geoRecommendations = generateGEORecommendations()

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

                {/* 도메인 인용 수 */}
                <div className="group text-center p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-200 opacity-0 animate-fade-in-scale" style={{ animationDelay: '0.2s' }}>
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
                </div>

                {/* 브랜드 언급 수 */}
                <div className="group text-center p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-200 opacity-0 animate-fade-in-scale" style={{ animationDelay: '0.3s' }}>
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
                </div>
              </div>

              {/* LLM별 노출 상세 */}
              <div className="pt-6 border-t border-border/50">
                <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">LLM별 노출 상세</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(LLM_NAMES).map(([key, name]) => {
                    const isVisible = myDomainLLMs.includes(name)
                    const result = results[key as keyof AnalysisResults]
                    const citationCount = result?.citations.filter(
                      (c) => myDomain && c.domain === myDomain.toLowerCase().replace(/^www\./, '')
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

              <div className="space-y-4">
                {geoRecommendations.map((rec, index) => {
                  const Icon = rec.icon
                  return (
                    <div
                      key={index}
                      className="p-5 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${
                          rec.priority === 'high'
                            ? 'bg-red-50 dark:bg-red-900/20'
                            : rec.priority === 'medium'
                            ? 'bg-yellow-50 dark:bg-yellow-900/20'
                            : 'bg-blue-50 dark:bg-blue-900/20'
                        }`}>
                          <Icon className={`h-6 w-6 ${
                            rec.priority === 'high'
                              ? 'text-red-600 dark:text-red-400'
                              : rec.priority === 'medium'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {rec.category}
                            </span>
                            {getPriorityBadge(rec.priority)}
                          </div>
                          <h4 className="font-semibold text-foreground mb-2">{rec.title}</h4>
                          <p className="text-sm text-muted-foreground mb-4">{rec.description}</p>
                          <div className="bg-muted/50 rounded-lg p-4">
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              실행 방안
                            </h5>
                            <ul className="space-y-2">
                              {rec.actions.map((action, actionIndex) => (
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
                  )
                })}
              </div>

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
