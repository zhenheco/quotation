import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

export const dynamic = 'force-dynamic'

export default async function PosLayout({
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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar locale={locale} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header locale={locale} />
        <main className="flex-1 overflow-y-auto bg-muted/10 p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav locale={locale} />
    </div>
  )
}
