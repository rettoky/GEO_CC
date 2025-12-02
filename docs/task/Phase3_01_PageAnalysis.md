# Phase 3 설계서
## 01. 페이지 구조 분석

---

## Phase 정보
| 항목 | 내용 |
|------|------|
| Phase | 3 - 고급 기능 |
| 문서 | 01/03 |
| 예상 기간 | 4-5일 |
| 선행 작업 | Phase 2 전체 완료 |

---

## 1. 개요

### 1.1 목표
- URL 입력으로 페이지 구조 분석
- Schema.org 마크업 분석
- GEO 최적화 점수 산출
- **4개 LLM별 최적화 체크리스트 (Perplexity, ChatGPT, Gemini, Claude)**
- 개선 제안 제공

### 1.2 산출물
- [ ] 페이지 분석 Edge Function
- [ ] page_analyses 테이블
- [ ] 페이지 분석 UI
- [ ] GEO 점수 계산 로직
- [ ] 개선 제안 시스템

---

## 2. 데이터베이스 스키마

### Task 3.1.1: page_analyses 테이블

#### 작업 내용

```sql
-- ============================================
-- GEO Analyzer: Phase 3 - Page Analysis
-- ============================================

-- page_analyses 테이블
CREATE TABLE IF NOT EXISTS page_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 페이지 정보
    url TEXT NOT NULL,
    title TEXT,
    meta_description TEXT,
    
    -- 분석 결과 (JSONB)
    scores JSONB NOT NULL DEFAULT '{}',
    technical_analysis JSONB DEFAULT '{}',
    content_analysis JSONB DEFAULT '{}',
    schema_analysis JSONB DEFAULT '{}',
    
    -- 개선 제안
    recommendations JSONB DEFAULT '[]',
    
    -- LLM별 체크리스트
    llm_checklists JSONB DEFAULT '{}',
    
    -- 상태
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_page_analyses_project_id ON page_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_page_analyses_url ON page_analyses(url);
CREATE INDEX IF NOT EXISTS idx_page_analyses_created_at ON page_analyses(created_at DESC);
```

#### scores JSONB 구조 (4개 LLM)
```json
{
  "overall": 72,
  "technical": 80,
  "content": 65,
  "trust": 70,
  "perplexity_ready": 75,
  "chatgpt_ready": 68,
  "gemini_ready": 73,
  "claude_ready": 70
}
```

#### technical_analysis JSONB 구조
```json
{
  "crawlability": {
    "robotsTxt": true,
    "perplexityBotAllowed": true,
    "oaiSearchBotAllowed": true,
    "googlebotAllowed": true,
    "claudeBotAllowed": true
  },
  "performance": {
    "loadTime": 2.3,
    "mobileOptimized": true,
    "https": true
  },
  "structure": {
    "hasH1": true,
    "headerHierarchy": true,
    "hasSitemap": true
  }
}
```

#### content_analysis JSONB 구조
```json
{
  "bluf": {
    "hasDirectAnswer": true,
    "answerInFirst100Words": true,
    "answerTokenCount": 45
  },
  "structure": {
    "hasQuestionHeadings": true,
    "hasFAQ": true,
    "faqCount": 5,
    "hasComparisonTable": false,
    "hasBecauseLine": true
  },
  "authority": {
    "hasAuthorInfo": true,
    "hasLastModified": true,
    "hasExternalReferences": true,
    "referenceCount": 3
  }
}
```

#### schema_analysis JSONB 구조
```json
{
  "hasSchema": true,
  "schemas": [
    {
      "type": "FAQPage",
      "valid": true,
      "questionCount": 5
    },
    {
      "type": "Article",
      "valid": true,
      "hasAuthor": true,
      "hasDateModified": true
    }
  ],
  "missingRecommended": ["Organization", "BreadcrumbList"]
}
```

#### 체크리스트
- [ ] SQL 실행 완료
- [ ] 테이블 생성 확인

---

### Task 3.1.2: TypeScript 타입 정의

#### 작업 내용

**types/pageAnalysis.ts** 생성:

```typescript
// ============================================
// Page Analysis Types
// ============================================

// 크롤링 가능성 (4개 LLM)
export interface CrawlabilityAnalysis {
  robotsTxt: boolean
  perplexityBotAllowed: boolean
  oaiSearchBotAllowed: boolean
  googlebotAllowed: boolean
  claudeBotAllowed: boolean
}

// 성능 분석
export interface PerformanceAnalysis {
  loadTime: number
  mobileOptimized: boolean
  https: boolean
}

// 구조 분석
export interface StructureAnalysis {
  hasH1: boolean
  headerHierarchy: boolean
  hasSitemap: boolean
}

// 기술 분석
export interface TechnicalAnalysis {
  crawlability: CrawlabilityAnalysis
  performance: PerformanceAnalysis
  structure: StructureAnalysis
}

// BLUF 분석
export interface BLUFAnalysis {
  hasDirectAnswer: boolean
  answerInFirst100Words: boolean
  answerTokenCount: number
}

// 콘텐츠 구조 분석
export interface ContentStructureAnalysis {
  hasQuestionHeadings: boolean
  hasFAQ: boolean
  faqCount: number
  hasComparisonTable: boolean
  hasBecauseLine: boolean
}

// 권위 분석
export interface AuthorityAnalysis {
  hasAuthorInfo: boolean
  hasLastModified: boolean
  hasExternalReferences: boolean
  referenceCount: number
}

// 콘텐츠 분석
export interface ContentAnalysis {
  bluf: BLUFAnalysis
  structure: ContentStructureAnalysis
  authority: AuthorityAnalysis
}

// Schema 항목
export interface SchemaItem {
  type: string
  valid: boolean
  questionCount?: number
  hasAuthor?: boolean
  hasDateModified?: boolean
}

// Schema 분석
export interface SchemaAnalysis {
  hasSchema: boolean
  schemas: SchemaItem[]
  missingRecommended: string[]
}

// 점수 (4개 LLM)
export interface PageScores {
  overall: number
  technical: number
  content: number
  trust: number
  perplexity_ready: number
  chatgpt_ready: number
  gemini_ready: number
  claude_ready: number
}

// 개선 제안 (4개 LLM)
export interface Recommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: 'technical' | 'content' | 'schema' | 'authority'
  title: string
  description: string
  impact: string
  targetLLMs: ('perplexity' | 'chatgpt' | 'gemini' | 'claude')[]
}

// LLM 체크리스트 항목
export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
  importance: 'critical' | 'important' | 'nice-to-have'
}

// LLM별 체크리스트 (4개 LLM)
export interface LLMChecklists {
  perplexity: ChecklistItem[]
  chatgpt: ChecklistItem[]
  gemini: ChecklistItem[]
  claude: ChecklistItem[]
}

// 페이지 분석 결과
export interface PageAnalysis {
  id: string
  project_id: string | null
  url: string
  title: string | null
  meta_description: string | null
  scores: PageScores
  technical_analysis: TechnicalAnalysis
  content_analysis: ContentAnalysis
  schema_analysis: SchemaAnalysis
  recommendations: Recommendation[]
  llm_checklists: LLMChecklists
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  analyzed_at: string
}
```

#### 체크리스트
- [ ] pageAnalysis.ts 생성 완료

---

## 3. Edge Function: 페이지 분석

### Task 3.1.3: analyze-page Edge Function

#### 작업 내용

```bash
supabase functions new analyze-page
```

**supabase/functions/analyze-page/index.ts**:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzePageRequest {
  url: string
  projectId?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: AnalyzePageRequest = await req.json()
    const { url, projectId } = body

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // URL 정규화
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

    // Supabase 클라이언트
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`[PageAnalysis] Starting analysis for: ${normalizedUrl}`)

    // 페이지 fetch
    const pageResponse = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GEOAnalyzer/1.0)',
      },
    })

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch page: ${pageResponse.status}`)
    }

    const html = await pageResponse.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    if (!doc) {
      throw new Error('Failed to parse HTML')
    }

    // 분석 실행
    const title = doc.querySelector('title')?.textContent || null
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || null

    // 기술 분석
    const technicalAnalysis = await analyzeTechnical(normalizedUrl, doc)
    
    // 콘텐츠 분석
    const contentAnalysis = analyzeContent(doc, html)
    
    // Schema 분석
    const schemaAnalysis = analyzeSchema(doc)
    
    // 점수 계산
    const scores = calculateScores(technicalAnalysis, contentAnalysis, schemaAnalysis)
    
    // 개선 제안 생성
    const recommendations = generateRecommendations(technicalAnalysis, contentAnalysis, schemaAnalysis)
    
    // LLM 체크리스트 생성
    const llmChecklists = generateChecklists(technicalAnalysis, contentAnalysis, schemaAnalysis)

    // DB 저장
    const { data: analysis, error: insertError } = await supabase
      .from('page_analyses')
      .insert({
        project_id: projectId || null,
        url: normalizedUrl,
        title,
        meta_description: metaDescription,
        scores,
        technical_analysis: technicalAnalysis,
        content_analysis: contentAnalysis,
        schema_analysis: schemaAnalysis,
        recommendations,
        llm_checklists: llmChecklists,
        status: 'completed',
        analyzed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`DB error: ${insertError.message}`)
    }

    console.log(`[PageAnalysis] Completed. Score: ${scores.overall}`)

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[PageAnalysis] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// 기술 분석 함수
async function analyzeTechnical(url: string, doc: any) {
  const urlObj = new URL(url)
  const domain = urlObj.origin

  // robots.txt 확인 (4개 LLM 크롤러)
  let robotsAnalysis = {
    robotsTxt: false,
    perplexityBotAllowed: true,
    oaiSearchBotAllowed: true,
    googlebotAllowed: true,
    claudeBotAllowed: true,
  }

  try {
    const robotsResponse = await fetch(`${domain}/robots.txt`)
    if (robotsResponse.ok) {
      const robotsTxt = await robotsResponse.text()
      robotsAnalysis.robotsTxt = true
      robotsAnalysis.perplexityBotAllowed = !robotsTxt.includes('User-agent: PerplexityBot') ||
                                            !robotsTxt.includes('Disallow: /')
      robotsAnalysis.oaiSearchBotAllowed = !robotsTxt.includes('User-agent: OAI-SearchBot') ||
                                           !robotsTxt.includes('Disallow: /')
      robotsAnalysis.claudeBotAllowed = !robotsTxt.includes('User-agent: ClaudeBot') ||
                                        !robotsTxt.includes('Disallow: /')
    }
  } catch {
    // robots.txt 없음
  }

  // 구조 분석
  const h1 = doc.querySelector('h1')
  const headers = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
  
  return {
    crawlability: robotsAnalysis,
    performance: {
      loadTime: 0, // 실제 측정 어려움, 0으로 표시
      mobileOptimized: !!doc.querySelector('meta[name="viewport"]'),
      https: url.startsWith('https'),
    },
    structure: {
      hasH1: !!h1,
      headerHierarchy: checkHeaderHierarchy(headers),
      hasSitemap: false, // sitemap.xml 확인은 별도 필요
    },
  }
}

// 헤더 계층 확인
function checkHeaderHierarchy(headers: any[]): boolean {
  if (!headers || headers.length === 0) return false
  
  let lastLevel = 0
  for (const header of headers) {
    const level = parseInt(header.tagName.charAt(1))
    if (level > lastLevel + 1 && lastLevel !== 0) {
      return false // 계층 건너뜀 (예: H1 → H3)
    }
    lastLevel = level
  }
  return true
}

// 콘텐츠 분석 함수
function analyzeContent(doc: any, html: string) {
  const bodyText = doc.body?.textContent || ''
  const first100Words = bodyText.split(/\s+/).slice(0, 100).join(' ')

  // FAQ 확인
  const faqSection = html.includes('FAQ') || html.includes('자주 묻는 질문')
  const questionHeadings = doc.querySelectorAll('h2, h3').filter((h: any) => 
    h.textContent?.includes('?')
  )

  // 비교 표 확인
  const tables = doc.querySelectorAll('table')
  const hasComparisonTable = Array.from(tables).some((table: any) => 
    table.textContent?.includes('vs') || 
    table.textContent?.includes('비교')
  )

  // "Because" 라인 확인
  const hasBecauseLine = bodyText.includes('때문') || 
                         bodyText.includes('이유는') ||
                         bodyText.includes('because')

  return {
    bluf: {
      hasDirectAnswer: first100Words.length > 50,
      answerInFirst100Words: true, // 상세 분석 필요
      answerTokenCount: first100Words.split(/\s+/).length,
    },
    structure: {
      hasQuestionHeadings: questionHeadings.length > 0,
      hasFAQ: faqSection,
      faqCount: questionHeadings.length,
      hasComparisonTable,
      hasBecauseLine,
    },
    authority: {
      hasAuthorInfo: !!doc.querySelector('[rel="author"], .author, [itemprop="author"]'),
      hasLastModified: !!doc.querySelector('[itemprop="dateModified"], time[datetime]'),
      hasExternalReferences: (html.match(/href="https?:\/\/(?!.*domain)/g) || []).length > 0,
      referenceCount: (html.match(/href="https?:\/\//g) || []).length,
    },
  }
}

// Schema 분석 함수
function analyzeSchema(doc: any) {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
  const schemas: any[] = []
  const foundTypes = new Set<string>()

  scripts.forEach((script: any) => {
    try {
      const json = JSON.parse(script.textContent || '{}')
      const type = json['@type']
      
      if (type) {
        foundTypes.add(type)
        schemas.push({
          type,
          valid: true,
          ...(type === 'FAQPage' && { questionCount: json.mainEntity?.length || 0 }),
          ...(type === 'Article' && { 
            hasAuthor: !!json.author,
            hasDateModified: !!json.dateModified,
          }),
        })
      }
    } catch {
      // JSON 파싱 실패
    }
  })

  // 권장 Schema 중 누락된 것
  const recommended = ['FAQPage', 'Article', 'Organization', 'BreadcrumbList']
  const missingRecommended = recommended.filter(r => !foundTypes.has(r))

  return {
    hasSchema: schemas.length > 0,
    schemas,
    missingRecommended,
  }
}

// 점수 계산 함수
function calculateScores(technical: any, content: any, schema: any) {
  // 기술 점수 (30점)
  let technicalScore = 0
  if (technical.crawlability.perplexityBotAllowed) technicalScore += 10
  if (technical.crawlability.oaiSearchBotAllowed) technicalScore += 5
  if (technical.performance.https) technicalScore += 5
  if (technical.performance.mobileOptimized) technicalScore += 5
  if (technical.structure.hasH1) technicalScore += 3
  if (technical.structure.headerHierarchy) technicalScore += 2

  // 콘텐츠 점수 (40점)
  let contentScore = 0
  if (content.bluf.hasDirectAnswer) contentScore += 10
  if (content.structure.hasQuestionHeadings) contentScore += 8
  if (content.structure.hasFAQ) contentScore += 8
  if (content.structure.hasComparisonTable) contentScore += 6
  if (content.authority.hasAuthorInfo) contentScore += 4
  if (content.authority.hasLastModified) contentScore += 4

  // 신뢰 점수 (30점)
  let trustScore = 0
  if (schema.hasSchema) trustScore += 10
  if (schema.schemas.some((s: any) => s.type === 'FAQPage')) trustScore += 8
  if (schema.schemas.some((s: any) => s.type === 'Article')) trustScore += 6
  if (content.authority.hasExternalReferences) trustScore += 6

  const overall = Math.round((technicalScore + contentScore + trustScore))

  // LLM별 준비도
  const perplexityReady = Math.round(
    (technical.crawlability.perplexityBotAllowed ? 30 : 0) +
    (content.structure.hasFAQ ? 25 : 0) +
    (content.bluf.hasDirectAnswer ? 25 : 0) +
    (schema.schemas.some((s: any) => s.type === 'FAQPage') ? 20 : 0)
  )

  const chatgptReady = Math.round(
    (technical.crawlability.oaiSearchBotAllowed ? 30 : 0) +
    (content.authority.hasAuthorInfo ? 25 : 0) +
    (content.structure.hasQuestionHeadings ? 25 : 0) +
    (schema.schemas.some((s: any) => s.type === 'Article') ? 20 : 0)
  )

  const geminiReady = Math.round(
    (schema.hasSchema ? 30 : 0) +
    (content.authority.hasLastModified ? 25 : 0) +
    (content.authority.hasExternalReferences ? 25 : 0) +
    (schema.schemas.some((s: any) => s.type === 'Organization') ? 20 : 0)
  )

  // Claude: 웹 검색 기반 (web_search_20250305)
  const claudeReady = Math.round(
    (technical.crawlability.claudeBotAllowed ? 25 : 0) +
    (content.bluf.hasDirectAnswer ? 25 : 0) +
    (content.authority.hasAuthorInfo ? 20 : 0) +
    (content.authority.hasExternalReferences ? 15 : 0) +
    (schema.hasSchema ? 15 : 0)
  )

  return {
    overall,
    technical: technicalScore,
    content: contentScore,
    trust: trustScore,
    perplexity_ready: perplexityReady,
    chatgpt_ready: chatgptReady,
    gemini_ready: geminiReady,
    claude_ready: claudeReady,
  }
}

// 개선 제안 생성
function generateRecommendations(technical: any, content: any, schema: any) {
  const recommendations: any[] = []

  // 기술적 제안
  if (!technical.crawlability.perplexityBotAllowed) {
    recommendations.push({
      id: 'allow-perplexitybot',
      priority: 'high',
      category: 'technical',
      title: 'PerplexityBot 크롤링 허용',
      description: 'robots.txt에서 PerplexityBot을 허용하세요.',
      impact: 'Perplexity에서 인용될 가능성이 크게 증가합니다.',
      targetLLMs: ['perplexity'],
    })
  }

  if (!technical.performance.https) {
    recommendations.push({
      id: 'enable-https',
      priority: 'high',
      category: 'technical',
      title: 'HTTPS 사용',
      description: 'SSL 인증서를 설치하여 HTTPS를 활성화하세요.',
      impact: '모든 LLM에서 신뢰도가 높아집니다.',
      targetLLMs: ['perplexity', 'chatgpt', 'gemini', 'claude'],
    })
  }

  // 콘텐츠 제안
  if (!content.structure.hasFAQ) {
    recommendations.push({
      id: 'add-faq',
      priority: 'high',
      category: 'content',
      title: 'FAQ 섹션 추가',
      description: '자주 묻는 질문(FAQ) 섹션을 추가하고 FAQPage Schema를 적용하세요.',
      impact: 'Perplexity 인용률 41% 증가 효과가 있습니다.',
      targetLLMs: ['perplexity', 'gemini'],
    })
  }

  if (!content.bluf.hasDirectAnswer) {
    recommendations.push({
      id: 'add-bluf',
      priority: 'high',
      category: 'content',
      title: 'BLUF(결론 먼저) 구조 적용',
      description: '페이지 상단에 핵심 답변을 80토큰 이내로 배치하세요.',
      impact: 'Perplexity의 답변 추출 확률이 높아집니다.',
      targetLLMs: ['perplexity'],
    })
  }

  if (!content.authority.hasAuthorInfo) {
    recommendations.push({
      id: 'add-author',
      priority: 'medium',
      category: 'content',
      title: '저자 정보 추가',
      description: '콘텐츠 작성자 정보와 자격을 명시하세요.',
      impact: 'E-E-A-T 점수가 높아져 모든 LLM 노출이 증가합니다.',
      targetLLMs: ['chatgpt', 'gemini', 'claude'],
    })
  }

  // Claude 전용 제안
  if (!technical.crawlability.claudeBotAllowed) {
    recommendations.push({
      id: 'allow-claudebot',
      priority: 'high',
      category: 'technical',
      title: 'ClaudeBot 크롤링 허용',
      description: 'robots.txt에서 ClaudeBot을 허용하세요.',
      impact: 'Claude 웹 검색에서 인용될 가능성이 증가합니다.',
      targetLLMs: ['claude'],
    })
  }

  // Schema 제안
  if (!schema.schemas.some((s: any) => s.type === 'FAQPage')) {
    recommendations.push({
      id: 'add-faqpage-schema',
      priority: 'high',
      category: 'schema',
      title: 'FAQPage Schema 추가',
      description: 'FAQ 콘텐츠에 FAQPage 구조화 데이터를 추가하세요.',
      impact: 'Perplexity 인용 확률 41% 증가, Gemini AI Overviews 노출 증가',
      targetLLMs: ['perplexity', 'gemini'],
    })
  }

  if (!schema.schemas.some((s: any) => s.type === 'Article')) {
    recommendations.push({
      id: 'add-article-schema',
      priority: 'medium',
      category: 'schema',
      title: 'Article Schema 추가',
      description: '기사/블로그 콘텐츠에 Article 구조화 데이터를 추가하세요.',
      impact: '검색 결과에서 더 풍부한 정보가 표시됩니다.',
      targetLLMs: ['chatgpt', 'gemini', 'claude'],
    })
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// LLM 체크리스트 생성 (4개 LLM)
function generateChecklists(technical: any, content: any, schema: any) {
  return {
    perplexity: [
      { id: 'p1', label: 'PerplexityBot 크롤링 허용', checked: technical.crawlability.perplexityBotAllowed, importance: 'critical' },
      { id: 'p2', label: 'FAQPage Schema 적용', checked: schema.schemas.some((s: any) => s.type === 'FAQPage'), importance: 'critical' },
      { id: 'p3', label: 'BLUF 구조 (상단에 직접 답변)', checked: content.bluf.hasDirectAnswer, importance: 'critical' },
      { id: 'p4', label: '질문형 H2 헤딩 사용', checked: content.structure.hasQuestionHeadings, importance: 'important' },
      { id: 'p5', label: 'FAQ 3개 이상', checked: content.structure.faqCount >= 3, importance: 'important' },
      { id: 'p6', label: '비교 표 포함', checked: content.structure.hasComparisonTable, importance: 'nice-to-have' },
    ],
    chatgpt: [
      { id: 'c1', label: 'OAI-SearchBot 크롤링 허용', checked: technical.crawlability.oaiSearchBotAllowed, importance: 'critical' },
      { id: 'c2', label: '저자 정보 표시', checked: content.authority.hasAuthorInfo, importance: 'important' },
      { id: 'c3', label: 'Article Schema 적용', checked: schema.schemas.some((s: any) => s.type === 'Article'), importance: 'important' },
      { id: 'c4', label: '서술형 콘텐츠 구조', checked: true, importance: 'important' }, // 상세 분석 필요
      { id: 'c5', label: '외부 권위 출처 인용', checked: content.authority.hasExternalReferences, importance: 'nice-to-have' },
    ],
    gemini: [
      { id: 'g1', label: 'Schema.org 마크업 적용', checked: schema.hasSchema, importance: 'critical' },
      { id: 'g2', label: 'dateModified 표시', checked: content.authority.hasLastModified, importance: 'critical' },
      { id: 'g3', label: 'E-E-A-T 신호 (저자 정보)', checked: content.authority.hasAuthorInfo, importance: 'important' },
      { id: 'g4', label: 'Organization Schema', checked: schema.schemas.some((s: any) => s.type === 'Organization'), importance: 'important' },
      { id: 'g5', label: '독창적 데이터/인사이트', checked: false, importance: 'important' }, // 수동 확인 필요
    ],
    claude: [
      { id: 'cl1', label: 'ClaudeBot 크롤링 허용', checked: technical.crawlability.claudeBotAllowed, importance: 'critical' },
      { id: 'cl2', label: 'BLUF 구조 (직접 답변)', checked: content.bluf.hasDirectAnswer, importance: 'critical' },
      { id: 'cl3', label: '저자 정보 표시', checked: content.authority.hasAuthorInfo, importance: 'important' },
      { id: 'cl4', label: '외부 권위 출처 인용', checked: content.authority.hasExternalReferences, importance: 'important' },
      { id: 'cl5', label: 'Schema.org 마크업', checked: schema.hasSchema, importance: 'important' },
      { id: 'cl6', label: 'HTTPS 사용', checked: technical.performance.https, importance: 'important' },
    ],
  }
}
```

#### 체크리스트
- [ ] analyze-page Edge Function 생성 완료
- [ ] 로컬 테스트 완료
- [ ] 배포 완료

---

## 4. 프론트엔드 UI

### Task 3.1.4: 페이지 분석 페이지

#### 작업 내용

**app/page-analysis/page.tsx**:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { PageAnalysisResult } from '@/components/page-analysis/PageAnalysisResult'
import type { PageAnalysis } from '@/types/pageAnalysis'

export default function PageAnalysisPage() {
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<PageAnalysis | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsLoading(true)
    setResult(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('analyze-page', {
        body: { url: url.trim() },
      })

      if (error) throw error

      setResult(data)
      toast({ title: '페이지 분석 완료' })
    } catch (error: any) {
      toast({
        title: '분석 실패',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">페이지 분석</h1>
        <p className="text-muted-foreground">
          URL을 입력하면 GEO 최적화 상태를 분석하고 개선점을 제안합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            페이지 URL 입력
          </CardTitle>
          <CardDescription>
            분석할 웹페이지의 URL을 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <Input
              placeholder="https://example.com/page"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!url.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  분석
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && <PageAnalysisResult analysis={result} />}
    </div>
  )
}
```

#### 체크리스트
- [ ] page-analysis/page.tsx 생성 완료

---

### Task 3.1.5: 분석 결과 컴포넌트

#### 작업 내용

**components/page-analysis/PageAnalysisResult.tsx**:

```typescript
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import type { PageAnalysis, Recommendation, ChecklistItem } from '@/types/pageAnalysis'

interface PageAnalysisResultProps {
  analysis: PageAnalysis
}

export function PageAnalysisResult({ analysis }: PageAnalysisResultProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-100'
    if (score >= 40) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* 종합 점수 */}
      <Card>
        <CardHeader>
          <CardTitle>GEO 최적화 점수</CardTitle>
          <CardDescription>{analysis.url}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`text-center p-4 rounded-lg ${getScoreBg(analysis.scores.overall)}`}>
              <div className={`text-4xl font-bold ${getScoreColor(analysis.scores.overall)}`}>
                {analysis.scores.overall}
              </div>
              <div className="text-sm text-muted-foreground">종합 점수</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{analysis.scores.technical}</div>
              <div className="text-sm text-muted-foreground">기술 (30)</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{analysis.scores.content}</div>
              <div className="text-sm text-muted-foreground">콘텐츠 (40)</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{analysis.scores.trust}</div>
              <div className="text-sm text-muted-foreground">신뢰 (30)</div>
            </div>
          </div>

          {/* LLM별 준비도 (4개 LLM) */}
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium">4개 LLM 최적화 준비도</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm">Perplexity</span>
                <Progress value={analysis.scores.perplexity_ready} className="flex-1" />
                <span className="w-12 text-sm text-right">{analysis.scores.perplexity_ready}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm">ChatGPT</span>
                <Progress value={analysis.scores.chatgpt_ready} className="flex-1" />
                <span className="w-12 text-sm text-right">{analysis.scores.chatgpt_ready}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm">Gemini</span>
                <Progress value={analysis.scores.gemini_ready} className="flex-1" />
                <span className="w-12 text-sm text-right">{analysis.scores.gemini_ready}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm">Claude</span>
                <Progress value={analysis.scores.claude_ready} className="flex-1" />
                <span className="w-12 text-sm text-right">{analysis.scores.claude_ready}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 탭 */}
      <Tabs defaultValue="recommendations">
        <TabsList>
          <TabsTrigger value="recommendations">개선 제안</TabsTrigger>
          <TabsTrigger value="checklist">체크리스트</TabsTrigger>
          <TabsTrigger value="details">상세 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <RecommendationList recommendations={analysis.recommendations} />
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <LLMChecklistView checklists={analysis.llm_checklists} />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <DetailedAnalysis analysis={analysis} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 개선 제안 목록
function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
  }

  const priorityLabels = {
    high: '높음',
    medium: '보통',
    low: '낮음',
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
          <p className="text-lg font-medium">모든 주요 최적화가 완료되었습니다!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {recommendations.map((rec) => (
        <Card key={rec.id}>
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                rec.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{rec.title}</h4>
                  <Badge className={priorityColors[rec.priority]}>
                    {priorityLabels[rec.priority]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {rec.description}
                </p>
                <p className="text-sm text-green-700">
                  💡 {rec.impact}
                </p>
                <div className="flex gap-1 mt-2">
                  {rec.targetLLMs.map(llm => (
                    <Badge key={llm} variant="outline" className="text-xs">
                      {llm}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// LLM 체크리스트 (4개 LLM)
function LLMChecklistView({ checklists }: { checklists: any }) {
  const llms = [
    { key: 'perplexity', name: 'Perplexity', color: 'text-orange-600' },
    { key: 'chatgpt', name: 'ChatGPT', color: 'text-green-600' },
    { key: 'gemini', name: 'Gemini', color: 'text-indigo-600' },
    { key: 'claude', name: 'Claude', color: 'text-pink-600' },
  ]

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {llms.map(llm => (
        <Card key={llm.key}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg ${llm.color}`}>{llm.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {checklists[llm.key]?.map((item: ChecklistItem) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  {item.checked ? (
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className={item.checked ? '' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                  {item.importance === 'critical' && !item.checked && (
                    <Badge variant="destructive" className="text-xs">필수</Badge>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// 상세 분석
function DetailedAnalysis({ analysis }: { analysis: PageAnalysis }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">기술 분석</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h5 className="text-sm font-medium mb-2">크롤러 접근성</h5>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2">
                {analysis.technical_analysis.crawlability.perplexityBotAllowed ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <XCircle className="h-4 w-4 text-red-600" />
                }
                PerplexityBot 허용
              </li>
              <li className="flex items-center gap-2">
                {analysis.technical_analysis.crawlability.oaiSearchBotAllowed ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <XCircle className="h-4 w-4 text-red-600" />
                }
                OAI-SearchBot 허용
              </li>
            </ul>
          </div>
          <div>
            <h5 className="text-sm font-medium mb-2">성능</h5>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2">
                {analysis.technical_analysis.performance.https ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <XCircle className="h-4 w-4 text-red-600" />
                }
                HTTPS
              </li>
              <li className="flex items-center gap-2">
                {analysis.technical_analysis.performance.mobileOptimized ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <XCircle className="h-4 w-4 text-red-600" />
                }
                모바일 최적화
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Schema 분석</CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.schema_analysis.hasSchema ? (
            <div className="space-y-2">
              <p className="text-sm text-green-600">✓ 구조화 데이터 발견</p>
              <ul className="text-sm space-y-1">
                {analysis.schema_analysis.schemas.map((schema, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Badge variant="outline">{schema.type}</Badge>
                    {schema.valid ? 
                      <CheckCircle className="h-3 w-3 text-green-600" /> : 
                      <XCircle className="h-3 w-3 text-red-600" />
                    }
                  </li>
                ))}
              </ul>
              {analysis.schema_analysis.missingRecommended.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">권장 추가:</p>
                  <div className="flex gap-1 mt-1">
                    {analysis.schema_analysis.missingRecommended.map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-600">✗ 구조화 데이터 없음</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

shadcn 컴포넌트 추가:
```bash
npx shadcn@latest add progress
```

#### 체크리스트
- [ ] PageAnalysisResult.tsx 생성 완료
- [ ] 모든 하위 컴포넌트 동작 확인

---

### Task 3.1.6: 네비게이션 업데이트

#### 작업 내용

**components/layout/Header.tsx** 수정:

```typescript
const navItems = [
  { href: '/', label: '분석하기' },
  { href: '/analysis', label: '분석 기록' },
  { href: '/projects', label: '프로젝트' },
  { href: '/dashboard', label: '대시보드' },
  { href: '/page-analysis', label: '페이지 분석' },  // 추가
]
```

#### 체크리스트
- [ ] Header.tsx 수정 완료

---

## 5. 검증 체크리스트

### 최종 확인 사항

| 항목 | 확인 |
|------|------|
| URL 입력 후 분석 실행 | [ ] |
| 점수 표시 동작 | [ ] |
| 개선 제안 목록 표시 | [ ] |
| LLM별 체크리스트 표시 | [ ] |
| 상세 분석 표시 | [ ] |
| DB 저장 확인 | [ ] |

---

## 6. 다음 단계

이 문서 완료 후:
- **Phase3_02_Auth.md**: Supabase Auth 인증 시스템

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-27 | 초기 작성 |
| 2.0 | 2025-12-01 | 4개 LLM 지원 (Claude 추가), ClaudeBot 크롤러 체크, Claude 최적화 체크리스트 |
