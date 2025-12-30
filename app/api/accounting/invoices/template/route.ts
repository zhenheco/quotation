/**
 * 發票匯入範本下載 API
 * GET /api/accounting/invoices/template - 重定向到靜態範本檔案
 *
 * 範本檔案由 scripts/generate-invoice-template.ts 預先產生
 * 存放於 /public/templates/invoice-template.xlsx
 */

import { NextResponse } from 'next/server'

/**
 * GET /api/accounting/invoices/template - 重定向到靜態範本檔案
 *
 * 使用靜態檔案而非動態產生，以減少伺服器端 bundle 大小
 */
export async function GET() {
  // 重定向到靜態範本檔案
  // Next.js 會自動從 public 目錄提供此檔案
  return NextResponse.redirect(
    new URL('/templates/invoice-template.xlsx', process.env.NEXT_PUBLIC_APP_URL || 'https://quote24.cc'),
    { status: 302 }
  )
}
