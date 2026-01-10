import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewOrderClient from './NewOrderClient'

export const dynamic = 'force-dynamic'

export default async function NewOrderPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <NewOrderClient />
}
