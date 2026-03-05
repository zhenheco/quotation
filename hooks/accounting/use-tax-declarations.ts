/**
 * 營業稅申報期別 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { buildCsrfHeaders } from '@/lib/security/csrf'
import type { TaxDeclaration } from '@/types/models'

// ============================================
// Query Keys
// ============================================

export const taxDeclarationKeys = {
  all: ['tax-declarations'] as const,
  list: (companyId: string, year?: number) =>
    [...taxDeclarationKeys.all, 'list', companyId, year] as const,
  detail: (id: string) =>
    [...taxDeclarationKeys.all, 'detail', id] as const,
}

// ============================================
// API 呼叫函數
// ============================================

async function fetchDeclarations(
  companyId: string,
  year?: number,
): Promise<TaxDeclaration[]> {
  const params = new URLSearchParams({ company_id: companyId })
  if (year) params.set('year', year.toString())

  const response = await fetch(`/api/accounting/tax-declarations?${params}`)
  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error || '取得申報期別失敗')
  }
  const result = (await response.json()) as { success: boolean; data: TaxDeclaration[] }
  return result.data
}

async function fetchDeclaration(id: string): Promise<TaxDeclaration> {
  const response = await fetch(`/api/accounting/tax-declarations/${id}`)
  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error || '取得申報期別失敗')
  }
  const result = (await response.json()) as { success: boolean; data: TaxDeclaration }
  return result.data
}

async function createOrGetDeclaration(input: {
  company_id: string
  year: number
  bi_month: number
  opening_offset?: number
}): Promise<TaxDeclaration> {
  const response = await fetch('/api/accounting/tax-declarations', {
    method: 'POST',
    headers: buildCsrfHeaders(),
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error || '建立申報期別失敗')
  }
  const result = (await response.json()) as { success: boolean; data: TaxDeclaration }
  return result.data
}

async function updateDeclaration(
  id: string,
  input: Record<string, unknown>,
): Promise<TaxDeclaration> {
  const response = await fetch(`/api/accounting/tax-declarations/${id}`, {
    method: 'PUT',
    headers: buildCsrfHeaders(),
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error || '更新申報期別失敗')
  }
  const result = (await response.json()) as { success: boolean; data: TaxDeclaration }
  return result.data
}

async function submitDeclaration(id: string): Promise<TaxDeclaration> {
  const response = await fetch(`/api/accounting/tax-declarations/${id}/submit`, {
    method: 'POST',
    headers: buildCsrfHeaders(),
  })
  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error || '送出申報失敗')
  }
  const result = (await response.json()) as { success: boolean; data: TaxDeclaration }
  return result.data
}

async function reopenDeclaration(id: string): Promise<TaxDeclaration> {
  const response = await fetch(`/api/accounting/tax-declarations/${id}/reopen`, {
    method: 'POST',
    headers: buildCsrfHeaders(),
  })
  if (!response.ok) {
    const data = (await response.json()) as { error?: string }
    throw new Error(data.error || '重新開啟失敗')
  }
  const result = (await response.json()) as { success: boolean; data: TaxDeclaration }
  return result.data
}

// ============================================
// React Query Hooks
// ============================================

export function useTaxDeclarations(companyId: string | undefined, year?: number) {
  return useQuery({
    queryKey: companyId ? taxDeclarationKeys.list(companyId, year) : ['disabled'],
    queryFn: () => fetchDeclarations(companyId!, year),
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useTaxDeclaration(id: string | undefined) {
  return useQuery({
    queryKey: id ? taxDeclarationKeys.detail(id) : ['disabled'],
    queryFn: () => fetchDeclaration(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateOrGetDeclaration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOrGetDeclaration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxDeclarationKeys.all })
    },
  })
}

export function useUpdateDeclaration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      updateDeclaration(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxDeclarationKeys.all })
    },
  })
}

export function useSubmitDeclaration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitDeclaration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxDeclarationKeys.all })
    },
  })
}

export function useReopenDeclaration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reopenDeclaration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxDeclarationKeys.all })
    },
  })
}
