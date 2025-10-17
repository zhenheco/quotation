import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ProductForm from '../ProductForm'
import { getProductById } from '@/lib/services/database'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({
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

  // 使用 Zeabur PostgreSQL 查詢產品資料
  let product = null

  try {
    product = await getProductById(id, user.id)
  } catch (e) {
    console.error('Error fetching product:', e)
  }

  if (!product) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('product.edit')} />

      <div className="bg-white rounded-lg shadow p-6">
        <ProductForm locale={locale} product={product} />
      </div>
    </div>
  )
}
