/**
 * 會計傳票詳情 API Routes
 * Account-system → quotation-system 整合
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import {
  getJournalDetail,
  deleteJournalById,
} from '@/lib/services/accounting'

/**
 * GET /api/accounting/journals/[id] - 取得傳票詳情
 */
export const GET = withAuth('journals:read')<{ id: string }>(
  async (request, { db }, { id }) => {
    const journal = await getJournalDetail(db, id)

    if (!journal) {
      return NextResponse.json({ error: 'Journal not found' }, { status: 404 })
    }

    return NextResponse.json(journal)
  }
)

/**
 * DELETE /api/accounting/journals/[id] - 刪除傳票
 */
export const DELETE = withAuth('journals:delete')<{ id: string }>(
  async (request, { db }, { id }) => {
    try {
      await deleteJournalById(db, id)
      return NextResponse.json({ success: true })
    } catch (error) {
      const message = getErrorMessage(error)
      if (message.includes('不存在')) {
        return NextResponse.json({ error: message }, { status: 404 })
      }
      if (message.includes('只能刪除')) {
        return NextResponse.json({ error: message }, { status: 400 })
      }
      throw error
    }
  }
)
