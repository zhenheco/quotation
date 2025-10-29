import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/app/api/utils/error-handler'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('get_payment_statistics')

    if (error) {
      console.error('Failed to fetch payment statistics:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      statistics: data,
    })
  } catch (error: unknown) {
    console.error('Failed to fetch payment statistics:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
