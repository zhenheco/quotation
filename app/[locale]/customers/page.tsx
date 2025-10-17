import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import CustomerList from './CustomerList'
import { getCustomers } from '@/lib/services/database'

export const dynamic = 'force-dynamic'

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const t = await getTranslations()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let customers = []
  let error = null

  try {
    customers = await getCustomers(user.id)
  } catch (e) {
    error = e
    console.error('Error fetching customers:', e)
  }

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
        <CustomerList
          customers={customers || []}
          locale={locale}
        />
      </div>
    </div>
  )
}
