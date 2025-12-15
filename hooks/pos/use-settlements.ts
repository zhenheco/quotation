/**
 * POS 日結帳 React Query Hooks
 * Account-system → quotation-system 整合
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DailySettlement, SettlementStatus } from '@/lib/dal/pos'
import type { SettlementListResult } from '@/lib/services/pos/settlement.service'

// ============================================
// 類型定義
// ============================================

interface ApiError {
  error?: string
}

export interface MonthlySettlementReport {
  branchId: string
  year: number
  month: number
  settlements: DailySettlement[]
  totalSales: number
  totalCash: number
  totalCard: number
  averageDailySales: number
  daysSettled: number
}

export interface SettlementWorkflow {
  settlement: DailySettlement
  canCount: boolean
  canApprove: boolean
  canLock: boolean
  nextStep: 'count' | 'approve' | 'lock' | 'done'
}

// ============================================
// Query Keys
// ============================================

export const settlementKeys = {
  all: ['pos-settlements'] as const,
  lists: () => [...settlementKeys.all, 'list'] as const,
  list: (branchId: string, filters?: object) =>
    [...settlementKeys.lists(), branchId, filters] as const,
  details: () => [...settlementKeys.all, 'detail'] as const,
  detail: (id: string) => [...settlementKeys.details(), id] as const,
  forDate: (branchId: string, date: string) =>
    [...settlementKeys.all, 'date', branchId, date] as const,
  monthly: (branchId: string, year: number, month: number) =>
    [...settlementKeys.all, 'monthly', branchId, year, month] as const,
  workflow: (id: string) => [...settlementKeys.all, 'workflow', id] as const,
}

// ============================================
// API 呼叫函數
// ============================================

interface ListSettlementsParams {
  branchId: string
  status?: SettlementStatus
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

async function fetchSettlements(params: ListSettlementsParams): Promise<SettlementListResult> {
  const searchParams = new URLSearchParams({
    branch_id: params.branchId,
    ...(params.status && { status: params.status }),
    ...(params.startDate && { start_date: params.startDate }),
    ...(params.endDate && { end_date: params.endDate }),
    page: String(params.page || 1),
    page_size: String(params.pageSize || 20),
  })

  const response = await fetch(`/api/pos/settlements?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch settlements')
  }
  return response.json()
}

async function fetchSettlement(id: string): Promise<DailySettlement> {
  const response = await fetch(`/api/pos/settlements/${id}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch settlement')
  }
  return response.json()
}

async function fetchSettlementForDate(
  branchId: string,
  date: string
): Promise<DailySettlement | null> {
  const searchParams = new URLSearchParams({
    branch_id: branchId,
    date,
  })

  const response = await fetch(`/api/pos/settlements?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch settlement for date')
  }
  return response.json()
}

async function fetchMonthlyReport(
  branchId: string,
  year: number,
  month: number
): Promise<MonthlySettlementReport> {
  const searchParams = new URLSearchParams({
    branch_id: branchId,
    monthly: 'true',
    year: String(year),
    month: String(month),
  })

  const response = await fetch(`/api/pos/settlements?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch monthly report')
  }
  return response.json()
}

async function fetchSettlementWorkflow(id: string): Promise<SettlementWorkflow> {
  const response = await fetch(`/api/pos/settlements/${id}?workflow=true`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch settlement workflow')
  }
  return response.json()
}

async function startSettlement(branchId: string, date: string): Promise<DailySettlement> {
  const response = await fetch('/api/pos/settlements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branch_id: branchId, date }),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to start settlement')
  }
  return response.json()
}

async function countSettlementCash(id: string, actualCash: number): Promise<DailySettlement> {
  const response = await fetch(`/api/pos/settlements/${id}/count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actual_cash: actualCash }),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to count settlement cash')
  }
  return response.json()
}

async function approveSettlement(id: string): Promise<DailySettlement> {
  const response = await fetch(`/api/pos/settlements/${id}/approve`, {
    method: 'POST',
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to approve settlement')
  }
  return response.json()
}

async function lockSettlement(id: string): Promise<DailySettlement> {
  const response = await fetch(`/api/pos/settlements/${id}/lock`, {
    method: 'POST',
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to lock settlement')
  }
  return response.json()
}

// ============================================
// React Query Hooks
// ============================================

/**
 * 取得日結帳列表
 */
export function useSettlements(params: ListSettlementsParams, enabled = true) {
  return useQuery({
    queryKey: settlementKeys.list(params.branchId, params),
    queryFn: () => fetchSettlements(params),
    enabled: enabled && !!params.branchId,
    staleTime: 30 * 1000, // 30 秒
  })
}

/**
 * 取得單一日結帳
 */
export function useSettlement(id: string, enabled = true) {
  return useQuery({
    queryKey: settlementKeys.detail(id),
    queryFn: () => fetchSettlement(id),
    enabled: enabled && !!id,
  })
}

/**
 * 取得特定日期的日結帳
 */
export function useSettlementForDate(branchId: string, date: string, enabled = true) {
  return useQuery({
    queryKey: settlementKeys.forDate(branchId, date),
    queryFn: () => fetchSettlementForDate(branchId, date),
    enabled: enabled && !!branchId && !!date,
  })
}

/**
 * 取得月報
 */
export function useMonthlySettlementReport(
  branchId: string,
  year: number,
  month: number,
  enabled = true
) {
  return useQuery({
    queryKey: settlementKeys.monthly(branchId, year, month),
    queryFn: () => fetchMonthlyReport(branchId, year, month),
    enabled: enabled && !!branchId && !!year && !!month,
    staleTime: 60 * 1000, // 1 分鐘
  })
}

/**
 * 取得日結帳工作流程狀態
 */
export function useSettlementWorkflow(id: string, enabled = true) {
  return useQuery({
    queryKey: settlementKeys.workflow(id),
    queryFn: () => fetchSettlementWorkflow(id),
    enabled: enabled && !!id,
  })
}

/**
 * 開始日結帳
 */
export function useStartSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ branchId, date }: { branchId: string; date: string }) =>
      startSettlement(branchId, date),
    onSuccess: (data, { branchId, date }) => {
      queryClient.invalidateQueries({ queryKey: settlementKeys.lists() })
      queryClient.setQueryData(settlementKeys.detail(data.id), data)
      queryClient.setQueryData(settlementKeys.forDate(branchId, date), data)
    },
  })
}

/**
 * 點鈔確認
 */
export function useCountSettlementCash() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, actualCash }: { id: string; actualCash: number }) =>
      countSettlementCash(id, actualCash),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: settlementKeys.lists() })
      queryClient.setQueryData(settlementKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: settlementKeys.workflow(data.id) })
    },
  })
}

/**
 * 審核日結帳
 */
export function useApproveSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: approveSettlement,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: settlementKeys.lists() })
      queryClient.setQueryData(settlementKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: settlementKeys.workflow(data.id) })
    },
  })
}

/**
 * 鎖定日結帳
 */
export function useLockSettlement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: lockSettlement,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: settlementKeys.lists() })
      queryClient.setQueryData(settlementKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: settlementKeys.workflow(data.id) })
    },
  })
}
