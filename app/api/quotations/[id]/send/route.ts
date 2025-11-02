import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getQuotationById } from '@/lib/services/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const quotation = await getQuotationById(id, user.id)

    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      )
    }

    if (!quotation.customer_email) {
      return NextResponse.json(
        { error: 'Customer email not found' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('quotations')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Failed to update quotation status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Quotation sent successfully',
      data
    })
  } catch (error) {
    console.error('Error sending quotation:', error)
    return NextResponse.json(
      { error: 'Failed to send quotation' },
      { status: 500 }
    )
  }
}
