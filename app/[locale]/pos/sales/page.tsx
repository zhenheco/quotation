import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import SalesList from './SalesList'

export const dynamic = 'force-dynamic'

export default async function SalesPage({
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pos.sales.title')}
        action={{
          label: t('pos.sales.newSale'),
          href: `/${locale}/pos/checkout`,
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <SalesList locale={locale} />
      </div>
    </div>
  )
}
