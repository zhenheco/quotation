import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import QuotationEditForm from './QuotationEditForm'
import PageHeader from '@/components/ui/PageHeader'
import { getQuotationById, getCustomers, getProducts } from '@/lib/services/database'

interface PageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function EditQuotationPage({ params }: PageProps) {
  const { locale, id } = await params
  const supabase = await createClient()
  const t = await getTranslations()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  const [quotation, customers, products] = await Promise.all([
    getQuotationById(id, user.id),
    getCustomers(user.id),
    getProducts(user.id)
  ])

  if (!quotation) {
    redirect(`/${locale}/quotations`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('quotation.edit')} />

      <div className="bg-white rounded-lg shadow p-6">
        <QuotationEditForm
          locale={locale}
          quotation={quotation}
          customers={customers}
          products={products}
          versions={[]}
        />
      </div>
    </div>
  )
}
