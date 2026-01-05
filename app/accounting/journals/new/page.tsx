import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import JournalForm from '../JournalForm'

export const dynamic = 'force-dynamic'

export default async function NewJournalPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="新增傳票" />

      <JournalForm />
    </div>
  )
}
