/**
 * Supabase PostgreSQL 資料庫客戶端
 * 支援 Cloudflare Workers 和 Node.js 環境
 */

import { Pool as PgPool, PoolClient as PgPoolClient } from 'pg'
import { Pool as NeonPool, neon, neonConfig } from '@neondatabase/serverless'

const isCloudflareWorkers = typeof globalThis.caches !== 'undefined'

let pgPool: PgPool | null = null
let neonPool: NeonPool | null = null

/**
 * 獲取或建立 PostgreSQL 連接池
 */
export function getZeaburPool(): PgPool | NeonPool {
  if (isCloudflareWorkers) {
    if (!neonPool) {
      const poolerUrl = process.env.SUPABASE_POOLER_URL

      if (!poolerUrl) {
        throw new Error('❌ SUPABASE_POOLER_URL environment variable is required for Cloudflare Workers.')
      }

      neonConfig.fetchConnectionCache = true
      neonConfig.useSecureWebSocket = true
      neonConfig.pipelineConnect = "password"

      neonPool = new NeonPool({ connectionString: poolerUrl })

      console.log('📦 Connected to Supabase PostgreSQL (serverless pooler)')
    }

    return neonPool as unknown as PgPool
  } else {
    if (!pgPool) {
      const directUrl = process.env.SUPABASE_DB_URL

      if (!directUrl) {
        throw new Error(
          '❌ SUPABASE_DB_URL environment variable is required.\n' +
          '請在 .env.local 檔案中設置資料庫連線字串:\n' +
          'SUPABASE_DB_URL=postgresql://user:password@host:port/database'
        )
      }

      const maskedUrl = directUrl.replace(/:([^@]+)@/, ':****@')
      console.log('📦 Connecting to Supabase PostgreSQL (direct):', maskedUrl)

      pgPool = new PgPool({
        connectionString: directUrl,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      })

      pgPool.on('error', (err) => {
        console.error('❌ PostgreSQL pool error:', err.message)
      })
    }

    return pgPool
  }
}

/**
 * 執行單一查詢
 */
export async function query(text: string, params?: unknown[]) {
  const pool = getZeaburPool()
  return pool.query(text, params)
}

/**
 * 獲取一個客戶端連接(用於事務)
 */
export async function getClient(): Promise<PgPoolClient> {
  const pool = getZeaburPool() as PgPool
  return pool.connect()
}

/**
 * 關閉連接池(通常在應用關閉時調用)
 */
export async function closePool() {
  if (pgPool) {
    await pgPool.end()
    pgPool = null
  }
  if (neonPool) {
    await neonPool.end()
    neonPool = null
  }
}
