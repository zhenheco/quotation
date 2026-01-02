/**
 * 會計傳票 React Query Hooks
 * Account-system → quotation-system 整合
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  JournalEntryWithTransactions,
  JournalStatus,
  TransactionSource,
} from '@/lib/dal/accounting'
import type { JournalListResult, CreateJournalRequest } from '@/lib/services/accounting/journal.service'

// ============================================
// 類型定義
// ============================================

interface ApiError {
  error?: string
}

// ============================================
// Query Keys
// ============================================

export const journalKeys = {
  all: ['journals'] as const,
  lists: () => [...journalKeys.all, 'list'] as const,
  list: (companyId: string, filters?: object) =>
    [...journalKeys.lists(), companyId, filters] as const,
  details: () => [...journalKeys.all, 'detail'] as const,
  detail: (id: string) => [...journalKeys.details(), id] as const,
}

// ============================================
// API 呼叫函數
// ============================================

interface ListJournalsParams {
  companyId: string
  status?: JournalStatus
  startDate?: string
  endDate?: string
  sourceType?: TransactionSource
  page?: number
  pageSize?: number
}

async function fetchJournals(params: ListJournalsParams): Promise<JournalListResult> {
  const searchParams = new URLSearchParams({
    company_id: params.companyId,
    ...(params.status && { status: params.status }),
    ...(params.startDate && { start_date: params.startDate }),
    ...(params.endDate && { end_date: params.endDate }),
    ...(params.sourceType && { source_type: params.sourceType }),
    page: String(params.page || 1),
    page_size: String(params.pageSize || 20),
  })

  const response = await fetch(`/api/accounting/journals?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch journals')
  }
  return response.json()
}

async function fetchJournal(id: string): Promise<JournalEntryWithTransactions> {
  const response = await fetch(`/api/accounting/journals/${id}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch journal')
  }
  return response.json()
}

async function createJournal(input: CreateJournalRequest): Promise<JournalEntryWithTransactions> {
  const response = await fetch('/api/accounting/journals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to create journal')
  }
  return response.json()
}

async function deleteJournal(id: string): Promise<void> {
  const response = await fetch(`/api/accounting/journals/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to delete journal')
  }
}

async function postJournal(id: string): Promise<{ journal_id: string; status: string }> {
  const response = await fetch(`/api/accounting/journals/${id}/post`, {
    method: 'POST',
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to post journal')
  }
  return response.json()
}

async function voidJournal(id: string, reason: string): Promise<{ journal_id: string; status: string }> {
  const response = await fetch(`/api/accounting/journals/${id}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to void journal')
  }
  return response.json()
}

interface UpdateJournalInput {
  date?: string
  description?: string
  transactions?: Array<{
    account_id: string
    description?: string
    debit: number
    credit: number
  }>
}

async function updateJournal(id: string, input: UpdateJournalInput): Promise<JournalEntryWithTransactions> {
  const response = await fetch(`/api/accounting/journals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to update journal')
  }
  return response.json()
}

// ============================================
// React Query Hooks
// ============================================

/**
 * 取得傳票列表
 */
export function useJournals(params: ListJournalsParams, enabled = true) {
  return useQuery({
    queryKey: journalKeys.list(params.companyId, params),
    queryFn: () => fetchJournals(params),
    enabled: enabled && !!params.companyId,
    staleTime: 30 * 1000, // 30 秒
  })
}

/**
 * 取得單一傳票
 */
export function useJournal(id: string, enabled = true) {
  return useQuery({
    queryKey: journalKeys.detail(id),
    queryFn: () => fetchJournal(id),
    enabled: enabled && !!id,
  })
}

/**
 * 建立傳票
 */
export function useCreateJournal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createJournal,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() })
      queryClient.setQueryData(journalKeys.detail(data.id), data)
    },
  })
}

/**
 * 刪除傳票
 */
export function useDeleteJournal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteJournal,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() })
      queryClient.removeQueries({ queryKey: journalKeys.detail(id) })
    },
  })
}

/**
 * 過帳傳票
 */
export function usePostJournal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: postJournal,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() })
      queryClient.invalidateQueries({ queryKey: journalKeys.detail(id) })
    },
  })
}

/**
 * 作廢傳票
 */
export function useVoidJournal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => voidJournal(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() })
      queryClient.invalidateQueries({ queryKey: journalKeys.detail(id) })
    },
  })
}

/**
 * 更新傳票（僅限草稿）
 */
export function useUpdateJournal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateJournalInput }) =>
      updateJournal(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() })
      queryClient.setQueryData(journalKeys.detail(data.id), data)
    },
  })
}
