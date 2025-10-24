import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import QuotationForm from '../../QuotationForm'
import PageHeader from '@/components/ui/PageHeader'

interface PageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function EditQuotationPage({ params }: PageProps) {
  const { locale, id } = await params
  const supabase = await createClient()
  const t = await getTranslations()

  // 驗證用戶
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('quotation.edit')} />

      <div className="bg-white rounded-lg shadow p-6">
        <QuotationForm locale={locale} quotationId={id} />
      </div>
    </div>
  )
}
