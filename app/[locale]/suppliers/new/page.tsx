import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import SupplierForm from '../SupplierForm'

export const dynamic = 'force-dynamic'

export default async function NewSupplierPage({
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
      <PageHeader title={t('supplier.createNew')} />

      <div className="bg-white rounded-lg shadow p-6">
        <SupplierForm locale={locale} />
      </div>
    </div>
  )
}
