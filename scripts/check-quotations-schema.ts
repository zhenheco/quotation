import { config } from 'dotenv'
import { resolve } from 'path'
import { getZeaburPool } from '../lib/db/zeabur'

config({ path: resolve(process.cwd(), '.env.local') })

async function checkSchema() {
  const pool = getZeaburPool()

  try {
    console.log('🔍 檢查 quotations 資料表結構...\n')

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'quotations'
      ORDER BY ordinal_position
    `)

    console.log('資料表欄位:')
    result.rows.forEach((row) => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })

  } catch (error) {
    console.error('❌ 查詢失敗:', error)
  } finally {
    await pool.end()
  }
}

checkSchema()
