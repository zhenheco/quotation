/**
 * Cloudflare KV 快取抽象層
 *
 * 功能：
 * 1. 統一的快取介面 (get, set, delete)
 * 2. 自動 JSON 序列化/反序列化
 * 3. TTL 支援
 * 4. TypeScript 類型安全
 * 5. Cache-Aside 模式包裝器
 *
 * 使用範例：
 * ```typescript
 * const kv = getKVCache(env);
 *
 * // 設定快取
 * await kv.set('user:123:permissions', permissions, { ttl: 3600 });
 *
 * // 取得快取
 * const permissions = await kv.get<Permission[]>('user:123:permissions');
 *
 * // Cache-Aside 模式
 * const data = await kv.getCached('exchange-rates', async () => {
 *   return await fetchExchangeRates();
 * }, { ttl: 86400 });
 * ```
 */

export interface KVCacheOptions {
  /**
   * 快取過期時間（秒）
   */
  ttl?: number

  /**
   * 快取 metadata
   */
  metadata?: Record<string, unknown>
}

/**
 * KV 快取客戶端類別
 */
export class KVCache {
  constructor(private kv: KVNamespace) {}

  /**
   * 從 KV 取得快取資料
   * @param key 快取鍵
   * @returns 快取值（自動反序列化）
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get(key, 'text')

      if (!value) {
        return null
      }

      return JSON.parse(value) as T
    } catch (error) {
      console.error('[KVCache] Get error:', { key, error })
      return null
    }
  }

  /**
   * 設定 KV 快取
   * @param key 快取鍵
   * @param value 快取值（自動序列化）
   * @param options 快取選項
   */
  async set<T = unknown>(
    key: string,
    value: T,
    options?: KVCacheOptions
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value)

      const kvOptions: KVNamespacePutOptions = {}
      if (options?.ttl) {
        kvOptions.expirationTtl = options.ttl
      }
      if (options?.metadata) {
        kvOptions.metadata = options.metadata
      }

      await this.kv.put(key, serialized, kvOptions)
    } catch (error) {
      console.error('[KVCache] Set error:', { key, error })
      throw error
    }
  }

  /**
   * 刪除 KV 快取
   * @param key 快取鍵
   */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key)
    } catch (error) {
      console.error('[KVCache] Delete error:', { key, error })
      throw error
    }
  }

  /**
   * 批次刪除 KV 快取
   * @param keys 快取鍵陣列
   */
  async deleteMany(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map(key => this.kv.delete(key)))
    } catch (error) {
      console.error('[KVCache] DeleteMany error:', { keys, error })
      throw error
    }
  }

  /**
   * 列出所有鍵（含前綴過濾）
   * @param prefix 鍵前綴
   * @param limit 最大返回數量
   */
  async list(prefix?: string, limit = 1000): Promise<string[]> {
    try {
      const listOptions: KVNamespaceListOptions = { limit }
      if (prefix) {
        listOptions.prefix = prefix
      }

      const result = await this.kv.list(listOptions)
      return result.keys.map(k => k.name)
    } catch (error) {
      console.error('[KVCache] List error:', { prefix, error })
      return []
    }
  }

  /**
   * Cache-Aside 模式包裝器
   *
   * 先檢查快取，若無則執行 fetcher 並儲存結果到快取
   *
   * @param key 快取鍵
   * @param fetcher 資料取得函式
   * @param options 快取選項
   * @returns 資料（來自快取或 fetcher）
   */
  async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: KVCacheOptions
  ): Promise<T> {
    // 1. 嘗試從快取取得
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // 2. 快取未命中，執行 fetcher
    const data = await fetcher()

    // 3. 儲存到快取
    await this.set(key, data, options)

    return data
  }

  /**
   * 原始 KV namespace
   * 用於需要直接存取 KV API 的情況
   */
  get raw(): KVNamespace {
    return this.kv
  }
}

/**
 * 從環境中取得 KV 快取客戶端
 */
export function getKVCache(env?: { KV?: KVNamespace }): KVCache {
  const kv = env?.KV || (global as Record<string, unknown>).KV as KVNamespace | undefined || (process.env as Record<string, unknown>).KV as KVNamespace | undefined

  if (!kv) {
    throw new Error(
      'KV namespace not found. Make sure you have configured kv_namespaces in wrangler.jsonc'
    )
  }

  return new KVCache(kv)
}

/**
 * KV Namespace 類型定義（Cloudflare Workers）
 */
export interface KVNamespace {
  get(key: string, type?: 'text'): Promise<string | null>
  get(key: string, type: 'json'): Promise<unknown | null>
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>
  get(key: string, type: 'stream'): Promise<ReadableStream | null>

  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVNamespacePutOptions): Promise<void>

  delete(key: string): Promise<void>

  list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult>
}

export interface KVNamespacePutOptions {
  expiration?: number
  expirationTtl?: number
  metadata?: Record<string, unknown>
}

export interface KVNamespaceListOptions {
  limit?: number
  prefix?: string
  cursor?: string
}

export interface KVNamespaceListResult {
  keys: Array<{
    name: string
    expiration?: number
    metadata?: Record<string, unknown>
  }>
  list_complete: boolean
  cursor?: string
}
