/**
 * Cloudflare Workers 類型定義
 */

declare global {
  interface CloudflareEnv {
    DB: D1Database
    KV: KVNamespace
    R2_BUCKET: R2Bucket
    ANALYTICS?: AnalyticsEngineDataset
    EXCHANGE_RATE_API_KEY?: string
  }
}

export {}
