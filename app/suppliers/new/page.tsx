import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import SupplierForm from '../SupplierForm'

export const dynamic = 'force-dynamic'

export default async function NewSupplierPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="新增供應商" />

      <div className="bg-white rounded-lg shadow p-6">
        <SupplierForm />
      </div>
    </div>
  )
}
