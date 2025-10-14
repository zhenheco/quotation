import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginButton from './LoginButton'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/en/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Quotation System
          </h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            報價單系統
          </h2>
          <p className="text-gray-600 mt-4">
            Sign in to manage your quotations
          </p>
          <p className="text-gray-600 mb-8">
            登入以管理您的報價單
          </p>
        </div>

        <LoginButton />

        <div className="text-center text-sm text-gray-500">
          <p>Powered by Supabase & Next.js</p>
        </div>
      </div>
    </div>
  )
}
