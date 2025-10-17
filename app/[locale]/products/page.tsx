import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ProductList from './ProductList'
import { getProducts } from '@/lib/services/database'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({
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

  // 使用 Zeabur PostgreSQL 查詢產品資料
  let products = []

  try {
    products = await getProducts(user.id)
  } catch (e) {
    console.error('Error fetching products:', e)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('product.title')}
        action={{
          label: t('product.createNew'),
          href: `/${locale}/products/new`,
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <ProductList
          products={products || []}
          locale={locale}
        />
      </div>
    </div>
  )
}
