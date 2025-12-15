'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Supplier,
  CreateSupplierData,
  UpdateSupplierData
} from '@/types/models'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

// ============================================================================
// Types
// ============================================================================

export type { Supplier, CreateSupplierData, UpdateSupplierData }

export interface BilingualText {
  zh: string
  en: string
}

export interface CreateSupplierInput {
  company_id: string
  supplier_number?: string
  name: BilingualText
  code?: string
  contact_person?: { name: string; phone: string; email: string }
  phone?: string
  email?: string
  fax?: string
  address?: BilingualText
  website?: string
  tax_id?: string
  payment_terms?: string
  payment_days?: number
  bank_name?: string
  bank_account?: string
  bank_code?: string
  swift_code?: string
  is_active?: boolean
  notes?: string
}

export interface UpdateSupplierInput {
  name?: BilingualText
  code?: string
  contact_person?: { name: string; phone: string; email: string }
  phone?: string
  email?: string
  fax?: string
  address?: BilingualText
  website?: string
  tax_id?: string
  payment_terms?: string
  payment_days?: number
  bank_name?: string
  bank_account?: string
  bank_code?: string
  swift_code?: string
  is_active?: boolean
  notes?: string
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchSuppliers(companyId?: string): Promise<Supplier[]> {
  const params = new URLSearchParams()
  if (companyId) params.set('company_id', companyId)
  params.set('is_active', 'true')
  return apiGet<Supplier[]>(`/api/suppliers?${params.toString()}`)
}

async function fetchAllSuppliers(companyId?: string): Promise<Supplier[]> {
  const params = new URLSearchParams()
  if (companyId) params.set('company_id', companyId)
  return apiGet<Supplier[]>(`/api/suppliers?${params.toString()}`)
}

async function fetchSupplier(id: string): Promise<Supplier> {
  return apiGet<Supplier>(`/api/suppliers/${id}`)
}

async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  return apiPost<Supplier>('/api/suppliers', input)
}

async function updateSupplier(id: string, input: UpdateSupplierInput): Promise<Supplier> {
  return apiPut<Supplier>(`/api/suppliers/${id}`, input)
}

async function deleteSupplier(id: string): Promise<void> {
  await apiDelete(`/api/suppliers/${id}`)
}

async function generateSupplierNumber(companyId: string): Promise<string> {
  const result = await apiGet<{ supplier_number: string }>(`/api/suppliers/generate-number?company_id=${companyId}`)
  return result.supplier_number
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * 取得所有啟用中的供應商列表
 */
export function useSuppliers(companyId?: string) {
  return useQuery({
    queryKey: ['suppliers', companyId],
    queryFn: () => fetchSuppliers(companyId),
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })
}

/**
 * 取得所有供應商列表（包含停用的）
 */
export function useAllSuppliers(companyId?: string) {
  return useQuery({
    queryKey: ['suppliers', 'all', companyId],
    queryFn: () => fetchAllSuppliers(companyId),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 取得單一供應商資料
 */
export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => fetchSupplier(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * 建立新供應商
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSupplier,
    onSuccess: (newSupplier) => {
      // 使快取失效以重新取得列表
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })

      // 直接更新快取
      queryClient.setQueryData(['suppliers', newSupplier.id], newSupplier)
    },
  })
}

/**
 * 更新供應商資料
 */
export function useUpdateSupplier(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateSupplierInput) => updateSupplier(id, input),
    onSuccess: (updatedSupplier) => {
      // 更新列表快取
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })

      // 更新單一供應商快取
      queryClient.setQueryData(['suppliers', id], updatedSupplier)

      // 讓產品供應商成本快取失效
      queryClient.invalidateQueries({ queryKey: ['productSupplierCosts'] })
    },
  })
}

/**
 * 刪除供應商（含樂觀更新）
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSupplier,

    // 樂觀更新：立即從 UI 移除
    onMutate: async (id) => {
      // 取消進行中的查詢
      await queryClient.cancelQueries({ queryKey: ['suppliers'] })

      // 備份當前資料
      const previousSuppliers = queryClient.getQueryData<Supplier[]>(['suppliers'])

      // 樂觀更新：從列表中移除
      queryClient.setQueryData<Supplier[]>(['suppliers'], (old) =>
        old?.filter((s) => s.id !== id) ?? []
      )

      return { previousSuppliers }
    },

    // 如果失敗，還原資料
    onError: (_err, _id, context) => {
      if (context?.previousSuppliers) {
        queryClient.setQueryData(['suppliers'], context.previousSuppliers)
      }
    },

    // 完成後重新取得資料
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

/**
 * 生成供應商編號
 */
export function useGenerateSupplierNumber() {
  return useMutation({
    mutationFn: generateSupplierNumber,
  })
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * 搜尋供應商（前端過濾）
 */
export function useSearchSuppliers(searchTerm: string, companyId?: string) {
  const { data: suppliers, ...rest } = useSuppliers(companyId)

  const filteredSuppliers = suppliers?.filter((supplier) => {
    if (!searchTerm) return true

    const search = searchTerm.toLowerCase()
    const name = supplier.name as BilingualText
    const address = supplier.address as BilingualText | null

    return (
      name.zh.toLowerCase().includes(search) ||
      name.en.toLowerCase().includes(search) ||
      supplier.code?.toLowerCase().includes(search) ||
      supplier.email?.toLowerCase().includes(search) ||
      supplier.phone?.toLowerCase().includes(search) ||
      supplier.tax_id?.toLowerCase().includes(search) ||
      address?.zh.toLowerCase().includes(search) ||
      address?.en.toLowerCase().includes(search)
    )
  })

  return {
    data: filteredSuppliers,
    ...rest,
  }
}

/**
 * 取得供應商選項（用於下拉選單）
 */
export function useSupplierOptions(companyId?: string, locale: string = 'zh') {
  const { data: suppliers, ...rest } = useSuppliers(companyId)

  const options = suppliers?.map((supplier) => ({
    value: supplier.id,
    label: locale === 'zh' ? supplier.name.zh : supplier.name.en,
    code: supplier.code,
    supplier: supplier,
  })) ?? []

  return {
    options,
    ...rest,
  }
}
