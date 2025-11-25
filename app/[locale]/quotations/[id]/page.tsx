import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuotationDetail from './QuotationDetail'

export const dynamic = 'force-dynamic'

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <QuotationDetail quotationId={id} locale={locale} />
    </div>
  )
}
