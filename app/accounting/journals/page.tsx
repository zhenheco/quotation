import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import JournalList from './JournalList'

export const dynamic = 'force-dynamic'

export default async function JournalsPage() {
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
        title="日記帳"
        action={{
          label: '新增傳票',
          href: '/accounting/journals/new',
        }}
      />

      <div className="bg-white rounded-lg shadow">
        <JournalList />
      </div>
    </div>
  )
}
