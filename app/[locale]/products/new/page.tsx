import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import ProductForm from '../ProductForm'

export const dynamic = 'force-dynamic'

export default async function NewProductPage({
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
      <PageHeader title={t('product.createNew')} />

      <div className="bg-white rounded-lg shadow p-6">
        <ProductForm locale={locale} />
      </div>
    </div>
  )
}
