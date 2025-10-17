import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import QuotationDetail from './QuotationDetail'
import {
  getQuotationById,
  getCustomerById,
  getQuotationItems,
  getProductById,
} from '@/lib/services/database'

export const dynamic = 'force-dynamic'

export default async function QuotationDetailPage({
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

  // 使用 Zeabur PostgreSQL 獲取報價單
  const quotation = await getQuotationById(id, user.id)

  if (!quotation) {
    notFound()
  }

  // 獲取客戶資訊
  const customer = await getCustomerById(quotation.customer_id, user.id)

  // 獲取報價單項目
  const items = await getQuotationItems(quotation.id, user.id)

  // 為每個項目獲取產品詳情
  const itemsWithProducts = await Promise.all(
    items.map(async (item) => {
      const product = item.product_id
        ? await getProductById(item.product_id, user.id)
        : null
      return {
        ...item,
        products: product
          ? {
              id: product.id,
              name: product.name,
              description: product.description,
            }
          : null,
      }
    })
  )

  // 組合報價單和客戶資訊
  const quotationWithCustomer = {
    ...quotation,
    customers: customer
      ? {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        }
      : null,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('quotation.detail')}</h1>
      </div>

      <QuotationDetail
        quotation={quotationWithCustomer}
        items={itemsWithProducts}
        locale={locale}
      />
    </div>
  )
}
