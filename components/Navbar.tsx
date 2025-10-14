'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Navbar({ locale }: { locale: string }) {
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en'
    const currentPath = window.location.pathname
    const newPath = currentPath.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPath)
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href={`/${locale}/dashboard`} className="text-xl font-bold text-gray-900">
            {locale === 'en' ? 'Quotation System' : '報價單系統'}
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleLocale}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              {locale === 'en' ? '中文' : 'English'}
            </button>

            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              {locale === 'en' ? 'Sign Out' : '登出'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
