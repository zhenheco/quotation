import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import InvoiceDetailClient from './InvoiceDetailClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { locale, id } = await params
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
        title={t('accounting.invoices.detail')}
      />

      <InvoiceDetailClient invoiceId={id} locale={locale} />
    </div>
  )
}
