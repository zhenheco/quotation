'use client'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ProductList from './ProductList'

export default function ProductsPage() {
  const t = useTranslations()
  const params = useParams()
  const locale = params.locale as string

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('product.title')}
        action={{
          label: t('product.createNew'),
          href: `/${locale}/products/new`,
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <ProductList locale={locale} />
      </div>
    </div>
  )
}
