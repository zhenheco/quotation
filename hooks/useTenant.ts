'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  max_branches: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Branch {
  id: string
  tenant_id: string
  code: string
  name: string
  address?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * 取得當前使用者的租戶與分店資訊
 */
export function useTenant() {
  const supabase = createClient()
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)

  // 取得租戶資訊
  const { data: tenantData, isLoading: loadingTenant, error: tenantError, refetch: refetchTenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: async () => {
      // 先取得使用者
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('未登入')
      }

      // 取得使用者的租戶
      const { data: userTenant, error: utError } = await supabase
        .from('user_tenants')
        .select(`
          tenant_id,
          role,
          tenants (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (utError) {
        // 可能是還沒有租戶
        return null
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (userTenant?.tenants as any) as Tenant | null
    },
    staleTime: 5 * 60 * 1000, // 5 分鐘
    retry: 1,
  })

  // 取得分店列表
  const { data: branches, isLoading: loadingBranches, error: branchesError } = useQuery({
    queryKey: ['tenant-branches', tenantData?.id],
    queryFn: async () => {
      if (!tenantData?.id) return []

      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', tenantData.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data as Branch[]
    },
    enabled: !!tenantData?.id,
    staleTime: 5 * 60 * 1000,
  })

  // 設定預設分店
  const activeBranch = branches?.find(b => b.id === activeBranchId) || branches?.[0] || null

  const setActiveBranch = (branchId: string) => {
    setActiveBranchId(branchId)
  }

  return {
    tenant: tenantData,
    branches: branches || [],
    activeBranch,
    setActiveBranch,
    isLoading: loadingTenant || loadingBranches,
    error: tenantError || branchesError,
    refetch: refetchTenant,
  }
}
