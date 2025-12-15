/**
 * 會計報表 React Query Hooks
 * Account-system → quotation-system 整合
 */

import { useQuery } from '@tanstack/react-query'
import type { TrialBalanceItem } from '@/lib/dal/accounting'

// ============================================
// 類型定義
// ============================================

export interface IncomeStatementReport {
  period: { startDate: string; endDate: string }
  revenue: { items: Array<{ accountCode: string; accountName: string; amount: number }>; total: number }
  expenses: { items: Array<{ accountCode: string; accountName: string; amount: number }>; total: number }
  netIncome: number
}

export interface BalanceSheetReport {
  asOfDate: string
  assets: { items: Array<{ accountCode: string; accountName: string; balance: number }>; total: number }
  liabilities: { items: Array<{ accountCode: string; accountName: string; balance: number }>; total: number }
  equity: { items: Array<{ accountCode: string; accountName: string; balance: number }>; total: number }
}

// ============================================
// Query Keys
// ============================================

export const reportKeys = {
  all: ['accounting-reports'] as const,
  trialBalance: (companyId: string, startDate: string, endDate: string) =>
    [...reportKeys.all, 'trial-balance', companyId, startDate, endDate] as const,
  incomeStatement: (companyId: string, startDate: string, endDate: string) =>
    [...reportKeys.all, 'income-statement', companyId, startDate, endDate] as const,
  balanceSheet: (companyId: string, asOfDate: string) =>
    [...reportKeys.all, 'balance-sheet', companyId, asOfDate] as const,
}

// ============================================
// API 呼叫函數
// ============================================

async function fetchTrialBalance(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<TrialBalanceItem[]> {
  const searchParams = new URLSearchParams({
    company_id: companyId,
    start_date: startDate,
    end_date: endDate,
  })

  const response = await fetch(`/api/accounting/reports/trial-balance?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as { error?: string }
    throw new Error(data.error || 'Failed to fetch trial balance')
  }
  return response.json()
}

async function fetchIncomeStatement(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<IncomeStatementReport> {
  const searchParams = new URLSearchParams({
    company_id: companyId,
    start_date: startDate,
    end_date: endDate,
  })

  const response = await fetch(`/api/accounting/reports/income-statement?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as { error?: string }
    throw new Error(data.error || 'Failed to fetch income statement')
  }
  return response.json()
}

async function fetchBalanceSheet(companyId: string, asOfDate: string): Promise<BalanceSheetReport> {
  const searchParams = new URLSearchParams({
    company_id: companyId,
    as_of_date: asOfDate,
  })

  const response = await fetch(`/api/accounting/reports/balance-sheet?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as { error?: string }
    throw new Error(data.error || 'Failed to fetch balance sheet')
  }
  return response.json()
}

// ============================================
// React Query Hooks
// ============================================

/**
 * 取得試算表
 */
export function useTrialBalance(
  companyId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery({
    queryKey: reportKeys.trialBalance(companyId, startDate, endDate),
    queryFn: () => fetchTrialBalance(companyId, startDate, endDate),
    enabled: enabled && !!companyId && !!startDate && !!endDate,
    staleTime: 60 * 1000, // 1 分鐘
  })
}

/**
 * 取得損益表
 */
export function useIncomeStatement(
  companyId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  return useQuery({
    queryKey: reportKeys.incomeStatement(companyId, startDate, endDate),
    queryFn: () => fetchIncomeStatement(companyId, startDate, endDate),
    enabled: enabled && !!companyId && !!startDate && !!endDate,
    staleTime: 60 * 1000, // 1 分鐘
  })
}

/**
 * 取得資產負債表
 */
export function useBalanceSheet(companyId: string, asOfDate: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.balanceSheet(companyId, asOfDate),
    queryFn: () => fetchBalanceSheet(companyId, asOfDate),
    enabled: enabled && !!companyId && !!asOfDate,
    staleTime: 60 * 1000, // 1 分鐘
  })
}
