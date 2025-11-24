'use client'

// Force dynamic rendering to avoid build-time prerendering
export const dynamic = 'force-dynamic'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import CustomerForm from '../CustomerForm'
import { useCustomer } from '@/hooks/useCustomers'

export default function EditCustomerPage() {
  const t = useTranslations()
  const params = useParams()
  const locale = params.locale as string
  const id = params.id as string

  // 使用 hook 取得客戶資料
  const { data: customer, isLoading, error } = useCustomer(id)

  // 載入狀態
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('customer.edit')} />
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    )
  }

  // 錯誤或找不到客戶
  if (error || !customer) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('customer.edit')} />

      <div className="bg-white rounded-lg shadow p-6">
        <CustomerForm locale={locale} customer={customer} />
      </div>
    </div>
  )
}
