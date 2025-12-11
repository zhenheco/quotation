/**
 * 快取預熱功能
 *
 * 在用戶登入時預先載入常用資料到快取
 * 這樣首次訪問各頁面時就不需要等待資料庫查詢
 */

import { KVCache } from '@/lib/cache/kv-cache'
import { SupabaseClient } from '@/lib/db/supabase-client'
import { checkPermission } from '@/lib/cache/services'

/**
 * 常用權限列表
 * 這些是大多數用戶登入後會立即需要的權限
 */
const COMMON_PERMISSIONS = [
  'products:read',
  'customers:read',
  'quotations:read',
  'quotations:write',
  'payments:read',
  'dashboard:read',
] as const

/**
 * 預熱用戶的權限快取
 *
 * 在登入成功後呼叫此函數，可以：
 * 1. 減少首屏載入時的權限檢查延遲
 * 2. 批量查詢比單獨查詢更高效
 *
 * @param kv - KV 快取實例
 * @param db - Supabase 客戶端
 * @param userId - 用戶 ID
 *
 * @example
 * ```typescript
 * // 在 /auth/callback 中使用
 * import { warmUserCache } from '@/lib/cache/warm-cache'
 *
 * // 登入成功後
 * await warmUserCache(kv, db, user.id)
 * ```
 */
export async function warmUserCache(
  kv: KVCache,
  db: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    // 並行預載入所有常用權限
    await Promise.all(
      COMMON_PERMISSIONS.map(permission =>
        checkPermission(kv, db, userId, permission)
      )
    )

    console.log(`[Cache] Warmed cache for user ${userId} with ${COMMON_PERMISSIONS.length} permissions`)
  } catch (error) {
    // 快取預熱失敗不應該阻止登入流程
    console.error('[Cache] Failed to warm user cache:', error)
  }
}

/**
 * 清除用戶的所有快取
 *
 * 在以下情況使用：
 * 1. 用戶登出
 * 2. 用戶權限變更
 * 3. 管理員手動清除
 *
 * @param kv - KV 快取實例
 * @param userId - 用戶 ID
 */
export async function clearUserCache(
  kv: KVCache,
  userId: string
): Promise<void> {
  try {
    // 清除權限快取
    await kv.delete(`user:${userId}:permissions`)

    // 注意：Session 快取會自動過期（5 分鐘 TTL）
    // 如果需要立即失效，需要知道 session key，這需要額外的追蹤機制

    console.log(`[Cache] Cleared cache for user ${userId}`)
  } catch (error) {
    console.error('[Cache] Failed to clear user cache:', error)
  }
}

/**
 * 預熱特定公司的常用資料
 *
 * 可用於預載入公司設定、匯率等不常變動的資料
 *
 * @param kv - KV 快取實例
 * @param companyId - 公司 ID
 */
export async function warmCompanyCache(
  kv: KVCache,
  companyId: string
): Promise<void> {
  // 公司快取已經在 services.ts 中的 getCompanyInfo 實現
  // 這裡可以擴展其他公司級別的快取預熱
  console.log(`[Cache] Company cache warming for ${companyId} (delegated to services)`)
}
