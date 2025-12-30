/**
 * 傳票作廢 API Route
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import { voidJournalById } from '@/lib/services/accounting'

/**
 * POST /api/accounting/journals/[id]/void - 作廢傳票
 */
export const POST = withAuth('journals:void')<{ id: string }>(
  async (request, { user, db }, { id }) => {
    try {
      // 取得作廢原因
      const body = await request.json() as { reason: string }
      if (!body.reason) {
        return NextResponse.json({ error: 'reason is required' }, { status: 400 })
      }

      const result = await voidJournalById(db, id, user.id, body.reason)
      return NextResponse.json(result)
    } catch (error) {
      const message = getErrorMessage(error)
      if (message.includes('不存在')) {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      if (message.includes('只能作廢') || message.includes('請填寫')) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
      throw error
    }
  }
)
