// GET /api/accounting/guangmao/cron
// Vercel Cron：重試失敗的發票請求
// vercel.json 設定：crons path="/api/accounting/guangmao/cron" schedule="every 15 min"

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db/supabase-client'
import { GuangmaoClient } from '@/lib/services/guangmao/client'
import { processGuangmaoIssueResponse } from '@/lib/services/guangmao/invoice'

const MAX_BATCH_SIZE = 20

export async function GET(req: NextRequest) {
  // Vercel Cron 認證（CRON_SECRET 必須存在）
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseClient()

  // 找出需要重試的請求（PENDING 或 FAILED 且未達上限）
  const { data: requests, error: fetchError } = await db
    .from('acc_invoice_requests')
    .select('*')
    .or('status.eq.PENDING,status.eq.FAILED')
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(MAX_BATCH_SIZE)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!requests?.length) {
    return NextResponse.json({ processed: 0, message: 'No pending requests' })
  }

  // 按 company_id 分組，減少重複取 settings
  const settingsCache = new Map<string, { tax_id: string; app_key: string } | null>()
  const results: { id: string; status: string; error?: string }[] = []

  for (const request of requests) {
    // 取得公司設定（帶快取）
    if (!settingsCache.has(request.company_id)) {
      const { data: settings } = await db
        .from('company_settings')
        .select('guangmao_enabled, guangmao_vault_secret_id, guangmao_tax_id')
        .eq('company_id', request.company_id)
        .single()

      if (!settings?.guangmao_enabled || !settings.guangmao_vault_secret_id) {
        settingsCache.set(request.company_id, null)
      } else {
        const { data: appKey } = await db.rpc('get_guangmao_secret', {
          p_secret_id: settings.guangmao_vault_secret_id,
        })
        settingsCache.set(
          request.company_id,
          appKey ? { tax_id: settings.guangmao_tax_id, app_key: appKey as string } : null,
        )
      }
    }

    const config = settingsCache.get(request.company_id)
    if (!config) {
      results.push({ id: request.id, status: 'SKIPPED', error: 'No valid config' })
      continue
    }

    // 遞增重試次數
    await db
      .from('acc_invoice_requests')
      .update({ retry_count: request.retry_count + 1, updated_at: new Date().toISOString() })
      .eq('id', request.id)

    const client = new GuangmaoClient({ invoice: config.tax_id, appKey: config.app_key })

    try {
      switch (request.request_type) {
        case 'ISSUE': {
          const response = await client.issueInvoice(request.request_data)
          await processGuangmaoIssueResponse(db, request.id, response, request.order_id, request.company_id)
          results.push({ id: request.id, status: 'SUCCESS' })
          break
        }
        case 'VOID': {
          const response = await client.voidInvoice(request.request_data)
          if (response.code === 0) {
            await db
              .from('acc_invoice_requests')
              .update({ status: 'SUCCESS', response_data: response, updated_at: new Date().toISOString() })
              .eq('id', request.id)
            results.push({ id: request.id, status: 'SUCCESS' })
          } else {
            throw new Error(response.msg)
          }
          break
        }
        default:
          results.push({ id: request.id, status: 'SKIPPED', error: `Unknown type: ${request.request_type}` })
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      results.push({ id: request.id, status: 'FAILED', error: msg })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
