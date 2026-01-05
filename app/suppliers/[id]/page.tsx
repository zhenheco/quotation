'use client'

// Force dynamic rendering to avoid build-time prerendering
export const dynamic = 'force-dynamic'

import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import SupplierForm from '../SupplierForm'
import { useSupplier } from '@/hooks/useSuppliers'

export default function EditSupplierPage() {
  const params = useParams()
  const id = params.id as string

  // 使用 hook 取得供應商資料
  const { data: supplier, isLoading, error } = useSupplier(id)

  // 載入狀態
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="編輯供應商" />
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    )
  }

  // 錯誤或找不到供應商
  if (error || !supplier) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="編輯供應商" />

      <div className="bg-white rounded-lg shadow p-6">
        <SupplierForm supplier={supplier} />
      </div>
    </div>
  )
}
