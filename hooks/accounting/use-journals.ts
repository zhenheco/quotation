/**
 * 會計傳票 React Query Hooks
 * Account-system → quotation-system 整合
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  JournalEntryWithTransactions,
  JournalStatus,
  TransactionSource,
} from '@/lib/dal/accounting'
import type { JournalListResult, CreateJournalRequest } from '@/lib/services/accounting/journal.service'

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

  return apiClient.get<JournalListResult>(`/api/accounting/journals?${searchParams}`)
}

async function fetchJournal(id: string): Promise<JournalEntryWithTransactions> {
  return apiClient.get<JournalEntryWithTransactions>(`/api/accounting/journals/${id}`)
}

async function createJournal(input: CreateJournalRequest): Promise<JournalEntryWithTransactions> {
  return apiClient.post<JournalEntryWithTransactions>('/api/accounting/journals', input)
}

async function deleteJournal(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/accounting/journals/${id}`)
}

async function postJournal(id: string): Promise<{ journal_id: string; status: string }> {
  return apiClient.post<{ journal_id: string; status: string }>(
    `/api/accounting/journals/${id}/post`
  )
}

async function voidJournal(id: string, reason: string): Promise<{ journal_id: string; status: string }> {
  return apiClient.post<{ journal_id: string; status: string }>(
    `/api/accounting/journals/${id}/void`,
    { reason }
  )
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
  return apiClient.put<JournalEntryWithTransactions>(`/api/accounting/journals/${id}`, input)
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
