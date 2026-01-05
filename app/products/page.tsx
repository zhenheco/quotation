import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ProductList from './ProductList'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="產品管理"
        action={{
          label: '新增產品',
          href: '/products/new',
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <ProductList />
      </div>
    </div>
  )
}
