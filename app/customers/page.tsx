import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import CustomerList from './CustomerList'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
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
        title="客戶管理"
        action={{
          label: '新增客戶',
          href: '/customers/new',
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <CustomerList />
      </div>
    </div>
  )
}
