'use client'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import CustomerList from './CustomerList'

export default function CustomersPage() {
  const t = useTranslations()
  const params = useParams()
  const locale = params.locale as string

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customer.title')}
        action={{
          label: t('customer.createNew'),
          href: `/${locale}/customers/new`,
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <CustomerList locale={locale} />
      </div>
    </div>
  )
}
