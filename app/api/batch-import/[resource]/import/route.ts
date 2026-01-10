/**
 * 批量匯入 API
 *
 * POST /api/batch-import/[resource]/import
 *
 * 請求體:
 * {
 *   data: ParsedRow[]       - 解析後的資料
 *   company_id: string      - 公司 ID
 *   duplicateHandling: 'skip' | 'update' | 'error'
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type ApiContext } from '@/lib/api/middleware'
import type {
  ImportResourceType,
  DuplicateHandling,
  ImportResult,
  ValidationError,
  CustomerImportRow,
  ProductImportRow,
  SupplierImportRow,
} from '@/lib/services/batch-import/types'
import {
  validateCustomerRows,
  toCustomerCreateInput,
} from '@/lib/services/batch-import/validators/customer-validator'
import {
  validateProductRows,
  toProductCreateInput,
} from '@/lib/services/batch-import/validators/product-validator'
import {
  validateSupplierRows,
  toSupplierCreateInput,
} from '@/lib/services/batch-import/validators/supplier-validator'
import { createCustomerWithRetry } from '@/lib/dal/customers'
import { createProduct, updateProduct } from '@/lib/dal/products'
import { createSupplier, updateSupplier } from '@/lib/dal/suppliers'
import type { SupabaseClient } from '@/lib/db/supabase-client'

const VALID_RESOURCES: ImportResourceType[] = ['customers', 'products', 'suppliers']
const MAX_ROWS = 500

/** 權限映射 */
const PERMISSION_MAP: Record<ImportResourceType, string> = {
  customers: 'customers:write',
  products: 'products:write',
  suppliers: 'suppliers:write',
}

interface ImportRequest {
  data: Record<string, unknown>[]
  company_id: string
  duplicateHandling: DuplicateHandling
}

/**
 * 匯入客戶
 */
async function importCustomers(
  db: SupabaseClient,
  userId: string,
  companyId: string,
  data: Record<string, unknown>[],
  duplicateHandling: DuplicateHandling
): Promise<ImportResult> {
  const { validRows, invalidRows, errors } = validateCustomerRows(data)

  let importedCount = 0
  let updatedCount = 0
  let skippedCount = 0
  const importErrors: ValidationError[] = [...errors]

  for (const row of validRows) {
    const customerData = row as unknown as CustomerImportRow
    const email = customerData.email

    // 檢查重複（以 email 為主鍵）
    const { data: existing } = await db
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('email', email)
      .single()

    if (existing) {
      if (duplicateHandling === 'skip') {
        skippedCount++
        continue
      } else if (duplicateHandling === 'error') {
        importErrors.push({
          row: row._rowNumber,
          column: 'email',
          message: `重複的電子郵件: ${email}`,
          messageEn: `Duplicate email: ${email}`,
        })
        continue
      } else if (duplicateHandling === 'update') {
        // 更新現有記錄
        const updateData = toCustomerCreateInput(customerData)
        const { error } = await db
          .from('customers')
          .update({
            name: updateData.name,
            phone: updateData.phone,
            fax: updateData.fax,
            address: updateData.address,
            tax_id: updateData.tax_id,
            contact_person: updateData.contact_person,
            notes: updateData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (error) {
          importErrors.push({
            row: row._rowNumber,
            column: '',
            message: `更新失敗: ${error.message}`,
            messageEn: `Update failed: ${error.message}`,
          })
        } else {
          updatedCount++
        }
        continue
      }
    }

    // 建立新記錄
    try {
      const createData = toCustomerCreateInput(customerData)
      await createCustomerWithRetry(db, userId, companyId, createData)
      importedCount++
    } catch (error) {
      importErrors.push({
        row: row._rowNumber,
        column: '',
        message: `建立失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        messageEn: `Create failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  return {
    success: importErrors.length === 0 || importedCount > 0 || updatedCount > 0,
    importedCount,
    updatedCount,
    skippedCount,
    errorCount: invalidRows.length + importErrors.length - errors.length,
    errors: importErrors,
  }
}

/**
 * 匯入產品
 */
async function importProducts(
  db: SupabaseClient,
  userId: string,
  companyId: string,
  data: Record<string, unknown>[],
  duplicateHandling: DuplicateHandling
): Promise<ImportResult> {
  const { validRows, invalidRows, errors } = validateProductRows(data)

  let importedCount = 0
  let updatedCount = 0
  let skippedCount = 0
  const importErrors: ValidationError[] = [...errors]

  for (const row of validRows) {
    const productData = row as unknown as ProductImportRow
    const sku = productData.sku

    // 檢查重複（以 SKU 為主鍵，如果 SKU 為空則不檢查）
    let existing: { id: string } | null = null
    if (sku) {
      const { data: existingProduct } = await db
        .from('products')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('sku', sku)
        .single()
      existing = existingProduct
    }

    if (existing) {
      if (duplicateHandling === 'skip') {
        skippedCount++
        continue
      } else if (duplicateHandling === 'error') {
        importErrors.push({
          row: row._rowNumber,
          column: 'sku',
          message: `重複的 SKU: ${sku}`,
          messageEn: `Duplicate SKU: ${sku}`,
        })
        continue
      } else if (duplicateHandling === 'update') {
        const updateData = toProductCreateInput(productData)
        try {
          await updateProduct(db, userId, existing.id, updateData)
          updatedCount++
        } catch (error) {
          importErrors.push({
            row: row._rowNumber,
            column: '',
            message: `更新失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
            messageEn: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
        }
        continue
      }
    }

    // 建立新記錄
    try {
      const createData = toProductCreateInput(productData)
      await createProduct(db, userId, {
        ...createData,
        company_id: companyId,
      })
      importedCount++
    } catch (error) {
      importErrors.push({
        row: row._rowNumber,
        column: '',
        message: `建立失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        messageEn: `Create failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  return {
    success: importErrors.length === 0 || importedCount > 0 || updatedCount > 0,
    importedCount,
    updatedCount,
    skippedCount,
    errorCount: invalidRows.length + importErrors.length - errors.length,
    errors: importErrors,
  }
}

/**
 * 匯入供應商
 */
async function importSuppliers(
  db: SupabaseClient,
  userId: string,
  companyId: string,
  data: Record<string, unknown>[],
  duplicateHandling: DuplicateHandling
): Promise<ImportResult> {
  const { validRows, invalidRows, errors } = validateSupplierRows(data)

  let importedCount = 0
  let updatedCount = 0
  let skippedCount = 0
  const importErrors: ValidationError[] = [...errors]

  for (const row of validRows) {
    const supplierData = row as unknown as SupplierImportRow
    const code = supplierData.code
    const taxId = supplierData.tax_id

    // 檢查重複（以 code 或 tax_id 為主鍵）
    let existing: { id: string } | null = null
    if (code) {
      const { data: existingByCode } = await db
        .from('suppliers')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('code', code)
        .single()
      existing = existingByCode
    }
    if (!existing && taxId) {
      const { data: existingByTaxId } = await db
        .from('suppliers')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('tax_id', taxId)
        .single()
      existing = existingByTaxId
    }

    if (existing) {
      if (duplicateHandling === 'skip') {
        skippedCount++
        continue
      } else if (duplicateHandling === 'error') {
        importErrors.push({
          row: row._rowNumber,
          column: code ? 'code' : 'tax_id',
          message: `重複的${code ? '供應商代碼' : '統一編號'}: ${code || taxId}`,
          messageEn: `Duplicate ${code ? 'supplier code' : 'tax ID'}: ${code || taxId}`,
        })
        continue
      } else if (duplicateHandling === 'update') {
        const updateData = toSupplierCreateInput(supplierData)
        try {
          await updateSupplier(db, existing.id, updateData)
          updatedCount++
        } catch (error) {
          importErrors.push({
            row: row._rowNumber,
            column: '',
            message: `更新失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
            messageEn: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
        }
        continue
      }
    }

    // 建立新記錄
    try {
      const createData = toSupplierCreateInput(supplierData)
      await createSupplier(db, userId, {
        ...createData,
        company_id: companyId,
      })
      importedCount++
    } catch (error) {
      importErrors.push({
        row: row._rowNumber,
        column: '',
        message: `建立失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        messageEn: `Create failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  return {
    success: importErrors.length === 0 || importedCount > 0 || updatedCount > 0,
    importedCount,
    updatedCount,
    skippedCount,
    errorCount: invalidRows.length + importErrors.length - errors.length,
    errors: importErrors,
  }
}

/**
 * 處理匯入請求
 */
async function handleImport(
  request: NextRequest,
  context: ApiContext,
  resource: ImportResourceType
): Promise<NextResponse> {
  const body = (await request.json()) as ImportRequest
  const { data, company_id, duplicateHandling } = body

  // 驗證請求
  if (!data || !Array.isArray(data)) {
    return NextResponse.json(
      { success: false, error: '缺少資料' },
      { status: 400 }
    )
  }

  if (!company_id) {
    return NextResponse.json(
      { success: false, error: '缺少公司 ID' },
      { status: 400 }
    )
  }

  if (data.length === 0) {
    return NextResponse.json(
      { success: false, error: '資料為空' },
      { status: 400 }
    )
  }

  if (data.length > MAX_ROWS) {
    return NextResponse.json(
      { success: false, error: `資料超過上限 ${MAX_ROWS} 筆` },
      { status: 400 }
    )
  }

  const validHandling: DuplicateHandling[] = ['skip', 'update', 'error']
  if (!validHandling.includes(duplicateHandling)) {
    return NextResponse.json(
      { success: false, error: '無效的重複處理方式' },
      { status: 400 }
    )
  }

  /** 資源匯入函數映射 */
  const IMPORT_HANDLERS: Record<
    ImportResourceType,
    typeof importCustomers
  > = {
    customers: importCustomers,
    products: importProducts,
    suppliers: importSuppliers,
  }

  const importHandler = IMPORT_HANDLERS[resource]
  const result = await importHandler(
    context.db,
    context.user.id,
    company_id,
    data,
    duplicateHandling
  )

  return NextResponse.json({
    success: result.success,
    result,
  })
}

// 動態路由處理
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params

  // 驗證資源類型
  if (!VALID_RESOURCES.includes(resource as ImportResourceType)) {
    return NextResponse.json(
      {
        success: false,
        error: `無效的資源類型: ${resource}，支援: ${VALID_RESOURCES.join(', ')}`,
      },
      { status: 400 }
    )
  }

  const resourceType = resource as ImportResourceType
  const permission = PERMISSION_MAP[resourceType]

  // 使用 withAuth 中間件
  const handler = withAuth(permission)(
    async (req, ctx) => handleImport(req, ctx, resourceType)
  )

  return handler(request)
}
