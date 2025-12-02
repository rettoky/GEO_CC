/**
 * Reports Queries
 * 분석 보고서 CRUD 함수 (웹 데이터 + PDF)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  Report,
  CreateReportInput,
  ReportType,
  PDFStatus,
  ReportWebData,
} from '@/types/reports'

/**
 * 특정 분석의 보고서 조회
 */
export async function getReportByAnalysisId(
  supabase: SupabaseClient,
  analysisId: string
): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('analysis_id', analysisId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows found
    throw error
  }
  return data
}

/**
 * 단일 보고서 조회 (ID로)
 */
export async function getReportById(
  supabase: SupabaseClient,
  id: string
): Promise<Report | null> {
  const { data, error } = await supabase.from('reports').select('*').eq('id', id).single()

  if (error) throw error
  return data
}

/**
 * 보고서 생성
 */
export async function createReport(
  supabase: SupabaseClient,
  input: CreateReportInput
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      analysis_id: input.analysis_id,
      report_type: input.report_type || 'comprehensive',
      web_data: input.web_data || null,
      pdf_status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 보고서 웹 데이터 업데이트
 */
export async function updateReportWebData(
  supabase: SupabaseClient,
  reportId: string,
  webData: ReportWebData
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({
      web_data: webData,
      generated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * PDF 생성 시작
 */
export async function updateReportPDFGenerating(
  supabase: SupabaseClient,
  reportId: string
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({
      pdf_status: 'generating',
      pdf_error: null,
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * PDF 생성 완료
 */
export async function updateReportPDFCompleted(
  supabase: SupabaseClient,
  reportId: string,
  pdfUrl: string
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({
      pdf_status: 'completed',
      pdf_url: pdfUrl,
      pdf_error: null,
      generated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * PDF 생성 실패
 */
export async function updateReportPDFFailed(
  supabase: SupabaseClient,
  reportId: string,
  errorMessage: string
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({
      pdf_status: 'failed',
      pdf_error: errorMessage,
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 보고서 업데이트 (범용)
 */
export async function updateReport(
  supabase: SupabaseClient,
  reportId: string,
  updates: Partial<Omit<Report, 'id' | 'analysis_id' | 'created_at'>>
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 보고서 삭제
 */
export async function deleteReport(
  supabase: SupabaseClient,
  reportId: string
): Promise<void> {
  const { error } = await supabase.from('reports').delete().eq('id', reportId)

  if (error) throw error
}

/**
 * PDF 상태별 보고서 조회
 */
export async function getReportsByPDFStatus(
  supabase: SupabaseClient,
  status: PDFStatus,
  limit: number = 50
): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('pdf_status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * 보고서 타입별 조회
 */
export async function getReportsByType(
  supabase: SupabaseClient,
  reportType: ReportType,
  limit: number = 50
): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('report_type', reportType)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * 최근 보고서 조회
 */
export async function getRecentReports(
  supabase: SupabaseClient,
  limit: number = 20
): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * 보고서 존재 여부 확인
 */
export async function checkReportExists(
  supabase: SupabaseClient,
  analysisId: string
): Promise<boolean> {
  const report = await getReportByAnalysisId(supabase, analysisId)
  return report !== null
}

/**
 * PDF 생성 대기 중인 보고서 조회
 */
export async function getPendingPDFReports(
  supabase: SupabaseClient,
  limit: number = 10
): Promise<Report[]> {
  return getReportsByPDFStatus(supabase, 'pending', limit)
}

/**
 * 보고서 통계 조회
 */
export async function getReportStats(
  supabase: SupabaseClient
): Promise<{
  total: number
  comprehensive: number
  summary: number
  pdfPending: number
  pdfGenerating: number
  pdfCompleted: number
  pdfFailed: number
}> {
  const { data, error } = await supabase.from('reports').select('report_type, pdf_status')

  if (error) throw error

  const reports = data || []

  const comprehensive = reports.filter((r) => r.report_type === 'comprehensive').length
  const summary = reports.filter((r) => r.report_type === 'summary').length

  const pdfPending = reports.filter((r) => r.pdf_status === 'pending').length
  const pdfGenerating = reports.filter((r) => r.pdf_status === 'generating').length
  const pdfCompleted = reports.filter((r) => r.pdf_status === 'completed').length
  const pdfFailed = reports.filter((r) => r.pdf_status === 'failed').length

  return {
    total: reports.length,
    comprehensive,
    summary,
    pdfPending,
    pdfGenerating,
    pdfCompleted,
    pdfFailed,
  }
}

/**
 * 보고서 재생성 (기존 데이터 유지하면서 PDF 재시도)
 */
export async function retryReportPDF(
  supabase: SupabaseClient,
  reportId: string
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({
      pdf_status: 'pending',
      pdf_error: null,
      pdf_url: null,
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}
