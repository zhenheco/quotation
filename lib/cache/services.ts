/**
 * 快取服務層
 *
 * 提供業務邏輯的快取服務：
 * 1. 匯率快取（24小時）
 * 2. 使用者權限快取（1小時）
 * 3. 公司設定快取（2小時）
 */

import { KVCache } from './kv-cache'
import { D1Client } from '@/lib/db/d1-client'
import { getUserPermissions, Permission } from '@/lib/dal/rbac'
import { getCompanyById, Company } from '@/lib/dal/companies'
import { getAllExchangeRates, ExchangeRate } from '@/lib/dal/exchange-rates'

/**
 * 快取鍵生成器
 */
export const CacheKeys = {
  userPermissions: (userId: string) => `user:${userId}:permissions`,
  company: (companyId: string) => `company:${companyId}`,
  exchangeRates: () => 'exchange-rates:all',
  exchangeRate: (base: string, target: string) => `exchange-rate:${base}:${target}`
}

/**
 * TTL 設定（秒）
 */
export const CacheTTL = {
  userPermissions: 3600, // 1小時
  company: 7200, // 2小時
  exchangeRates: 86400 // 24小時
}

/**
 * 取得使用者權限（帶快取）
 */
export async function getCachedUserPermissions(
  kv: KVCache,
  db: D1Client,
  userId: string
): Promise<Permission[]> {
  return await kv.getCached(
    CacheKeys.userPermissions(userId),
    async () => await getUserPermissions(db, userId),
    { ttl: CacheTTL.userPermissions }
  )
}

/**
 * 失效使用者權限快取
 */
export async function invalidateUserPermissions(
  kv: KVCache,
  userId: string
): Promise<void> {
  await kv.delete(CacheKeys.userPermissions(userId))
}

/**
 * 取得公司設定（帶快取）
 */
export async function getCachedCompany(
  kv: KVCache,
  db: D1Client,
  companyId: string
): Promise<Company | null> {
  return await kv.getCached(
    CacheKeys.company(companyId),
    async () => await getCompanyById(db, companyId),
    { ttl: CacheTTL.company }
  )
}

/**
 * 失效公司設定快取
 */
export async function invalidateCompany(
  kv: KVCache,
  companyId: string
): Promise<void> {
  await kv.delete(CacheKeys.company(companyId))
}

/**
 * 取得所有匯率（帶快取）
 */
export async function getCachedExchangeRates(
  kv: KVCache,
  db: D1Client
): Promise<ExchangeRate[]> {
  return await kv.getCached(
    CacheKeys.exchangeRates(),
    async () => await getAllExchangeRates(db),
    { ttl: CacheTTL.exchangeRates }
  )
}

/**
 * 失效匯率快取
 */
export async function invalidateExchangeRates(kv: KVCache): Promise<void> {
  // 失效所有匯率快取
  const keys = await kv.list('exchange-rate:')
  await kv.deleteMany([...keys, CacheKeys.exchangeRates()])
}

/**
 * 權限名稱映射：API 格式 -> 資料庫格式
 */
const permissionMapping: Record<string, string[]> = {
  'companies:read': ['company_settings:read'],
  'companies:write': ['company_settings:write']
}

/**
 * 檢查使用者是否有權限（帶快取）
 */
export async function checkPermission(
  kv: KVCache,
  db: D1Client,
  userId: string,
  permissionName: string
): Promise<boolean> {
  const permissions = await getCachedUserPermissions(kv, db, userId)

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
