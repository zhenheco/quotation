import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import QuotationList from './QuotationList'

export const dynamic = 'force-dynamic'

export default async function QuotationsPage({
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
        title={t('quotation.title')}
        action={{
          label: t('quotation.createNew'),
          href: `/${locale}/quotations/new`,
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <QuotationList locale={locale} />
      </div>
    </div>
  )
}
