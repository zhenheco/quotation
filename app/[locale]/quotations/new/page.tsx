import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import QuotationForm from '../QuotationForm'

export const dynamic = 'force-dynamic'

export default async function NewQuotationPage({
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

  // Fetch customers and products for the form
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .order('name->en')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('name->en')

  return (
    <div className="space-y-6">
      <PageHeader title={t('quotation.createNew')} />

      <div className="bg-white rounded-lg shadow p-6">
        <QuotationForm
          locale={locale}
          customers={customers || []}
          products={products || []}
        />
      </div>
    </div>
  )
}
