import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import InvoiceList from './InvoiceList'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage({
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
        title={t('accounting.invoices.title')}
        action={{
          label: t('accounting.invoices.createNew'),
          href: `/${locale}/accounting/invoices/new`,
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <InvoiceList locale={locale} />
      </div>
    </div>
  )
}
