import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { locale } = await params

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
