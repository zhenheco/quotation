import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import TaxReportDashboard from '../reports/TaxReportDashboard'

export const dynamic = 'force-dynamic'

export default async function TaxFilingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="營業稅申報" />
      <TaxReportDashboard />
    </div>
  )
}
