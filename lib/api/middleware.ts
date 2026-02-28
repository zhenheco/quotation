/**
 * API Route 驗證中間件
 *
 * 提供統一的認證、授權、錯誤處理包裝
 *
 * 簡化版：直接使用 Supabase 進行認證和權限檢查
 * 擴展版：支援訂閱功能存取檢查
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getSupabaseClient, SupabaseClient } from '@/lib/db/supabase-client'
import { getUserPermissions, ensureUserHasRole } from '@/lib/dal/rbac'
import { getErrorMessage } from '@/app/api/utils/error-handler'
import {
  hasFeatureAccess,
  FeatureNotAvailableError,
  UsageLimitExceededError,
} from '@/lib/services/subscription'
import { createErrorResponse, ErrorResponses } from '@/lib/api/response-utils'

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

  // 訂單（API: orders → DB: orders）
  'orders:read': ['orders:read'],
  'orders:write': ['orders:write'],
  'orders:delete': ['orders:delete'],

  // 出貨單（API: shipments → DB: shipments）
  'shipments:read': ['shipments:read'],
  'shipments:write': ['shipments:write'],
  'shipments:delete': ['shipments:delete'],
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
          return ErrorResponses.unauthorized()
        }

        // 檢查權限
        const hasPermission = await checkPermission(db, user.id, permission)
        if (!hasPermission) {
          return ErrorResponses.insufficientPermissions(permission)
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
        return createErrorResponse(getErrorMessage(error), 500)
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

// ============================================================================
// SUBSCRIPTION-AWARE AUTH OPTIONS
// ============================================================================

/**
 * 訂閱功能檢查選項
 */
export interface SubscriptionOptions {
  /** 需要的訂閱功能代碼 (如 'media_401', 'ai_cash_flow') */
  requiredFeature?: string
  /** 從請求中取得 company_id 的方式 */
  getCompanyId?: (request: NextRequest, params?: unknown) => string | Promise<string>
}

/**
 * 擴展的 API 請求上下文（含 company_id）
 */
export interface ApiContextWithCompany extends ApiContext {
  /** 公司 ID (如果有提供 getCompanyId) */
  companyId?: string
}

/**
 * 帶上下文的 API Handler 類型（含 company_id）
 */
type ApiHandlerWithCompany<TParams = void> = (
  request: NextRequest,
  context: ApiContextWithCompany,
  params: TParams
) => Promise<NextResponse>

/**
 * 處理訂閱相關錯誤，回傳適當的 HTTP 回應
 */
function handleSubscriptionError(error: unknown): NextResponse | null {
  if (error instanceof FeatureNotAvailableError) {
    return NextResponse.json(
      {
        error: 'Feature not available',
        message: error.message,
        feature_code: error.featureCode,
        current_tier: error.currentTier,
        upgrade_required: true,
      },
      { status: 402 }
    )
  }

  if (error instanceof UsageLimitExceededError) {
    return NextResponse.json(
      {
        error: 'Usage limit exceeded',
        message: error.message,
        feature_code: error.featureCode,
        current_usage: error.currentUsage,
        quota_limit: error.quotaLimit,
        upgrade_required: true,
      },
      { status: 402 }
    )
  }

  return null
}

/**
 * 建立需要認證、授權和訂閱功能檢查的 API Route 包裝器
 *
 * @param permission - 需要的權限名稱（如 'quotations:read', 'products:write'）
 * @param options - 訂閱功能檢查選項
 * @returns 包裝函數
 *
 * @example
 * ```typescript
 * // 檢查訂閱功能 (從 query 參數取得 company_id)
 * export const GET = withAuthAndSubscription('reports:read', {
 *   requiredFeature: 'media_401',
 *   getCompanyId: (req) => req.nextUrl.searchParams.get('company_id') || '',
 * })(async (request, { user, db, companyId }) => {
 *   const report = await generateReport(db, companyId)
 *   return NextResponse.json(report)
 * })
 *
 * // 從 body 取得 company_id
 * export const POST = withAuthAndSubscription('invoices:write', {
 *   requiredFeature: 'income_tax',
 *   getCompanyId: async (req) => {
 *     const body = await req.clone().json()
 *     return body.company_id
 *   },
 * })(async (request, { user, db, companyId }) => {
 *   // ...
 * })
 * ```
 */
export function withAuthAndSubscription(
  permission: string,
  options?: SubscriptionOptions
) {
  return function <TParams = void>(handler: ApiHandlerWithCompany<TParams>) {
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
          return ErrorResponses.unauthorized()
        }

        // 檢查權限
        const hasPermission = await checkPermission(db, user.id, permission)
        if (!hasPermission) {
          return ErrorResponses.insufficientPermissions(permission)
        }

        // 解析動態路由參數
        const params = routeContext?.params ? await routeContext.params : (undefined as TParams)

        // 取得 company_id (如果有提供 getCompanyId)
        let companyId: string | undefined

        if (options?.getCompanyId) {
          companyId = await options.getCompanyId(request, params)

          if (!companyId) {
            return NextResponse.json(
              { error: 'company_id is required for this operation' },
              { status: 400 }
            )
          }
        }

        // 檢查訂閱功能 (如果有要求)
        if (options?.requiredFeature && companyId) {
          const hasAccess = await hasFeatureAccess(companyId, options.requiredFeature, db)

          if (!hasAccess) {
            return NextResponse.json(
              {
                error: 'Feature not available',
                message: `This feature requires an upgraded subscription plan`,
                feature_code: options.requiredFeature,
                upgrade_required: true,
              },
              { status: 402 }
            )
          }
        }

        // 建立上下文並呼叫實際的 handler
        const context: ApiContextWithCompany = {
          user: {
            id: user.id,
            email: user.email,
          },
          db,
          companyId,
        }

        return await handler(request, context, params)
      } catch (error: unknown) {
        // 優先處理訂閱相關錯誤
        const subscriptionError = handleSubscriptionError(error)
        if (subscriptionError) {
          return subscriptionError
        }

        console.error(`API Error [${permission}]:`, error)
        return createErrorResponse(getErrorMessage(error), 500)
      }
    }
  }
}

/**
 * 建立只需要認證和訂閱功能檢查的 API Route 包裝器（不需要特定權限）
 *
 * @param options - 訂閱功能檢查選項
 * @returns 包裝函數
 *
 * @example
 * ```typescript
 * export const GET = withAuthOnlyAndSubscription({
 *   requiredFeature: 'ai_cash_flow',
 *   getCompanyId: (req) => req.nextUrl.searchParams.get('company_id') || '',
 * })(async (request, { user, db, companyId }) => {
 *   const analysis = await getAIAnalysis(db, companyId)
 *   return NextResponse.json(analysis)
 * })
 * ```
 */
export function withAuthOnlyAndSubscription(options?: SubscriptionOptions) {
  return function <TParams = void>(handler: ApiHandlerWithCompany<TParams>) {
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
          return ErrorResponses.unauthorized()
        }

        // 解析動態路由參數
        const params = routeContext?.params ? await routeContext.params : (undefined as TParams)

        // 取得 company_id (如果有提供 getCompanyId)
        let companyId: string | undefined

        if (options?.getCompanyId) {
          companyId = await options.getCompanyId(request, params)

          if (!companyId) {
            return NextResponse.json(
              { error: 'company_id is required for this operation' },
              { status: 400 }
            )
          }
        }

        // 檢查訂閱功能 (如果有要求)
        if (options?.requiredFeature && companyId) {
          const hasAccess = await hasFeatureAccess(companyId, options.requiredFeature, db)

          if (!hasAccess) {
            return NextResponse.json(
              {
                error: 'Feature not available',
                message: `This feature requires an upgraded subscription plan`,
                feature_code: options.requiredFeature,
                upgrade_required: true,
              },
              { status: 402 }
            )
          }
        }

        // 建立上下文並呼叫實際的 handler
        const context: ApiContextWithCompany = {
          user: {
            id: user.id,
            email: user.email,
          },
          db,
          companyId,
        }

        return await handler(request, context, params)
      } catch (error: unknown) {
        // 優先處理訂閱相關錯誤
        const subscriptionError = handleSubscriptionError(error)
        if (subscriptionError) {
          return subscriptionError
        }

        console.error('API Error [auth-only-subscription]:', error)
        return createErrorResponse(getErrorMessage(error), 500)
      }
    }
  }
}
