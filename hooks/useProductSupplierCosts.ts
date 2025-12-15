'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/api-client'

export interface ProductSupplierCost {
  id: string
  product_id: string
  supplier_id: string | null
  supplier_name: string
  supplier_code: string | null
  cost_price: number
  cost_currency: string
  is_preferred: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // 關聯的供應商資料
  supplier?: {
    id: string
    name: { zh: string; en: string }
    code: string | null
  } | null
}

export interface CreateSupplierCostInput {
  supplier_id?: string
  supplier_name: string
  supplier_code?: string
  cost_price: number
  cost_currency: string
  is_preferred?: boolean
  notes?: string
}

export interface UpdateSupplierCostInput {
  id: string
  supplier_id?: string
  supplier_name?: string
  supplier_code?: string
  cost_price?: number
  cost_currency?: string
  is_preferred?: boolean
  notes?: string
}

export function useProductSupplierCosts(productId: string | undefined) {
  return useQuery({
    queryKey: ['productSupplierCosts', productId],
    queryFn: async () => {
      if (!productId) return []
      return apiGet<ProductSupplierCost[]>(`/api/products/${productId}/suppliers`)
    },
    enabled: !!productId,
  })
}

export function useCreateSupplierCost(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSupplierCostInput) => {
      return apiPost<ProductSupplierCost>(`/api/products/${productId}/suppliers`, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productSupplierCosts', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateSupplierCost(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateSupplierCostInput) => {
      return apiPut<ProductSupplierCost>(`/api/products/${productId}/suppliers`, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productSupplierCosts', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteSupplierCost(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (supplierCostId: string) => {
      return apiDelete<{ success: boolean }>(`/api/products/${productId}/suppliers?supplierCostId=${supplierCostId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productSupplierCosts', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useSetPreferredSupplier(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (supplierCostId: string) => {
      return apiPatch<{ success: boolean }>(`/api/products/${productId}/suppliers`, { supplierCostId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productSupplierCosts', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
