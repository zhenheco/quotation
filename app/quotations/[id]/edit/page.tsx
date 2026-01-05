import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuotationForm from '@/app/quotations/QuotationForm'
import PageHeader from '@/components/ui/PageHeader'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function EditQuotationPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="編輯報價單" />

      <div className="bg-white rounded-lg shadow p-6">
        <QuotationForm quotationId={id} />
      </div>
    </div>
  )
}
