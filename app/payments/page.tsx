import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentsClient from './PaymentsClient'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <PaymentsClient />
}
