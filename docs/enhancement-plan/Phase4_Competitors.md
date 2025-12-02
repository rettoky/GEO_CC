# Phase 4: 경쟁사 분석 강화

**기간**: 2주차 후반 - 3주차 초반
**상태**: 📋 계획 완료
**의존성**: Phase 1 완료 필요

## 목표

LLM 검색 결과에서 경쟁사를 자동으로 감지하고 점수화하여, 수동 입력 경쟁사와 함께 통합된 경쟁사 분석을 제공합니다.

## 자동 감지 알고리즘

### 점수 계산 공식

```
경쟁사 점수 (0-100) =
  인용 빈도 점수 (40점) +
  LLM 다양성 점수 (30점) +
  위치 점수 (20점) +
  도메인 권위 점수 (10점)
```

### 파일: `lib/competitors/auto-detector.ts`

```typescript
import type { AnalysisResults, LLMType } from '@/types'

export interface CompetitorScore {
  domain: string
  citationCount: number
  llmDiversity: number // 몇 개 LLM이 언급했는지 (1-4)
  avgPosition: number
  competitorScore: number // 0-100
  confidenceScore: number // 0-1
}

interface DomainData {
  count: number
  llms: Set<LLMType>
  positions: number[]
}

// 제외할 generic 도메인
const EXCLUDED_DOMAINS = [
  'wikipedia.org',
  'youtube.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'linkedin.com',
  'naver.com',
  'google.com'
]

/**
 * LLM 결과에서 경쟁사 자동 감지
 */
export function detectCompetitors(
  results: AnalysisResults,
  myDomain: string,
  maxCompetitors: number = 5
): CompetitorScore[] {
  const domainCounts = new Map<string, DomainData>()

  // 1. 모든 citation에서 도메인 추출
  for (const [llm, result] of Object.entries(results)) {
    if (!result?.success || !result.citations) continue

    for (const citation of result.citations) {
      const domain = citation.domain

      // 자신의 도메인 제외
      if (domain === myDomain) continue

      // Generic 도메인 제외
      if (EXCLUDED_DOMAINS.includes(domain)) continue

      const data = domainCounts.get(domain) || {
        count: 0,
        llms: new Set(),
        positions: []
      }

      data.count++
      data.llms.add(llm as LLMType)
      data.positions.push(citation.position)

      domainCounts.set(domain, data)
    }
  }

  // 2. 각 도메인 점수 계산
  const competitors = Array.from(domainCounts.entries()).map(([domain, data]) => {
    // 인용 빈도 점수 (max 40점)
    const citationScore = Math.min((data.count / 10) * 40, 40)

    // LLM 다양성 점수 (max 30점)
    const diversityScore = (data.llms.size / 4) * 30

    // 평균 위치 점수 (max 20점)
    const avgPos = data.positions.reduce((a, b) => a + b, 0) / data.positions.length
    const positionScore = Math.max(20 - avgPos * 2, 0)

    // 도메인 권위 점수 (간단한 휴리스틱, max 10점)
    const authorityScore = calculateAuthorityScore(domain)

    const competitorScore = citationScore + diversityScore + positionScore + authorityScore
    const confidenceScore = Math.min(competitorScore / 100, 1)

    return {
      domain,
      citationCount: data.count,
      llmDiversity: data.llms.size,
      avgPosition: avgPos,
      competitorScore,
      confidenceScore
    }
  })

  // 3. 점수 순 정렬 및 상위 N개 반환
  return competitors
    .sort((a, b) => b.competitorScore - a.competitorScore)
    .slice(0, maxCompetitors)
}

function calculateAuthorityScore(domain: string): number {
  // 간단한 휴리스틱
  // - .com > .co.kr > .kr
  // - 짧은 도메인 > 긴 도메인

  let score = 5 // base

  if (domain.endsWith('.com')) score += 3
  else if (domain.endsWith('.co.kr')) score += 2
  else if (domain.endsWith('.kr')) score += 1

  // 도메인 길이 (짧을수록 권위있다고 가정)
  const domainName = domain.split('.')[0]
  if (domainName.length <= 10) score += 2

  return Math.min(score, 10)
}
```

## UI 컴포넌트

### 파일: `components/competitors/CompetitorManager.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ManualInput } from './ManualInput'
import { AutoDetectedList } from './AutoDetectedList'
import { MergedView } from './MergedView'
import type { Competitor, CompetitorScore } from '@/types'

interface CompetitorManagerProps {
  analysisId: string
  autoDetected: CompetitorScore[]
  manualCompetitors: Competitor[]
  onUpdate: () => void
}

export function CompetitorManager({
  analysisId,
  autoDetected,
  manualCompetitors,
  onUpdate
}: CompetitorManagerProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">경쟁사 관리</h3>

      <Tabs defaultValue="merged">
        <TabsList>
          <TabsTrigger value="merged">전체 보기</TabsTrigger>
          <TabsTrigger value="auto">
            자동 감지 ({autoDetected.length})
          </TabsTrigger>
          <TabsTrigger value="manual">
            수동 입력 ({manualCompetitors.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="merged">
          <MergedView
            autoDetected={autoDetected}
            manual={manualCompetitors}
            onUpdate={onUpdate}
          />
        </TabsContent>

        <TabsContent value="auto">
          <AutoDetectedList
            competitors={autoDetected}
            analysisId={analysisId}
            onConfirm={onUpdate}
          />
        </TabsContent>

        <TabsContent value="manual">
          <ManualInput
            analysisId={analysisId}
            existingCompetitors={manualCompetitors}
            onAdd={onUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### 파일: `components/competitors/AutoDetectedList.tsx`

```typescript
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { createCompetitor } from '@/lib/supabase/queries/competitors'
import type { CompetitorScore } from '@/types'

interface AutoDetectedListProps {
  competitors: CompetitorScore[]
  analysisId: string
  onConfirm: () => void
}

export function AutoDetectedList({
  competitors,
  analysisId,
  onConfirm
}: AutoDetectedListProps) {
  const handleConfirm = async (comp: CompetitorScore) => {
    await createCompetitor({
      analysis_id: analysisId,
      domain: comp.domain,
      detection_method: 'auto',
      citation_count: comp.citationCount,
      citation_rate: 0, // 나중에 계산
      confidence_score: comp.confidenceScore,
      llm_appearances: {} // 상세 정보
    })

    onConfirm()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        LLM 검색 결과에서 자동으로 감지된 경쟁사입니다.
      </p>

      {competitors.map((comp) => (
        <Card key={comp.domain} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium">{comp.domain}</div>
              <div className="text-sm text-gray-500 mt-1">
                {comp.citationCount}회 인용 ·{' '}
                {comp.llmDiversity}개 LLM ·{' '}
                평균 {comp.avgPosition.toFixed(1)}번째 위치
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={comp.confidenceScore > 0.7 ? 'success' : 'warning'}
              >
                신뢰도 {(comp.confidenceScore * 100).toFixed(0)}%
              </Badge>

              <Button
                size="sm"
                onClick={() => handleConfirm(comp)}
              >
                <Check className="h-4 w-4 mr-1" />
                확인
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {competitors.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          자동 감지된 경쟁사가 없습니다.
        </div>
      )}
    </div>
  )
}
```

### 파일: `components/competitors/ManualInput.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCompetitor } from '@/lib/supabase/queries/competitors'
import type { Competitor } from '@/types'

interface ManualInputProps {
  analysisId: string
  existingCompetitors: Competitor[]
  onAdd: () => void
}

export function ManualInput({
  analysisId,
  existingCompetitors,
  onAdd
}: ManualInputProps) {
  const [domain, setDomain] = useState('')
  const [brandName, setBrandName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!domain.trim()) return

    setIsAdding(true)

    try {
      await createCompetitor({
        analysis_id: analysisId,
        domain: domain.trim(),
        brand_name: brandName.trim() || undefined,
        detection_method: 'manual'
      })

      setDomain('')
      setBrandName('')
      onAdd()
    } catch (error) {
      console.error('Failed to add competitor:', error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <Label>도메인</Label>
          <Input
            placeholder="예: samsung.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>

        <div>
          <Label>브랜드명 (선택)</Label>
          <Input
            placeholder="예: 삼성화재"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
          />
        </div>

        <Button
          onClick={handleAdd}
          disabled={!domain.trim() || isAdding}
          className="w-full"
        >
          {isAdding ? '추가 중...' : '경쟁사 추가'}
        </Button>
      </div>

      {existingCompetitors.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">추가된 경쟁사</h4>
          <div className="space-y-2">
            {existingCompetitors.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div>
                  <div className="font-medium">{comp.domain}</div>
                  {comp.brand_name && (
                    <div className="text-sm text-gray-500">{comp.brand_name}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

## 기존 컴포넌트 수정

### 파일: `components/analysis/CompetitorComparison.tsx` (수정)

기존 차트에 수동/자동 경쟁사 통합:

```typescript
// 기존 코드에서 경쟁사 데이터 가져오기 수정
const competitors = await getCompetitorsByAnalysis(analysisId)

// 자동 + 수동 경쟁사 모두 표시
const chartData = competitors.map(comp => ({
  name: comp.brand_name || comp.domain,
  value: comp.citation_count,
  type: comp.detection_method // 'auto' | 'manual'
}))
```

## 체크리스트

- [ ] `lib/competitors/auto-detector.ts` 생성
- [ ] 자동 감지 알고리즘 테스트
- [ ] `CompetitorManager.tsx` 생성
- [ ] `AutoDetectedList.tsx` 생성
- [ ] `ManualInput.tsx` 생성
- [ ] `MergedView.tsx` 생성
- [ ] `CompetitorComparison.tsx` 수정
- [ ] 수동/자동 경쟁사 통합 테스트

## 다음 단계

Phase 4 완료 후 → **Phase 5: 시각화 시스템**

---

**예상 소요 시간**: 2-3일
**난이도**: ⭐⭐ (중간)
