import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'

export const dynamic = 'force-dynamic'

export default async function CustomersLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Enable static rendering
  setRequestLocale(locale)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar locale={locale} />
      <div className="flex">
        <Sidebar locale={locale} />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
