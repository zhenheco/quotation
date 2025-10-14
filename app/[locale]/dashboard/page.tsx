import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch summary data
  const { data: quotations } = await supabase
    .from('quotations')
    .select('*', { count: 'exact' })
    .eq('user_id', user?.id || '')

  const { data: customers } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('user_id', user?.id || '')

  const { data: products } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('user_id', user?.id || '')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard / 儀表板</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Quotations / 報價單"
          count={quotations?.length || 0}
          icon="📄"
        />
        <DashboardCard
          title="Customers / 客戶"
          count={customers?.length || 0}
          icon="👥"
        />
        <DashboardCard
          title="Products / 產品"
          count={products?.length || 0}
          icon="📦"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Welcome / 歡迎</h2>
        <p className="text-gray-600">
          Welcome to your Quotation Management System. Get started by creating
          your first quotation, customer, or product.
        </p>
        <p className="text-gray-600 mt-2">
          歡迎使用報價單管理系統。開始建立您的第一個報價單、客戶或產品。
        </p>
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  count,
  icon,
}: {
  title: string
  count: number
  icon: string
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{count}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )
}
