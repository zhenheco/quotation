import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import QuotationEditForm from './QuotationEditForm'
import PageHeader from '@/components/ui/PageHeader'
import { getQuotationById } from '@/lib/dal/quotations'
import { getCustomers } from '@/lib/dal/customers'
import { getProducts } from '@/lib/dal/products'
import { getD1Client } from '@/lib/db/d1-client'
import { getCloudflareContext } from '@opennextjs/cloudflare'

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

  const { env } = await getCloudflareContext()
  const db = getD1Client(env)

  const [quotation, customers, products] = await Promise.all([
    getQuotationById(db, user.id, id),
    getCustomers(db, user.id),
    getProducts(db, user.id)
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
