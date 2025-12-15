/**
 * POS 會員 React Query Hooks
 * Account-system → quotation-system 整合
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  PosMember,
  MemberWithLevel,
  MemberLevel,
  MemberDeposit,
  CreateMemberInput,
  UpdateMemberInput,
  PaymentMethodType,
} from '@/lib/dal/pos'

// ============================================
// 類型定義
// ============================================

interface ApiError {
  error?: string
}

// ============================================
// Query Keys
// ============================================

export const memberKeys = {
  all: ['pos-members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (tenantId: string, filters?: object) =>
    [...memberKeys.lists(), tenantId, filters] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
  balance: (id: string) => [...memberKeys.all, 'balance', id] as const,
  deposits: (id: string) => [...memberKeys.all, 'deposits', id] as const,
  levels: (tenantId: string) => [...memberKeys.all, 'levels', tenantId] as const,
}

// ============================================
// API 呼叫函數
// ============================================

interface ListMembersParams {
  tenantId: string
  search?: string
  levelId?: string
  isActive?: boolean
  limit?: number
  offset?: number
}

async function fetchMembers(params: ListMembersParams): Promise<MemberWithLevel[]> {
  const searchParams = new URLSearchParams({
    tenant_id: params.tenantId,
    ...(params.search && { search: params.search }),
    ...(params.levelId && { level_id: params.levelId }),
    ...(params.isActive !== undefined && { is_active: String(params.isActive) }),
    limit: String(params.limit || 50),
    offset: String(params.offset || 0),
  })

  const response = await fetch(`/api/pos/members?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch members')
  }
  return response.json()
}

async function fetchMember(id: string): Promise<MemberWithLevel> {
  const response = await fetch(`/api/pos/members/${id}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch member')
  }
  return response.json()
}

async function fetchMemberByPhone(tenantId: string, phone: string): Promise<PosMember | null> {
  const searchParams = new URLSearchParams({
    tenant_id: tenantId,
    phone,
  })

  const response = await fetch(`/api/pos/members?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch member by phone')
  }
  return response.json()
}

interface MemberBalance {
  member_id: string
  member_no: string
  name: string
  balance: number
  points: number
  total_spent: number
  level: MemberLevel | null
}

async function fetchMemberBalance(id: string): Promise<MemberBalance> {
  const response = await fetch(`/api/pos/members/${id}/balance`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch member balance')
  }
  return response.json()
}

async function fetchMemberDeposits(id: string, limit = 20): Promise<MemberDeposit[]> {
  const response = await fetch(`/api/pos/members/${id}?deposits=true&limit=${limit}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch member deposits')
  }
  return response.json()
}

async function fetchMemberLevels(tenantId: string): Promise<MemberLevel[]> {
  const searchParams = new URLSearchParams({
    tenant_id: tenantId,
    levels: 'true',
  })

  const response = await fetch(`/api/pos/members?${searchParams}`)
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to fetch member levels')
  }
  return response.json()
}

async function createMember(input: CreateMemberInput): Promise<PosMember> {
  const response = await fetch('/api/pos/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to create member')
  }
  return response.json()
}

async function updateMember(id: string, input: UpdateMemberInput): Promise<PosMember> {
  const response = await fetch(`/api/pos/members/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to update member')
  }
  return response.json()
}

async function deleteMember(id: string): Promise<void> {
  const response = await fetch(`/api/pos/members/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to delete member')
  }
}

interface DepositInput {
  id: string
  amount: number
  bonusAmount?: number
  paymentMethod: PaymentMethodType
  promotionId?: string
  reference?: string
}

interface DepositResult {
  deposit_id: string
  member_id: string
  amount: number
  bonus_amount: number
  new_balance: number
}

async function depositToMember(input: DepositInput): Promise<DepositResult> {
  const response = await fetch(`/api/pos/members/${input.id}/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: input.amount,
      bonus_amount: input.bonusAmount,
      payment_method: input.paymentMethod,
      promotion_id: input.promotionId,
      reference: input.reference,
    }),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to deposit to member')
  }
  return response.json()
}

async function deductMemberBalance(id: string, amount: number): Promise<{ member_id: string; new_balance: number }> {
  const response = await fetch(`/api/pos/members/${id}/balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deduct', amount }),
  })
  if (!response.ok) {
    const data = await response.json() as ApiError
    throw new Error(data.error || 'Failed to deduct member balance')
  }
  return response.json()
}

// ============================================
// React Query Hooks
// ============================================

/**
 * 取得會員列表
 */
export function useMembers(params: ListMembersParams, enabled = true) {
  return useQuery({
    queryKey: memberKeys.list(params.tenantId, params),
    queryFn: () => fetchMembers(params),
    enabled: enabled && !!params.tenantId,
    staleTime: 30 * 1000, // 30 秒
  })
}

/**
 * 取得單一會員
 */
export function useMember(id: string, enabled = true) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => fetchMember(id),
    enabled: enabled && !!id,
  })
}

/**
 * 根據電話搜尋會員
 */
export function useMemberByPhone(tenantId: string, phone: string, enabled = true) {
  return useQuery({
    queryKey: [...memberKeys.lists(), 'phone', tenantId, phone],
    queryFn: () => fetchMemberByPhone(tenantId, phone),
    enabled: enabled && !!tenantId && !!phone && phone.length >= 4,
    staleTime: 10 * 1000, // 10 秒
  })
}

/**
 * 取得會員餘額
 */
export function useMemberBalance(id: string, enabled = true) {
  return useQuery({
    queryKey: memberKeys.balance(id),
    queryFn: () => fetchMemberBalance(id),
    enabled: enabled && !!id,
    staleTime: 10 * 1000, // 10 秒
  })
}

/**
 * 取得會員儲值記錄
 */
export function useMemberDeposits(id: string, limit = 20, enabled = true) {
  return useQuery({
    queryKey: memberKeys.deposits(id),
    queryFn: () => fetchMemberDeposits(id, limit),
    enabled: enabled && !!id,
  })
}

/**
 * 取得會員等級列表
 */
export function useMemberLevels(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: memberKeys.levels(tenantId),
    queryFn: () => fetchMemberLevels(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })
}

/**
 * 建立會員
 */
export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMember,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
      queryClient.setQueryData(memberKeys.detail(data.id), data)
    },
  })
}

/**
 * 更新會員
 */
export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMemberInput }) =>
      updateMember(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
      queryClient.setQueryData(memberKeys.detail(data.id), data)
      queryClient.invalidateQueries({ queryKey: memberKeys.balance(data.id) })
    },
  })
}

/**
 * 刪除會員
 */
export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMember,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
      queryClient.removeQueries({ queryKey: memberKeys.detail(id) })
    },
  })
}

/**
 * 會員儲值
 */
export function useDepositToMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: depositToMember,
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(input.id) })
      queryClient.invalidateQueries({ queryKey: memberKeys.balance(input.id) })
      queryClient.invalidateQueries({ queryKey: memberKeys.deposits(input.id) })
    },
  })
}

/**
 * 扣除會員餘額
 */
export function useDeductMemberBalance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      deductMemberBalance(id, amount),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: memberKeys.balance(id) })
    },
  })
}
