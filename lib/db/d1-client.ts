/**
 * Cloudflare D1 客戶端抽象層
 *
 * 功能：
 * 1. 統一的查詢介面（query, queryOne, execute）
 * 2. 交易支援 (transaction)
 * 3. TypeScript 類型安全
 * 4. 錯誤處理
 * 5. 查詢日誌（開發模式）
 *
 * 使用範例：
 * ```typescript
 * const db = getD1Client();
 * const customers = await db.query<Customer>('SELECT * FROM customers WHERE user_id = ?', [userId]);
 * const customer = await db.queryOne<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
 * await db.execute('UPDATE customers SET name = ? WHERE id = ?', [name, id]);
 * ```
 */

export interface D1Result<T = unknown> {
  results: T[]
  success: boolean
  meta: {
    duration: number
    size_after: number
    rows_read: number
    rows_written: number
  }
}

export interface D1QueryResult<T = unknown> {
  results: T[]
  meta: {
    duration: number
  }
}

export interface D1ExecResult {
  count: number
  duration: number
}

/**
 * D1 客戶端類別
 */
export class D1Client {
  constructor(private db: D1Database) {}

  /**
   * 執行查詢並返回多筆結果
   * @param sql SQL 查詢語句
   * @param params 參數化查詢的參數
   * @returns 查詢結果陣列
   */
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const stmt = this.db.prepare(sql)
      const bound = params.length > 0 ? stmt.bind(...params) : stmt
      const result = await bound.all<T>()

      if (!result.success) {
        throw new Error('D1 query failed')
      }

      return result.results || []
    } catch (error) {
      console.error('[D1Client] Query error:', { sql, params, error })
      throw error
    }
  }

  /**
   * 執行查詢並返回單筆結果
   * @param sql SQL 查詢語句
   * @param params 參數化查詢的參數
   * @returns 查詢結果（可能為 null）
   */
  async queryOne<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    try {
      const stmt = this.db.prepare(sql)
      const bound = params.length > 0 ? stmt.bind(...params) : stmt
      const result = await bound.first<T>()

      return result || null
    } catch (error) {
      console.error('[D1Client] QueryOne error:', { sql, params, error })
      throw error
    }
  }

  /**
   * 執行寫入操作（INSERT, UPDATE, DELETE）
   * @param sql SQL 語句
   * @param params 參數化查詢的參數
   * @returns 影響的行數
   */
  async execute(sql: string, params: unknown[] = []): Promise<D1ExecResult> {
    try {
      const stmt = this.db.prepare(sql)
      const bound = params.length > 0 ? stmt.bind(...params) : stmt
      const result = await bound.run()

      if (!result.success) {
        throw new Error('D1 execute failed')
      }

      return {
      // @ts-expect-error - D1 result metadata compatibility
        count: result.meta.changes || 0,
        duration: result.meta.duration
      }
    } catch (error) {
      console.error('[D1Client] Execute error:', { sql, params, error })
      throw error
    }
  }

  /**
   * 執行批次操作
   * @param statements SQL 語句和參數的陣列
   * @returns 每個語句的執行結果
   */
  async batch(
    statements: Array<{ sql: string; params?: unknown[] }>
  ): Promise<D1ExecResult[]> {
    try {
      const stmts = statements.map(({ sql, params = [] }) => {
        const stmt = this.db.prepare(sql)
        return params.length > 0 ? stmt.bind(...params) : stmt
      })

      const results = await this.db.batch(stmts)

      return results.map(result => ({
      // @ts-expect-error - D1 result metadata compatibility
        count: result.meta.changes || 0,
        duration: result.meta.duration
      }))
    } catch (error) {
      console.error('[D1Client] Batch error:', { statements, error })
      throw error
    }
  }

  /**
   * 執行交易
   * @param callback 交易回呼函式
   * @returns 交易結果
   */
  async transaction<T>(
    callback: (db: D1Client) => Promise<T>
  ): Promise<T> {
    // D1 不支援顯式交易，但 batch 操作是原子性的
    // 這裡我們使用相同的 D1Client 實例來模擬交易
    // 在實際應用中，應該使用 batch 來確保原子性
    try {
      return await callback(this)
    } catch (error) {
      console.error('[D1Client] Transaction error:', error)
      throw error
    }
  }

  /**
   * 原始 D1 資料庫實例
   * 用於需要直接存取 D1 API 的情況
   */
  get raw(): D1Database {
    return this.db
  }
}

/**
 * 從環境中取得 D1 客戶端
 *
 * 使用方式（在 API 路由或 Worker 中）：
 * ```typescript
 * export const runtime = 'edge';
 *
 * export async function GET(request: Request, { env }: { env: Env }) {
 *   const db = getD1Client(env);
 *   const customers = await db.query<Customer>('SELECT * FROM customers');
 *   return Response.json(customers);
 * }
 * ```
 */
export function getD1Client(env?: { DB?: D1Database }): D1Client {
  // 在開發環境中，可能需要從 process.env 取得
  // 在生產環境中，從 Cloudflare Workers 環境取得
  const database = env?.DB || (global as Record<string, unknown>).DB as D1Database | undefined || (process.env as Record<string, unknown>).DB as D1Database | undefined

  if (!database) {
    throw new Error(
      'D1 database not found. Make sure you have configured d1_databases in wrangler.jsonc'
    )
  }

  return new D1Client(database)
}

/**
 * D1Database 類型定義（Cloudflare Workers）
 */
export interface D1Database {
  prepare(query: string): D1PreparedStatement
  dump(): Promise<ArrayBuffer>
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
  exec(query: string): Promise<D1ExecResult>
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(colName?: string): Promise<T | null>
  run<T = unknown>(): Promise<D1Result<T>>
  all<T = unknown>(): Promise<D1Result<T>>
  raw<T = unknown>(): Promise<T[]>
}
