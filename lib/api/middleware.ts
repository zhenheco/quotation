/**
 * API Route 驗證中間件
 *
 * 提供統一的認證、授權、錯誤處理包裝
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api'
import { getSupabaseClient, SupabaseClient } from '@/lib/db/supabase-client'
import { getKVCache, KVCache } from '@/lib/cache/kv-cache'
import { checkPermission } from '@/lib/cache/services'
import { getCloudflareContext } from '@opennextjs/cloudflare'
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
  /** KV 快取客戶端 */
  kv: KVCache
  /** Cloudflare 環境變數 */
  env: CloudflareEnv
}

// Cloudflare 環境類型（簡化版）
interface CloudflareEnv {
  KV_CACHE?: KVNamespace
  [key: string]: unknown
}

/**
 * 帶上下文的 API Handler 類型
 */
type ApiHandler = (
  request: NextRequest,
  context: ApiContext
) => Promise<NextResponse>

/**
 * 建立需要認證和授權的 API Route 包裝器
 *
 * @param permission - 需要的權限名稱（如 'quotations:read', 'products:write'）
 * @returns 包裝函數
 *
 * @example
 * ```typescript
 * // Before: 40+ 行重複程式碼
 * export async function GET(request: NextRequest) {
 *   const { env } = await getCloudflareContext()
 *   const supabase = createApiClient(request)
 *   const { data: { user } } = await supabase.auth.getUser()
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   const kv = getKVCache(env)
 *   const db = getSupabaseClient()
 *   const hasPermission = await checkPermission(kv, db, user.id, 'quotations:read')
 *   if (!hasPermission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 *   // ... 業務邏輯
 * }
 *
 * // After: 簡潔的業務邏輯
 * export const GET = withAuth('quotations:read')(async (request, { user, db }) => {
 *   const quotations = await getQuotations(db, user.id)
 *   return NextResponse.json(quotations)
 * })
 * ```
 */
export function withAuth(permission: string) {
  return function (handler: ApiHandler) {
    return async function (request: NextRequest): Promise<NextResponse> {
      try {
        // 取得 Cloudflare 環境
        const { env } = await getCloudflareContext() as { env: CloudflareEnv }

        // 驗證使用者
        const supabase = createApiClient(request)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }

        // 取得資料庫和快取客戶端
        const kv = getKVCache(env)
        const db = getSupabaseClient()

        // 檢查權限
        const hasPermission = await checkPermission(kv, db, user.id, permission)
        if (!hasPermission) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          )
        }

        // 建立上下文並呼叫實際的 handler
        const context: ApiContext = {
          user: {
            id: user.id,
            email: user.email
          },
          db,
          kv,
          env
        }

        return await handler(request, context)
      } catch (error: unknown) {
        console.error(`API Error [${permission}]:`, error)
        return NextResponse.json(
          { error: getErrorMessage(error) },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * 建立只需要認證（不需要特定權限）的 API Route 包裝器
 *
 * @example
 * ```typescript
 * export const GET = withAuthOnly(async (request, { user, db }) => {
 *   const profile = await getProfile(db, user.id)
 *   return NextResponse.json(profile)
 * })
 * ```
 */
export function withAuthOnly(handler: ApiHandler) {
  return async function (request: NextRequest): Promise<NextResponse> {
    try {
      // 取得 Cloudflare 環境
      const { env } = await getCloudflareContext() as { env: CloudflareEnv }

      // 驗證使用者
      const supabase = createApiClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // 取得資料庫和快取客戶端
      const kv = getKVCache(env)
      const db = getSupabaseClient()

      // 建立上下文並呼叫實際的 handler
      const context: ApiContext = {
        user: {
          id: user.id,
          email: user.email
        },
        db,
        kv,
        env
      }

      return await handler(request, context)
    } catch (error: unknown) {
      console.error('API Error [auth-only]:', error)
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      )
    }
  }
}
