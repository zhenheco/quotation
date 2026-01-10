import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShipmentsClient from './ShipmentsClient'

export const dynamic = 'force-dynamic'

export default async function ShipmentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ShipmentsClient />
}
