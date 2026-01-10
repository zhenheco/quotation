/**
 * 批量匯入範本下載 API
 *
 * GET /api/batch-import/[resource]/template?format=xlsx|csv
 */

import { NextRequest, NextResponse } from 'next/server'

const VALID_RESOURCES = ['customers', 'products', 'suppliers']
const VALID_FORMATS = ['xlsx', 'csv']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params
  const format = request.nextUrl.searchParams.get('format') || 'xlsx'

  // 驗證資源類型
  if (!VALID_RESOURCES.includes(resource)) {
    return NextResponse.json(
      {
        success: false,
        error: `無效的資源類型: ${resource}，支援: ${VALID_RESOURCES.join(', ')}`,
      },
      { status: 400 }
    )
  }

  // 驗證檔案格式
  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      {
        success: false,
        error: `無效的檔案格式: ${format}，支援: ${VALID_FORMATS.join(', ')}`,
      },
      { status: 400 }
    )
  }

  // 建構範本檔案路徑
  const filename = `${resource.slice(0, -1)}-import-template.${format}`

  // 重導向到靜態檔案
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const templateUrl = `${baseUrl}/templates/${filename}`

  return NextResponse.redirect(templateUrl, { status: 302 })
}
