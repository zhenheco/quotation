import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import InvoiceList from './InvoiceList'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage() {
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
        title="發票管理"
        action={{
          label: '新增發票',
          href: '/accounting/invoices/new',
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <InvoiceList />
      </div>
    </div>
  )
}
