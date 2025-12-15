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

      // 取得使用者的公司
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        // 可能是新用戶，還沒有設定公司
        return null
      }

      if (!userProfile?.company_id) {
        return null
      }

      // 取得公司資訊
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userProfile.company_id)
        .single()

      if (companyError) {
        throw companyError
      }

      return company as Company
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
