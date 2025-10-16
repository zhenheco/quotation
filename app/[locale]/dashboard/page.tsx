import { createClient } from '@/lib/supabase/server'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const t = await getTranslations()

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
      <h1 className="text-3xl font-bold text-gray-900">{t('nav.dashboard')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title={t('quotation.title')}
          count={quotations?.length || 0}
          icon="📄"
        />
        <DashboardCard
          title={t('customer.title')}
          count={customers?.length || 0}
          icon="👥"
        />
        <DashboardCard
          title={t('product.title')}
          count={products?.length || 0}
          icon="📦"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{t('common.welcome')}</h2>
        <p className="text-gray-600">
          {t('dashboard.welcomeMessage')}
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
