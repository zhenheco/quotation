import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import QuotationList from './QuotationList'
import { getQuotations, getCustomerById } from '@/lib/services/database'

export const dynamic = 'force-dynamic'

export default async function QuotationsPage({
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

  // 使用 Zeabur PostgreSQL 獲取報價單列表
  const quotations = await getQuotations(user.id)

  // 為每個報價單獲取客戶資訊
  const quotationsWithCustomers = await Promise.all(
    quotations.map(async (quotation) => {
      const customer = await getCustomerById(quotation.customer_id, user.id)
      return {
        ...quotation,
        customers: customer
          ? {
              id: customer.id,
              name: customer.name,
              email: customer.email,
            }
          : null,
      }
    })
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('quotation.title')}
        action={{
          label: t('quotation.createNew'),
          href: `/${locale}/quotations/new`,
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <QuotationList
          quotations={quotationsWithCustomers}
          locale={locale}
        />
      </div>
    </div>
  )
}
