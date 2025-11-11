/**
 * Cloudflare Workers 類型定義
 */

declare global {
  interface CloudflareEnv {
    DB: D1Database
    KV: KVNamespace
    ANALYTICS?: AnalyticsEngineDataset
    EXCHANGE_RATE_API_KEY?: string
  }
}

export {}
