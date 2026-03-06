/**
 * 批次審核+過帳 API Route
 * 一鍵將所有 DRAFT/VERIFIED 發票推進到 POSTED 狀態
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { batchVerifyInvoices, batchPostInvoices } from '@/lib/services/accounting'
import { getInvoices } from '@/lib/dal/accounting'

/**
 * POST /api/accounting/invoices/batch-post
 *
 * Body:
 * - company_id: string (必填)
 * - invoice_ids?: string[] (選填，不指定則處理全部 DRAFT/VERIFIED)
 */
export const POST = withAuth('invoices:post')(async (request, { user, db }) => {
  try {
    const body = (await request.json()) as {
      company_id?: string
      invoice_ids?: string[]
    }

    const companyId = body.company_id
    if (!companyId) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      )
    }

    let targetIds = body.invoice_ids

    // 如果沒指定 IDs，取全部 DRAFT + VERIFIED
    if (!targetIds || targetIds.length === 0) {
      const [draftInvoices, verifiedInvoices] = await Promise.all([
        getInvoices(db, {
          companyId,
          status: 'DRAFT',
          limit: 10000,
          offset: 0,
        }),
        getInvoices(db, {
          companyId,
          status: 'VERIFIED',
          limit: 10000,
          offset: 0,
        }),
      ])

      targetIds = [
        ...draftInvoices.map((i) => i.id),
        ...verifiedInvoices.map((i) => i.id),
      ]
    }

    if (targetIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          verified: { success: 0, failed: 0 },
          posted: { success: 0, failed: 0 },
          message: '沒有需要處理的發票',
        },
      })
    }

    // Step 1: 先取得所有需要處理的發票，分出 DRAFT 和 VERIFIED
    const allInvoices = await getInvoices(db, {
      companyId,
      limit: 10000,
      offset: 0,
    })
    const invoiceMap = new Map(allInvoices.map((inv) => [inv.id, inv]))

    const draftIds = targetIds.filter(
      (id) => invoiceMap.get(id)?.status === 'DRAFT'
    )
    const verifiedIds = targetIds.filter(
      (id) => invoiceMap.get(id)?.status === 'VERIFIED'
    )

    // Step 2: 批次審核 DRAFT → VERIFIED
    let verifyResult = { success: [] as string[], failed: [] as Array<{ id: string; error: string }> }
    if (draftIds.length > 0) {
      verifyResult = await batchVerifyInvoices(db, draftIds, user.id)
    }

    // Step 3: 批次過帳（原本就是 VERIFIED 的 + 剛審核成功的）
    const toPostIds = [...verifiedIds, ...verifyResult.success]
    let postResult = { success: [] as string[], failed: [] as Array<{ id: string; error: string }> }
    if (toPostIds.length > 0) {
      postResult = await batchPostInvoices(db, toPostIds, user.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        verified: {
          success: verifyResult.success.length,
          failed: verifyResult.failed.length,
          errors: verifyResult.failed.length > 0 ? verifyResult.failed : undefined,
        },
        posted: {
          success: postResult.success.length,
          failed: postResult.failed.length,
          errors: postResult.failed.length > 0 ? postResult.failed : undefined,
        },
        message: `審核 ${verifyResult.success.length} 筆，過帳 ${postResult.success.length} 筆`,
      },
    })
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
