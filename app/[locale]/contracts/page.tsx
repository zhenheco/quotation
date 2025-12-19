import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContractsClient from './ContractsClient'

export const dynamic = 'force-dynamic'

export default async function ContractsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ContractsClient locale={locale} />
}
