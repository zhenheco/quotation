import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import QuotationEditForm from './QuotationEditForm'

interface PageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export default async function EditQuotationPage({ params }: PageProps) {
  const { locale, id } = await params
  const supabase = await createClient()
  const t = await getTranslations()

  // 驗證用戶
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  // 獲取報價單數據
  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select(`
      *,
      customers (
        id,
        name,
        email
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (quotationError || !quotation) {
    redirect(`/${locale}/quotations`)
  }

  // 獲取報價單項目
  const { data: items } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', id)
    .order('sort_order')

  // 獲取客戶列表
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, email')
    .eq('user_id', user.id)

  // 獲取產品列表
  const { data: products } = await supabase
    .from('products')
    .select('id, name, unit_price, currency')
    .eq('user_id', user.id)

  // 獲取版本歷史
  const { data: versions } = await supabase
    .from('quotation_versions')
    .select('*')
    .eq('quotation_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t('quotation.edit')} - {quotation.quotation_number}
      </h1>
      <QuotationEditForm
        locale={locale}
        quotation={{ ...quotation, items: items || [] }}
        customers={customers || []}
        products={products || []}
        versions={versions || []}
      />
    </div>
  )
}
