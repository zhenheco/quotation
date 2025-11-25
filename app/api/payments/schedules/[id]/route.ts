import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getD1Client } from '@/lib/db/d1-client'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { updatePaymentSchedule, deletePaymentSchedule } from '@/lib/dal/payments'

export const runtime = 'edge'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  const body = await request.json() as {
    due_date?: string
    amount?: number
    currency?: string
    description?: string
    notes?: string
    status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
  }

  const { env } = await getCloudflareContext()
  const db = getD1Client(env)

  try {
    const schedule = await updatePaymentSchedule(db, user.id, id, body)
    return NextResponse.json({ schedule })
  } catch (error) {
    if ((error as Error).message === 'Payment schedule not found') {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }
    throw error
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  const { env } = await getCloudflareContext()
  const db = getD1Client(env)

  try {
    await deletePaymentSchedule(db, user.id, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = (error as Error).message
    if (message === 'Payment schedule not found') {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }
    if (message === 'Cannot delete a paid schedule') {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    throw error
  }
}
