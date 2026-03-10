/**
 * 401 媒體申報檔下載 API Route
 * 產生符合財政部「營業稅離線建檔系統」(BLR 114年版) 規範的 TXT 檔案
 *
 * 變更紀錄：
 * - 2026-03-10: 修正稅籍編號、加入 CRLF、流水號分開編號
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import {
  generateForm401,
} from '@/lib/services/accounting'
import {
  generateMediaFile,
  invoiceDetailToMediaData,
  type MediaInvoiceData,
  type MediaFileOptions,
} from '@/lib/services/accounting/media-file-generator'

/**
 * GET /api/accounting/reports/tax/media - 下載 401 媒體申報檔
 *
 * Query params:
 * - company_id: 公司 ID (必填)
 * - tax_id: 公司統編 8 碼 (必填)
 * - tax_registration_number: 稅籍編號 9 碼 (必填，國稅局配發)
 * - company_name: 公司名稱 (必填)
 * - year: 年度 (必填，西元年)
 * - bi_month: 雙月期 1-6 (必填)
 *
 * Response:
 * - Content-Type: text/plain; charset=ascii
 * - Content-Disposition: attachment; filename="{統編}.TXT"
 */
export const GET = withAuth('reports:read')(async (request, { db }) => {
  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get('company_id')
  const taxId = searchParams.get('tax_id')
  const taxRegistrationNumber = searchParams.get('tax_registration_number')
  const companyName = searchParams.get('company_name')
  const yearStr = searchParams.get('year')
  const biMonthStr = searchParams.get('bi_month')

  // 驗證必填參數
  if (!companyId) {
    return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
  }
  if (!taxId) {
    return NextResponse.json({ error: 'tax_id is required' }, { status: 400 })
  }
  if (!taxRegistrationNumber) {
    return NextResponse.json(
      { error: 'tax_registration_number is required (稅籍編號9碼，可在國稅局稅籍證明上找到)' },
      { status: 400 }
    )
  }
  if (!companyName) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
  }
  if (!yearStr || !biMonthStr) {
    return NextResponse.json({ error: 'year and bi_month are required' }, { status: 400 })
  }

  const year = parseInt(yearStr, 10)
  const biMonth = parseInt(biMonthStr, 10)

  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }
  if (isNaN(biMonth) || biMonth < 1 || biMonth > 6) {
    return NextResponse.json({ error: 'bi_month must be between 1 and 6' }, { status: 400 })
  }

  // 驗證統編格式（8 碼數字）
  if (!/^\d{8}$/.test(taxId)) {
    return NextResponse.json({ error: 'tax_id must be 8 digits' }, { status: 400 })
  }

  // 驗證稅籍編號格式（9 碼數字）
  if (!/^\d{9}$/.test(taxRegistrationNumber)) {
    return NextResponse.json(
      { error: 'tax_registration_number must be 9 digits (稅籍編號9碼)' },
      { status: 400 }
    )
  }

  // 產生 Form401 資料
  const form401Data = await generateForm401(db, companyId, taxId, companyName, year, biMonth)

  // 轉換發票資料為媒體檔格式
  const mediaInvoices: MediaInvoiceData[] = []

  // 銷項發票（應稅）
  for (const inv of form401Data.sales.taxable.invoices) {
    mediaInvoices.push(invoiceDetailToMediaData(inv, 'OUTPUT'))
  }

  // 銷項發票（零稅率）
  for (const inv of form401Data.sales.zeroRated.invoices) {
    mediaInvoices.push(invoiceDetailToMediaData(inv, 'OUTPUT'))
  }

  // 銷項發票（免稅）
  for (const inv of form401Data.sales.exempt.invoices) {
    mediaInvoices.push(invoiceDetailToMediaData(inv, 'OUTPUT'))
  }

  // 進項發票（可扣抵）
  for (const inv of form401Data.purchases.deductible.invoices) {
    const mediaData = invoiceDetailToMediaData(inv, 'INPUT')
    mediaData.isDeductible = true
    mediaInvoices.push(mediaData)
  }

  // 進項發票（不可扣抵）
  for (const inv of form401Data.purchases.nonDeductible.invoices) {
    const mediaData = invoiceDetailToMediaData(inv, 'INPUT')
    mediaData.isDeductible = false
    mediaInvoices.push(mediaData)
  }

  // 媒體檔產生選項
  const options: MediaFileOptions = {
    taxRegistrationNumber, // 國稅局配發的 9 碼稅籍編號
    taxId,                 // 8 碼統一編號（填入買受人/銷售人欄位用）
    year,
    biMonth,
  }

  // 產生媒體檔
  const mediaFile = generateMediaFile(mediaInvoices, options)

  // 檔案名稱：統編.TXT（BLR 要求檔名為 8 碼統編）
  const filename = `${taxId}.TXT`

  // 回傳 TXT 檔案（ASCII 編碼）
  return new NextResponse(mediaFile.content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=ascii',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Record-Count': String(mediaFile.recordCount),
      'X-Output-Count': String(mediaFile.outputCount),
      'X-Input-Count': String(mediaFile.inputCount),
      'X-Output-Amount': String(mediaFile.outputAmount),
      'X-Input-Amount': String(mediaFile.inputAmount),
      'X-Output-Tax': String(mediaFile.outputTax),
      'X-Input-Tax': String(mediaFile.inputTax),
    },
  })
})
