/**
 * 배치 분석 실행 스크립트
 * 30개 변형 쿼리로 "암보험 추천" 분석 수행
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// .env.local 파일 로드
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          process.env[key] = value
        }
      }
    }
  } catch (err) {
    console.error('Failed to load .env.local:', err)
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗')
  process.exit(1)
}

interface GeneratedVariation {
  query: string
  type: string
  reasoning: string
}

async function runBatchAnalysis() {
  console.log('🚀 배치 분석 시작...')

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const baseQuery = '암보험 추천'
  const domain = 'meritzfire.com'
  const brand = '메리츠'

  const variations: GeneratedVariation[] = [
    { query: '20대 암보험 추천 좀', type: 'demographic', reasoning: '20대 사용자' },
    { query: '30대 여자 암보험 추천', type: 'demographic', reasoning: '30대 여성' },
    { query: '40대 남자 암보험 괜찮은거 추천', type: 'demographic', reasoning: '40대 남성' },
    { query: '50대 암보험 추천 부탁드려요', type: 'demographic', reasoning: '50대' },
    { query: '60대 암보험 가입 쉬운 곳 추천', type: 'demographic', reasoning: '60대' },
    { query: '주부 암보험 추천해주세요', type: 'demographic', reasoning: '주부' },
    { query: '직장인 암보험 추천 상품', type: 'demographic', reasoning: '직장인' },
    { query: '암보험이란 무엇인가', type: 'informational', reasoning: '정의' },
    { query: '암보험 종류 뭐가 있나요?', type: 'informational', reasoning: '종류' },
    { query: '암보험 보장 범위 자세히', type: 'informational', reasoning: '보장 범위' },
    { query: '암보험 가입 조건 확인', type: 'informational', reasoning: '가입 조건' },
    { query: '암보험금 수령 방법', type: 'informational', reasoning: '수령 방법' },
    { query: '갱신형 암보험 vs 비갱신형 암보험 비교', type: 'comparison', reasoning: '갱신형 비교' },
    { query: '암보험 회사별 비교', type: 'comparison', reasoning: '회사별 비교' },
    { query: '가성비 암보험 비교 추천', type: 'comparison', reasoning: '가성비 비교' },
    { query: '암보험 순위 좀 알려주세요', type: 'comparison', reasoning: '순위' },
    { query: '2024년 암보험 순위', type: 'comparison', reasoning: '2024년 순위' },
    { query: '암보험 추천해주세요', type: 'recommendation', reasoning: '일반 추천' },
    { query: '암보험 좋은 거 추천', type: 'recommendation', reasoning: '좋은 추천' },
    { query: '가성비 좋은 암보험 추천 좀', type: 'recommendation', reasoning: '가성비 추천' },
    { query: '부모님 암보험 추천 부탁', type: 'recommendation', reasoning: '부모님용' },
    { query: '어떤 암보험이 제일 좋아요?', type: 'recommendation', reasoning: '최고 추천' },
    { query: '암보험 가입 시 주의사항', type: 'informational', reasoning: '주의사항' },
    { query: '암보험 비갱신형 추천', type: 'recommendation', reasoning: '비갱신형' },
    { query: '암보험 저렴한 곳 추천', type: 'recommendation', reasoning: '저렴한 곳' },
    { query: '암보험 보장 많이 되는 곳 추천', type: 'recommendation', reasoning: '보장 많은 곳' },
    { query: '암보험 비교 사이트 추천', type: 'recommendation', reasoning: '비교 사이트' },
    { query: '암보험 설계사 추천', type: 'recommendation', reasoning: '설계사' },
    { query: '고혈압 암보험 가입 가능한가요?', type: 'informational', reasoning: '고혈압' },
    { query: '암보험 중복 보장 되나요?', type: 'informational', reasoning: '중복 보장' },
  ]

  console.log(`📊 기본 쿼리: "${baseQuery}"`)
  console.log(`📊 도메인: ${domain}`)
  console.log(`📊 브랜드: ${brand}`)
  console.log(`📊 변형 쿼리 수: ${variations.length}개`)

  // 분석 레코드 생성
  const { data: analysisRecord, error: createError } = await supabase
    .from('analyses')
    .insert({
      query_text: baseQuery,
      my_domain: domain,
      my_brand: brand,
      brand_aliases: ['메리츠', '메리츠화재', 'Meritz'],
      status: 'processing',
      base_query: baseQuery,
      query_variations_count: variations.length,
      total_queries_analyzed: variations.length + 1,
    })
    .select()
    .single()

  if (createError) {
    console.error('❌ 분석 레코드 생성 실패:', createError)
    return
  }

  console.log(`✅ 분석 레코드 생성됨: ${analysisRecord.id}`)

  // Edge Function 호출하여 각 쿼리 분석
  const allResults: any[] = []
  const queriesToAnalyze = [baseQuery, ...variations.map(v => v.query)]

  for (let i = 0; i < queriesToAnalyze.length; i++) {
    const query = queriesToAnalyze[i]
    const isBase = i === 0
    const progress = Math.round((i / queriesToAnalyze.length) * 100)

    console.log(`\n[${progress}%] ${isBase ? '기본' : '변형'} 쿼리 분석 중 (${i + 1}/${queriesToAnalyze.length}): "${query}"`)

    try {
      const { data, error } = await supabase.functions.invoke('analyze-query', {
        body: {
          query,
          domain,
          brand,
          brandAliases: ['메리츠', '메리츠화재', 'Meritz'],
        },
      })

      if (error) {
        console.error(`  ❌ 분석 실패: ${error.message}`)
        allResults.push({
          query,
          queryType: isBase ? 'base' : 'variation',
          variationType: isBase ? undefined : variations[i - 1]?.type,
          error: error.message,
        })
      } else if (data?.success) {
        console.log(`  ✅ 분석 완료`)
        allResults.push({
          query,
          queryType: isBase ? 'base' : 'variation',
          variationType: isBase ? undefined : variations[i - 1]?.type,
          results: data.data.results,
          summary: data.data.summary,
        })
      } else {
        console.log(`  ⚠️ 분석 실패: ${data?.error?.message}`)
        allResults.push({
          query,
          queryType: isBase ? 'base' : 'variation',
          variationType: isBase ? undefined : variations[i - 1]?.type,
          error: data?.error?.message || 'Unknown error',
        })
      }
    } catch (err) {
      console.error(`  ❌ 예외 발생: ${err}`)
      allResults.push({
        query,
        queryType: isBase ? 'base' : 'variation',
        variationType: isBase ? undefined : variations[i - 1]?.type,
        error: String(err),
      })
    }

    // Rate limiting - 1초 대기
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n\n📊 분석 완료! 결과 저장 중...')

  // 결과 저장
  const baseResult = allResults[0]
  const successCount = allResults.filter(r => !r.error).length

  const { error: updateError } = await supabase
    .from('analyses')
    .update({
      status: 'completed',
      results: baseResult?.results || {},
      summary: baseResult?.summary || {},
      intermediate_results: {
        allQueryResults: allResults,
        baseQueryResult: baseResult,
        variationResults: allResults.slice(1),
      },
      completed_at: new Date().toISOString(),
    })
    .eq('id', analysisRecord.id)

  if (updateError) {
    console.error('❌ 결과 저장 실패:', updateError)
  } else {
    console.log(`\n✅ 배치 분석 완료!`)
    console.log(`   - 분석 ID: ${analysisRecord.id}`)
    console.log(`   - 성공: ${successCount}/${allResults.length}`)
    console.log(`   - 웹에서 확인: http://localhost:3001/analysis/${analysisRecord.id}`)
  }
}

runBatchAnalysis().catch(console.error)
