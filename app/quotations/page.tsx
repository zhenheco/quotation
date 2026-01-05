import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import QuotationList from './QuotationList'

export const dynamic = 'force-dynamic'

export default async function QuotationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="報價單"
        action={{
          label: '新增報價單',
          href: '/quotations/new',
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <QuotationList />
      </div>
    </div>
  )
}
