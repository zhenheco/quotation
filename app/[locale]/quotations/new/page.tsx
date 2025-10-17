import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import QuotationForm from '../QuotationForm'
import { getCustomers, getProducts } from '@/lib/services/database'

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

  // 使用 Zeabur PostgreSQL 獲取客戶和產品列表
  const customers = await getCustomers(user.id)
  const products = await getProducts(user.id)

  return (
    <div className="space-y-6">
      <PageHeader title={t('quotation.createNew')} />

      <div className="bg-white rounded-lg shadow p-6">
        <QuotationForm
          locale={locale}
          customers={customers}
          products={products}
        />
      </div>
    </div>
  )
}
