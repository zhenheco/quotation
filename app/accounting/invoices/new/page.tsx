import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import InvoiceFormTabs from '../components/InvoiceFormTabs'

export const dynamic = 'force-dynamic'

export default async function NewInvoicePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="新增發票" />

      <InvoiceFormTabs />
    </div>
  )
}
