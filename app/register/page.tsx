import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RegisterForm from './RegisterForm'
import AuthSidebar from '@/components/auth/AuthSidebar'

export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      {/* 左側：註冊表單 */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 py-12">
        <RegisterForm />
      </div>

      {/* 右側：廣告區域（桌面版） */}
      <AuthSidebar />
    </div>
  )
}
