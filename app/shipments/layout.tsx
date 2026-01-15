import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import GuideWrapper from '@/components/guide/GuideWrapper'

export const dynamic = 'force-dynamic'

export default async function ShipmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/10 p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Nav */}
      <MobileNav />

      {/* Guide FAB + Modal */}
      <GuideWrapper />
    </div>
  )
}
