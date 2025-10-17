import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import QuotationForm from '../../QuotationForm'
import {
  getQuotationById,
  getQuotationItems,
  getCustomerById,
  getCustomers,
  getProducts,
} from '@/lib/services/database'

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

  try {
    // 使用 Zeabur PostgreSQL 獲取報價單
    const quotation = await getQuotationById(id, user.id)

    if (!quotation) {
      console.error('編輯頁面 - 找不到報價單:', id)
      redirect(`/${locale}/quotations`)
    }

    console.log('編輯頁面 - 成功載入報價單:', quotation.quotation_number)

    // 獲取客戶資訊
    const customer = await getCustomerById(quotation.customer_id, user.id)

    // 獲取報價單項目
    const items = await getQuotationItems(quotation.id, user.id)

    // 獲取客戶列表
    const customers = await getCustomers(user.id)

    // 獲取產品列表
    const products = await getProducts(user.id)

    // 組合報價單資料
    const quotationWithRelations = {
      ...quotation,
      customers: customer ? {
        id: customer.id,
        name: customer.name,
        email: customer.email
      } : null,
      items: items || []
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t('quotation.edit')} - {quotation.quotation_number}
        </h1>
        <QuotationForm
          locale={locale}
          quotation={quotationWithRelations}
          customers={customers || []}
          products={products || []}
        />
      </div>
    )
  } catch (error) {
    console.error('編輯頁面 - 發生錯誤:', error)
    redirect(`/${locale}/quotations`)
  }
}
