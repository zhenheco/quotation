import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'

export const dynamic = 'force-dynamic'

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
      <Navbar locale={locale} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar locale={locale} />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
