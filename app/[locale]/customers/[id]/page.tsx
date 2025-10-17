import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import CustomerForm from '../CustomerForm'
import { getCustomerById } from '@/lib/services/database'

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

  let customer = null
  let error = null

  try {
    customer = await getCustomerById(id, user.id)
  } catch (e) {
    error = e
    console.error('Error fetching customer:', e)
  }

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
