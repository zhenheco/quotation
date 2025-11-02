import { config } from 'dotenv'
import { resolve } from 'path'
import { getZeaburPool } from '../lib/db/zeabur'

config({ path: resolve(process.cwd(), '.env.local') })

async function checkContractUrls() {
  const pool = getZeaburPool()

  try {
    console.log('🔍 檢查報價單的合約 URL...\n')

    const result = await pool.query(`
      SELECT
        id,
        quotation_number,
        contract_file_url,
        created_at
      FROM quotations
      ORDER BY created_at DESC
      LIMIT 10
    `)

    if (result.rows.length === 0) {
      console.log('❌ 沒有找到任何報價單')
      return
    }

    console.log(`✅ 找到 ${result.rows.length} 筆報價單:\n`)

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. 報價單編號: ${row.quotation_number}`)
      console.log(`   ID: ${row.id}`)
      console.log(`   合約 URL: ${row.contract_file_url || '(未上傳)'}`)
      console.log(`   建立時間: ${row.created_at}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ 查詢失敗:', error)
  } finally {
    await pool.end()
  }
}

checkContractUrls()
