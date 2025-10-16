/**
 * 匯率同步 API
 * POST /api/exchange-rates/sync - 手動同步匯率到資料庫
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncRatesToDatabase, Currency } from '@/lib/services/exchange-rate'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const baseCurrency = (body.baseCurrency || 'USD') as Currency

    const supabase = await createClient()
    const success = await syncRatesToDatabase(supabase, baseCurrency)

    if (success) {
      return NextResponse.json({
        success: true,
        message: '匯率同步成功',
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: '匯率同步失敗'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ 同步匯率失敗:', error)

    return NextResponse.json(
      {
        success: false,
        error: '同步匯率失敗'
      },
      { status: 500 }
    )
  }
}
