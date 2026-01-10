import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrderDetailClient from './OrderDetailClient'

export const dynamic = 'force-dynamic'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <OrderDetailClient orderId={id} />
}
