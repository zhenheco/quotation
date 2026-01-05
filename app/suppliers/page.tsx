import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import SupplierList from './SupplierList'

export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
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
        title="供應商管理"
        action={{
          label: '新增供應商',
          href: '/suppliers/new',
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <SupplierList />
      </div>
    </div>
  )
}
