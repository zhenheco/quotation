import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'
import { getQuotationById, updateQuotation } from '@/lib/services/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('[POST /api/quotations/[id]/send] Starting send request for ID:', id)

    let supabase
    try {
      supabase = createApiClient(request)
      console.log('[POST /api/quotations/[id]/send] Supabase client created')
    } catch (clientError) {
      console.error('[POST /api/quotations/[id]/send] Failed to create Supabase client:', clientError)
      return NextResponse.json(
        {
          error: 'Authentication service unavailable',
          details: clientError instanceof Error ? clientError.message : String(clientError)
        },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let user
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      user = authUser
      console.log('[POST /api/quotations/[id]/send] User authenticated:', user?.id)
    } catch (authError) {
      console.error('[POST /api/quotations/[id]/send] Auth error:', authError)
      return NextResponse.json(
        {
          error: 'Authentication failed',
          details: authError instanceof Error ? authError.message : String(authError)
        },
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!user) {
      console.log('[POST /api/quotations/[id]/send] No user found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let quotation
    try {
      quotation = await getQuotationById(id, user.id)
      console.log('[POST /api/quotations/[id]/send] Quotation found:', !!quotation)
    } catch (dbError) {
      console.error('[POST /api/quotations/[id]/send] Database error getting quotation:', dbError)
      return NextResponse.json(
        {
          error: 'Database query failed',
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!quotation.customer_email) {
      console.log('[POST /api/quotations/[id]/send] Customer email not found')
      return NextResponse.json(
        { error: 'Customer email not found' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let updatedQuotation
    try {
      updatedQuotation = await updateQuotation(id, user.id, {
        status: 'sent'
      })
      console.log('[POST /api/quotations/[id]/send] Quotation updated:', !!updatedQuotation)
    } catch (updateError) {
      console.error('[POST /api/quotations/[id]/send] Database error updating quotation:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update quotation',
          details: updateError instanceof Error ? updateError.message : String(updateError)
        },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!updatedQuotation) {
      return NextResponse.json(
        { error: 'Failed to update quotation status' },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Quotation sent successfully',
        data: updatedQuotation
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('[POST /api/quotations/[id]/send] Unexpected error:', error)
    console.error('[POST /api/quotations/[id]/send] Error stack:', error instanceof Error ? error.stack : 'No stack')

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
