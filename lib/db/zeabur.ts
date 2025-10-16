/**
 * Zeabur PostgreSQL 資料庫客戶端
 * 用於直接連接到 Zeabur 上的業務資料庫
 */

import { Pool, PoolClient } from 'pg'

// Zeabur PostgreSQL 連接池
let pool: Pool | null = null

/**
 * 獲取或建立 PostgreSQL 連接池
 */
export function getZeaburPool(): Pool {
  if (!pool) {
    const connectionString = process.env.ZEABUR_POSTGRES_URL

    // 確保環境變數已設置
    if (!connectionString) {
      throw new Error(
        '❌ ZEABUR_POSTGRES_URL environment variable is required.\n' +
        '請在 .env.local 檔案中設置資料庫連線字串:\n' +
        'ZEABUR_POSTGRES_URL=postgresql://user:password@host:port/database'
      )
    }

    // 防止意外洩漏連線資訊
    const maskedUrl = connectionString.replace(
      /:([^@]+)@/,
      ':****@'
    )
    console.log('📦 Connecting to Zeabur PostgreSQL:', maskedUrl)

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // 最大連接數
      idleTimeoutMillis: 30000, // 閒置連接超時
      connectionTimeoutMillis: 2000 // 連接超時
    })

    // 錯誤處理
    pool.on('error', (err) => {
      console.error('❌ Zeabur PostgreSQL pool error:', err.message)
      // 不要記錄完整錯誤物件，避免洩漏敏感資訊
    })
  }

  return pool
}

/**
 * 執行單一查詢
 */
export async function query(text: string, params?: any[]) {
  const pool = getZeaburPool()
  return pool.query(text, params)
}

/**
 * 獲取一個客戶端連接(用於事務)
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getZeaburPool()
  return pool.connect()
}

/**
 * 關閉連接池(通常在應用關閉時調用)
 */
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
