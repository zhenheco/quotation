import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShipmentDetailClient from './ShipmentDetailClient'

export const dynamic = 'force-dynamic'

interface ShipmentDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ShipmentDetailPage({ params }: ShipmentDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ShipmentDetailClient shipmentId={id} />
}
