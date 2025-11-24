'use client'

// Force dynamic rendering to avoid build-time prerendering
export const dynamic = 'force-dynamic'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ProductForm from '../ProductForm'
import { useProduct } from '@/hooks/useProducts'

export default function EditProductPage() {
  const t = useTranslations()
  const params = useParams()
  const locale = params.locale as string
  const id = params.id as string

  // 使用 hook 取得產品資料
  const { data: product, isLoading, error } = useProduct(id)

  // 載入狀態
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // 錯誤或找不到
  if (error || !product) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('product.edit')} />

      <div className="bg-white rounded-lg shadow p-6">
        <ProductForm locale={locale} product={product} />
      </div>
    </div>
  )
}
