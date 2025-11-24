'use client'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ProductForm from '../ProductForm'

export default function NewProductPage() {
  const t = useTranslations()
  const params = useParams()
  const locale = params.locale as string

  return (
    <div className="space-y-6">
      <PageHeader title={t('product.createNew')} />

      <div className="bg-white rounded-lg shadow p-6">
        <ProductForm locale={locale} />
      </div>
    </div>
  )
}
