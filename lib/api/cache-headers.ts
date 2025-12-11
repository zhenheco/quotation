import { NextResponse } from 'next/server'

/**
 * API 快取策略定義
 * 根據資料敏感度和更新頻率選擇適當的快取策略
 */
export const CacheHeaders = {
  /** 即時資料：不快取（如付款狀態、庫存） */
  realtime: 'no-store',

  /** 靜態參考資料：長快取（如系統設定、常量） */
  static: 'public, s-maxage=3600, stale-while-revalidate=7200',

  /** 使用者特定資料：短快取（如產品、客戶列表） */
  userSpecific: 'private, s-maxage=60, stale-while-revalidate=120',

  /** 分析資料：中等快取（如報表、統計） */
  analytics: 'private, s-maxage=120, stale-while-revalidate=300',

  /** 敏感資料：極短快取（如報價單） */
  sensitive: 'private, s-maxage=30, stale-while-revalidate=60'
} as const

export type CacheType = keyof typeof CacheHeaders

/**
 * 為 API 回應設定 Cache-Control 頭
 * @param response - NextResponse 物件
 * @param type - 快取類型
 * @returns 設定後的 NextResponse
 */
export function setCacheHeader(
  response: NextResponse,
  type: CacheType
): NextResponse {
  response.headers.set('Cache-Control', CacheHeaders[type])
  return response
}

/**
 * 建立帶有快取頭的 JSON 回應
 * @param data - 回應資料
 * @param type - 快取類型
 * @param status - HTTP 狀態碼
 * @returns NextResponse
 */
export function jsonWithCache<T>(
  data: T,
  type: CacheType,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status })
  response.headers.set('Cache-Control', CacheHeaders[type])
  return response
}
