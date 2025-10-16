import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect, notFound } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import QuotationDetail from './QuotationDetail'

export const dynamic = 'force-dynamic'

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const supabase = await createClient()
  const t = await getTranslations()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: quotation, error } = await supabase
    .from('quotations')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone,
        address
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !quotation) {
    notFound()
  }

  const { data: items } = await supabase
    .from('quotation_items')
    .select(`
      *,
      products (
        id,
        name,
        description
      )
    `)
    .eq('quotation_id', id)
    .order('line_order')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('quotation.detail')}
        action={{
          label: t('quotation.exportPDF'),
          href: `/${locale}/quotations/${id}/export`,
        }}
      />

      <QuotationDetail
        quotation={quotation}
        items={items || []}
        locale={locale}
      />
    </div>
  )
}
