'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface Company {
  id: string
  name: string
  tax_id?: string
  address?: string
  phone?: string
  email?: string
  fiscal_year_start?: number
  vat_method?: string
  mixed_deduction_ratio?: number
  created_at: string
  updated_at: string
}

/**
 * 取得當前使用者的公司資訊
 */
export function useCompany() {
  const supabase = createClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['current-company'],
    queryFn: async () => {
      // 先取得使用者
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('未登入')
      }

      // 透過 company_members 取得使用者的公司
      const { data: membership, error: memberError } = await supabase
        .from('company_members')
        .select(`
          company_id,
          is_owner,
          companies:company_id (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_owner', { ascending: false }) // 優先取得 owner 的公司
        .limit(1)
        .single()

      if (memberError) {
        // 可能是新用戶，還沒有加入任何公司
        console.log('[useCompany] No company membership found:', memberError.message)
        return null
      }

      // companies 是嵌套查詢的結果（單一物件，因為是 foreign key）
      const company = membership.companies as unknown as Company | null
      if (!company) {
        return null
      }

      return company
    },
    staleTime: 5 * 60 * 1000, // 5 分鐘
    retry: 1,
  })

  return {
    company: data,
    isLoading,
    error,
    refetch,
  }
}
