/**
 * 發票匯入範本下載 API
 * GET /api/accounting/invoices/template - 下載 Excel 範本
 */

import { NextResponse } from 'next/server'
import { generateInvoiceTemplate } from '@/lib/services/accounting/invoice-template.service'

/**
 * GET /api/accounting/invoices/template - 下載發票匯入範本
 */
export async function GET() {
  try {
    // 產生 Excel 範本
    const buffer = await generateInvoiceTemplate()

    // 設定檔案名稱（包含日期）
    const today = new Date().toISOString().split('T')[0]
    const filename = `invoice-import-template-${today}.xlsx`

    // 回傳 Excel 檔案（轉為 Uint8Array 供 Response 使用）
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error generating invoice template:', error)
    return NextResponse.json(
      { error: '範本產生失敗' },
      { status: 500 }
    )
  }
}
