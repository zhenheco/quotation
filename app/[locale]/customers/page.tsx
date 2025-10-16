import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import CustomerList from './CustomerList'

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

  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching customers:', error)
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
