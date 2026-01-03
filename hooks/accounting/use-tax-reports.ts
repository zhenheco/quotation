/**
 * 營業稅申報 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Form401Data, Form403Data, InvoiceDetail } from '@/lib/services/accounting/tax-report.service'

// ============================================
// Query Keys
// ============================================

export const taxReportKeys = {
  all: ['tax-reports'] as const,
  form401: (companyId: string, year: number, biMonth: number) =>
    [...taxReportKeys.all, 'form401', companyId, year, biMonth] as const,
  form403: (companyId: string, year: number, biMonth: number) =>
    [...taxReportKeys.all, 'form403', companyId, year, biMonth] as const,
  invoiceDetails: (companyId: string, type: string, startDate: string, endDate: string) =>
    [...taxReportKeys.all, 'invoice-details', companyId, type, startDate, endDate] as const,
}

// ============================================
// 類型定義
// ============================================

export interface TaxReportParams {
  companyId: string
  taxId: string
  companyName: string
  year: number
  biMonth: number
}

export interface InvoiceDetailListResult {
  invoices: InvoiceDetail[]
  summary: {
    count: number
    untaxedAmount: number
    taxAmount: number
    totalAmount: number
  }
}

// ============================================
// API 呼叫函數
// ============================================

async function fetchForm401(params: TaxReportParams): Promise<Form401Data> {
  const searchParams = new URLSearchParams({
    company_id: params.companyId,
    tax_id: params.taxId,
    company_name: params.companyName,
    year: params.year.toString(),
    bi_month: params.biMonth.toString(),
    form: '401',
  })

  const response = await fetch(`/api/accounting/reports/tax?${searchParams}`)
  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error || '取得 401 申報書失敗')
  }
  const result = (await response.json()) as { success: boolean; data: Form401Data }
  return result.data
}

async function fetchForm403(params: TaxReportParams): Promise<Form403Data> {
  const searchParams = new URLSearchParams({
    company_id: params.companyId,
    tax_id: params.taxId,
    company_name: params.companyName,
    year: params.year.toString(),
    bi_month: params.biMonth.toString(),
    form: '403',
  })

  const response = await fetch(`/api/accounting/reports/tax?${searchParams}`)
  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error || '取得 403 申報書失敗')
  }
  const result = (await response.json()) as { success: boolean; data: Form403Data }
  return result.data
}

async function downloadXml(params: TaxReportParams, form: '401' | '403'): Promise<Blob> {
  const searchParams = new URLSearchParams({
    company_id: params.companyId,
    tax_id: params.taxId,
    company_name: params.companyName,
    year: params.year.toString(),
    bi_month: params.biMonth.toString(),
    form,
    format: 'xml',
  })

  const response = await fetch(`/api/accounting/reports/tax?${searchParams}`)
  if (!response.ok) {
    throw new Error('XML 下載失敗')
  }
  return response.blob()
}

/**
 * 下載媒體申報檔
 */
async function downloadMediaFile(params: TaxReportParams): Promise<Blob> {
  const searchParams = new URLSearchParams({
    company_id: params.companyId,
    tax_id: params.taxId,
    company_name: params.companyName,
    year: params.year.toString(),
    bi_month: params.biMonth.toString(),
  })

  const response = await fetch(`/api/accounting/reports/tax/media?${searchParams}`)
  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error || '媒體檔下載失敗')
  }
  return response.blob()
}

async function fetchInvoiceDetails(
  companyId: string,
  type: 'OUTPUT' | 'INPUT',
  startDate: string,
  endDate: string
): Promise<InvoiceDetailListResult> {
  const response = await fetch('/api/accounting/reports/tax', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_id: companyId,
      type,
      start_date: startDate,
      end_date: endDate,
    }),
  })

  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error || '取得發票明細失敗')
  }

  const result = (await response.json()) as { success: boolean; data: InvoiceDetailListResult }
  return result.data
}

// ============================================
// React Query Hooks
// ============================================

/**
 * 取得 401 申報書資料
 */
export function useForm401(params: TaxReportParams | null, enabled = true) {
  return useQuery({
    queryKey: params
      ? taxReportKeys.form401(params.companyId, params.year, params.biMonth)
      : ['form401-disabled'],
    queryFn: () => fetchForm401(params!),
    enabled: enabled && !!params,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })
}

/**
 * 取得 403 申報書資料
 */
export function useForm403(params: TaxReportParams | null, enabled = true) {
  return useQuery({
    queryKey: params
      ? taxReportKeys.form403(params.companyId, params.year, params.biMonth)
      : ['form403-disabled'],
    queryFn: () => fetchForm403(params!),
    enabled: enabled && !!params,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })
}

/**
 * 下載 XML 申報檔
 */
export function useDownloadTaxXml() {
  return useMutation({
    mutationFn: async ({
      params,
      form,
    }: {
      params: TaxReportParams
      form: '401' | '403'
    }) => {
      const blob = await downloadXml(params, form)
      // 觸發下載
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `VAT${form}_${params.year}_${params.biMonth}.xml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    },
  })
}

/**
 * 取得發票明細表
 */
export function useInvoiceDetails(
  companyId: string,
  type: 'OUTPUT' | 'INPUT',
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery({
    queryKey: taxReportKeys.invoiceDetails(companyId, type, startDate, endDate),
    queryFn: () => fetchInvoiceDetails(companyId, type, startDate, endDate),
    enabled: enabled && !!companyId && !!startDate && !!endDate,
    staleTime: 60 * 1000, // 1 分鐘
  })
}

/**
 * 下載 401 媒體申報檔
 */
export function useDownloadMediaFile() {
  return useMutation({
    mutationFn: async ({ params }: { params: TaxReportParams }) => {
      const blob = await downloadMediaFile(params)
      // 觸發下載
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${params.taxId}.TXT`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    },
  })
}

/**
 * 使申報資料失效（重新載入）
 */
export function useInvalidateTaxReports() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: taxReportKeys.all })
  }
}
