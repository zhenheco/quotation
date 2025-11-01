#!/usr/bin/env tsx

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { Pool } from 'pg'

async function testConnection() {
  console.log('🔍 測試資料庫連接...\n')

  const directUrl = process.env.SUPABASE_DB_URL
  const poolerUrl = `postgresql://postgres.nxlqtnnssfzzpbyfjnby:0BcMgW5mlOENYK9G@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`

  console.log('1. 測試直接連接 (Direct)...')
  try {
    const directPool = new Pool({
      connectionString: directUrl,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000
    })
    const result = await directPool.query('SELECT NOW()')
    console.log('✅ 直接連接成功:', result.rows[0])
    await directPool.end()
  } catch (error) {
    console.error('❌ 直接連接失敗:', error instanceof Error ? error.message : error)
  }

  console.log('\n2. 測試 Pooler 連接 (Transaction Pooler)...')
  try {
    const poolerPool = new Pool({
      connectionString: poolerUrl,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000
    })
    const result = await poolerPool.query('SELECT NOW()')
    console.log('✅ Pooler 連接成功:', result.rows[0])

    console.log('\n3. 測試查詢報價單...')
    const quotation = await poolerPool.query(
      'SELECT id, quotation_number, payment_status, exchange_rate FROM quotations WHERE id = $1',
      ['e3a189cf-7ab9-484d-904e-a47922ceeb69']
    )
    console.log('✅ 查詢成功:', quotation.rows[0])

    await poolerPool.end()
  } catch (error) {
    console.error('❌ Pooler 連接失敗:', error instanceof Error ? error.message : error)
  }
}

testConnection().catch(console.error)
