import { notFound } from 'next/navigation'
import { getAnalysisById } from '@/lib/supabase/queries'
import { AnalysisDetailClient } from './AnalysisDetailClient'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * 분석 상세 페이지 (T049-T051)
 */
export default async function AnalysisDetailPage({ params }: PageProps) {
  const { id } = await params
  const analysis = await getAnalysisById(id)

  if (!analysis) {
    notFound()
  }

  return <AnalysisDetailClient analysis={analysis} />
}
