import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  params,
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 如果用戶未登入,重定向到登入頁面
  if (!user) {
    redirect('/login')
  }

  return <DashboardClient locale={params.locale} />
}