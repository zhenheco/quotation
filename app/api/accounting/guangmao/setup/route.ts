/**
 * POST /api/accounting/guangmao/setup
 * 設定光貿 API 連線資訊（存入 Supabase Vault）
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { GuangmaoClient } from '@/lib/services/guangmao/client'
import { verifyCompanyMembership } from '@/lib/dal/companies'

interface SetupBody {
  company_id: string
  tax_id: string   // 統一編號
  app_key: string  // 光貿 APP KEY
}

export const POST = withAuth('guangmao:setup')(async (request, { user, db }) => {
  const body = (await request.json()) as SetupBody

  if (!body.company_id || !body.tax_id || !body.app_key) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  // 多租戶隔離：驗證使用者屬於該公司
  const isMember = await verifyCompanyMembership(db, user.id, body.company_id)
  if (!isMember) {
    return NextResponse.json({ error: '無權存取此公司資料' }, { status: 403 })
  }

  // 驗證統一編號格式
  if (!/^\d{8}$/.test(body.tax_id)) {
    return NextResponse.json({ error: '統一編號格式錯誤（需為 8 位數字）' }, { status: 400 })
  }

  // 1. 測試 API 連線（用 invoice_list 查詢驗證 key 是否有效）
  try {
    const testClient = new GuangmaoClient({
      invoice: body.tax_id,
      appKey: body.app_key,
    })
    const today = new Date().toISOString().split('T')[0]
    const testResult = await testClient.request('json/invoice_list', {
      date_select: '1',
      date_start: today,
      date_end: today,
      page: '1',
    })
    // code 0 = 成功，code 11-23 = 認證失敗
    if (testResult.code >= 11 && testResult.code <= 23) {
      return NextResponse.json(
        { error: `光貿 API 驗證失敗: ${testResult.msg}` },
        { status: 400 },
      )
    }
  } catch {
    return NextResponse.json({ error: '光貿 API 連線失敗，請檢查網路或稍後再試' }, { status: 502 })
  }

  // 2. 存入 Vault
  const { data: secretId, error: secretError } = await db.rpc('set_guangmao_secret', {
    p_company_id: body.company_id,
    p_app_key: body.app_key,
  })

  if (secretError) {
    console.error('Failed to store guangmao secret:', secretError.message)
    return NextResponse.json({ error: '儲存金鑰失敗' }, { status: 500 })
  }

  // 3. 更新 company_settings
  const { error: settingsError } = await db
    .from('company_settings')
    .update({
      guangmao_enabled: true,
      guangmao_vault_secret_id: secretId,
      guangmao_tax_id: body.tax_id,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', body.company_id)

  if (settingsError) {
    console.error('Failed to update company settings:', settingsError.message)
    return NextResponse.json({ error: '更新公司設定失敗' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
