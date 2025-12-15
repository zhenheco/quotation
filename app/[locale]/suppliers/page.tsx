'use client'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import SupplierList from './SupplierList'

export default function SuppliersPage() {
  const t = useTranslations()
  const params = useParams()
  const locale = params.locale as string

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('supplier.title')}
        action={{
          label: t('supplier.createNew'),
          href: `/${locale}/suppliers/new`,
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <SupplierList locale={locale} />
      </div>
    </div>
  )
}
