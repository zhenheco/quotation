import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import CustomerForm from '../CustomerForm'

export const dynamic = 'force-dynamic'

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const supabase = await createClient()
  const t = await getTranslations()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

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
