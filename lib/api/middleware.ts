/**
 * API Route 驗證中間件
 *
 * 提供統一的認證、授權、錯誤處理包裝
 *
 * 簡化版：直接使用 Supabase 進行認證和權限檢查
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getSupabaseClient, SupabaseClient } from '@/lib/db/supabase-client'
import { getUserPermissions, ensureUserHasRole } from '@/lib/dal/rbac'
import { getErrorMessage } from '@/app/api/utils/error-handler'

/**
 * API 請求上下文
 */
export interface ApiContext {
  /** 已驗證的使用者 */
  user: {
    id: string
    email?: string
  }
  /** Supabase 資料庫客戶端 */
  db: SupabaseClient
}

/**
 * 權限名稱映射：API 格式 -> 資料庫格式
 *
 * 背景說明：
 * - API 路由使用簡短的權限名稱（如 invoices:read）
 * - 資料庫權限表使用完整名稱（如 acc_invoices:read）
 * - 此映射表用於轉換 API 權限名稱到資料庫權限名稱
 *
 * 參考：migrations/044_accounting_core_tables.sql
 */
const permissionMapping: Record<string, string[]> = {
  // 公司相關
  'companies:read': ['companies:read', 'company_settings:read'],
  'companies:write': ['companies:write', 'company_settings:write'],
  'exchange_rates:read': ['exchange_rates:read'],

  // 會計發票（API: invoices → DB: acc_invoices）
  'invoices:read': ['acc_invoices:read'],
  'invoices:write': ['acc_invoices:write'],
  'invoices:delete': ['acc_invoices:delete'],
  'invoices:post': ['acc_invoices:post'],
  'invoices:verify': ['acc_invoices:write'], // verify 使用 write 權限
  'invoices:void': ['acc_invoices:write'], // void 使用 write 權限

  // 會計傳票（API: journals → DB: journal_entries）
  'journals:read': ['journal_entries:read'],
  'journals:write': ['journal_entries:write'],
  'journals:delete': ['journal_entries:delete'],
  'journals:post': ['journal_entries:post'],
  'journals:void': ['journal_entries:write'], // void 使用 write 權限

  // 財務報表（需要讀取傳票和發票權限）
  'reports:read': ['journal_entries:read', 'acc_invoices:read'],

  // 會計科目
  'accounts:read': ['accounts:read'],
  'accounts:write': ['accounts:write'],
  'accounts:delete': ['accounts:delete'],
}

/**
 * 驗證使用者（直接使用 Supabase）
 */
async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ id: string; email?: string } | null> {
  const supabase = createApiClient(request)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return { id: user.id, email: user.email }
}

/**
 * 檢查使用者權限（直接查詢資料庫）
 */
async function checkPermission(
  db: SupabaseClient,
  userId: string,
  permissionName: string
): Promise<boolean> {
  // 確保使用者有角色（如果沒有會自動分配）
  await ensureUserHasRole(db, userId)

  const permissions = await getUserPermissions(db, userId)

  // 先嘗試直接匹配
  if (permissions.some((p) => p.name === permissionName)) {
    return true
  }

  // 使用映射表檢查
  const mappedPermissions = permissionMapping[permissionName]
  if (mappedPermissions) {
    return mappedPermissions.some((mp) => permissions.some((p) => p.name === mp))
  }

  return false
}

/**
 * 帶上下文的 API Handler 類型
 */
type ApiHandler<TParams = void> = (
  request: NextRequest,
  context: ApiContext,
  params: TParams
) => Promise<NextResponse>

/**
 * Next.js 動態路由參數類型
 */
type RouteParams<T> = { params: Promise<T> }

/**
 * 建立需要認證和授權的 API Route 包裝器
 *
 * @param permission - 需要的權限名稱（如 'quotations:read', 'products:write'）
 * @returns 包裝函數
 *
 * @example
 * ```typescript
 * // 簡潔的業務邏輯（無動態參數）
 * export const GET = withAuth('quotations:read')(async (request, { user, db }) => {
 *   const quotations = await getQuotations(db, user.id)
 *   return NextResponse.json(quotations)
 * })
 *
 * // 帶動態參數
 * export const GET = withAuth('products:read')<{ id: string }>(async (request, { user, db }, { id }) => {
 *   const product = await getProductById(db, user.id, id)
 *   return NextResponse.json(product)
 * })
 * ```
 */
export function withAuth(permission: string) {
  return function <TParams = void>(handler: ApiHandler<TParams>) {
    return async function (
      request: NextRequest,
      routeContext?: RouteParams<TParams>
    ): Promise<NextResponse> {
      try {
        // 取得資料庫客戶端
        const db = getSupabaseClient()

        // 驗證使用者
        const user = await getAuthenticatedUser(request)

        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 檢查權限
        const hasPermission = await checkPermission(db, user.id, permission)
        if (!hasPermission) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 建立上下文並呼叫實際的 handler
        const context: ApiContext = {
          user: {
            id: user.id,
            email: user.email,
          },
          db,
        }

        // 解析動態路由參數
        const params = routeContext?.params ? await routeContext.params : (undefined as TParams)

        return await handler(request, context, params)
      } catch (error: unknown) {
        console.error(`API Error [${permission}]:`, error)
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
      }
    }
  }
}

/**
 * 建立只需要認證（不需要特定權限）的 API Route 包裝器
 *
 * @example
 * ```typescript
 * // 無動態參數
 * export const GET = withAuthOnly(async (request, { user, db }) => {
 *   const profile = await getProfile(db, user.id)
 *   return NextResponse.json(profile)
 * })
 *
 * // 帶動態參數
 * export const GET = withAuthOnly<{ id: string }>(async (request, { user, db }, { id }) => {
 *   const item = await getItemById(db, user.id, id)
 *   return NextResponse.json(item)
 * })
 * ```
 */
export function withAuthOnly<TParams = void>(handler: ApiHandler<TParams>) {
  return async function (
    request: NextRequest,
    routeContext?: RouteParams<TParams>
  ): Promise<NextResponse> {
    try {
      // 取得資料庫客戶端
      const db = getSupabaseClient()

      // 驗證使用者
      const user = await getAuthenticatedUser(request)

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // 建立上下文並呼叫實際的 handler
      const context: ApiContext = {
        user: {
          id: user.id,
          email: user.email,
        },
        db,
      }

      // 解析動態路由參數
      const params = routeContext?.params ? await routeContext.params : (undefined as TParams)

      return await handler(request, context, params)
    } catch (error: unknown) {
      console.error('API Error [auth-only]:', error)
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
    }
  }
}
