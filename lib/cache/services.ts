/**
 * 快取服務層
 *
 * 注意：此模組已簡化，移除了 KV 快取依賴。
 * 所有函數現在直接查詢資料庫。
 *
 * 對於需要快取的場景，建議：
 * - 使用 HTTP 快取標頭（Cache-Control）
 * - 使用 React Query / TanStack Query 的客戶端快取
 */

import { SupabaseClient } from '@/lib/db/supabase-client'
import { getUserPermissions, Permission, ensureUserHasRole } from '@/lib/dal/rbac'
import { getCompanyById, Company } from '@/lib/dal/companies'
import { getAllExchangeRates, ExchangeRate } from '@/lib/dal/exchange-rates'

/**
 * 權限名稱映射：API 格式 -> 資料庫格式
 * 注意：companies 權限現在直接使用，不再映射到 company_settings
 */
const permissionMapping: Record<string, string[]> = {
  'companies:read': ['companies:read', 'company_settings:read'],
  'companies:write': ['companies:write', 'company_settings:write'],
  'exchange_rates:read': ['exchange_rates:read']
}

/**
 * 取得使用者權限（直接查詢資料庫）
 */
export async function getUserPermissionsFromDb(
  db: SupabaseClient,
  userId: string
): Promise<Permission[]> {
  return await getUserPermissions(db, userId)
}

/**
 * 取得公司設定（直接查詢資料庫）
 */
export async function getCompanyFromDb(
  db: SupabaseClient,
  companyId: string
): Promise<Company | null> {
  return await getCompanyById(db, companyId)
}

/**
 * 取得所有匯率（直接查詢資料庫）
 */
export async function getExchangeRatesFromDb(
  db: SupabaseClient
): Promise<ExchangeRate[]> {
  return await getAllExchangeRates(db)
}

/**
 * 檢查使用者是否有權限（直接查詢資料庫）
 *
 * @param db - Supabase 客戶端
 * @param userId - 使用者 ID
 * @param permissionName - 權限名稱
 * @returns 是否有權限
 */
export async function checkPermissionDirect(
  db: SupabaseClient,
  userId: string,
  permissionName: string
): Promise<boolean> {
  // 確保使用者有角色（如果沒有會自動分配）
  await ensureUserHasRole(db, userId)

  const permissions = await getUserPermissions(db, userId)

  // 先嘗試直接匹配
  if (permissions.some(p => p.name === permissionName)) {
    return true
  }

  // 使用映射表檢查
  const mappedPermissions = permissionMapping[permissionName]
  if (mappedPermissions) {
    return mappedPermissions.some(mp =>
      permissions.some(p => p.name === mp)
    )
  }

  return false
}

// =============================================================================
// 舊版 API（向後相容）
// 這些函數保留 KVCache 參數簽名，但實際上忽略 KV 並直接查詢資料庫
// 逐步遷移到使用 withAuth middleware 或 checkPermissionDirect 後可移除
// =============================================================================

/**
 * @deprecated 請使用 withAuth middleware 或 checkPermissionDirect
 * 此函數保留是為了向後相容，KV 參數會被忽略
 */
export async function checkPermission(
  _kv: unknown,
  db: SupabaseClient,
  userId: string,
  permissionName: string
): Promise<boolean> {
  return checkPermissionDirect(db, userId, permissionName)
}

/**
 * @deprecated 請使用 getUserPermissionsFromDb
 * 此函數保留是為了向後相容，KV 參數會被忽略
 */
export async function getCachedUserPermissions(
  _kv: unknown,
  db: SupabaseClient,
  userId: string
): Promise<Permission[]> {
  return getUserPermissionsFromDb(db, userId)
}

/**
 * @deprecated 已無作用（KV 快取已移除）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function invalidateUserPermissions(_kv: unknown, _userId: string): Promise<void> {
  // No-op: KV 快取已移除
}

/**
 * @deprecated 請使用 getCompanyFromDb
 * 此函數保留是為了向後相容，KV 參數會被忽略
 */
export async function getCachedCompany(
  _kv: unknown,
  db: SupabaseClient,
  companyId: string
): Promise<Company | null> {
  return getCompanyFromDb(db, companyId)
}

/**
 * @deprecated 已無作用（KV 快取已移除）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function invalidateCompany(_kv: unknown, _companyId: string): Promise<void> {
  // No-op: KV 快取已移除
}

/**
 * @deprecated 請使用 getExchangeRatesFromDb
 * 此函數保留是為了向後相容，KV 參數會被忽略
 */
export async function getCachedExchangeRates(
  _kv: unknown,
  db: SupabaseClient
): Promise<ExchangeRate[]> {
  return getExchangeRatesFromDb(db)
}

/**
 * @deprecated 已無作用（KV 快取已移除）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function invalidateExchangeRates(_kv: unknown): Promise<void> {
  // No-op: KV 快取已移除
}

// =============================================================================
// 舊的常數（保留以防其他地方使用）
// =============================================================================

/**
 * @deprecated 不再使用
 */
export const CacheKeys = {
  userPermissions: (userId: string) => `user:${userId}:permissions`,
  company: (companyId: string) => `company:${companyId}`,
  exchangeRates: () => 'exchange-rates:all',
  exchangeRate: (base: string, target: string) => `exchange-rate:${base}:${target}`
}

/**
 * @deprecated 不再使用
 */
export const CacheTTL = {
  userPermissions: 3600,
  company: 7200,
  exchangeRates: 86400
}
