/**
 * 從 Supabase 導出資料到 JSON 檔案
 *
 * 執行方式：
 * ```bash
 * npx tsx scripts/migration/export-from-supabase.ts
 * ```
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv'

// 載入 .env.local
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少環境變數：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const TABLES = [
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'companies',
  'company_members',
  'customers',
  'products',
  'quotations',
  'quotation_items',
  'quotation_shares',
  'quotation_versions',
  'customer_contracts',
  'payments',
  'exchange_rates'
]

async function exportTable(tableName: string): Promise<void> {
  console.log(`📤 導出 ${tableName}...`)

  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })

    if (error) {
      console.error(`❌ ${tableName} 導出失敗:`, error.message)
      return
    }

    // 儲存到 JSON 檔案
    const outputPath = path.join(process.cwd(), 'data-export', `${tableName}.json`)
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2))

    console.log(`✅ ${tableName}: ${count || 0} 筆資料已導出`)
  } catch (err) {
    console.error(`❌ ${tableName} 導出錯誤:`, err)
  }
}

async function main() {
  console.log('🚀 開始從 Supabase 導出資料...\n')

  // 建立導出目錄
  const exportDir = path.join(process.cwd(), 'data-export')
  await fs.mkdir(exportDir, { recursive: true })

  // 依序導出每個表
  for (const table of TABLES) {
    await exportTable(table)
  }

  console.log('\n✅ 所有資料已導出到 data-export/ 目錄')
  console.log('\n下一步：執行 import-to-d1.ts 將資料導入 D1')
}

main().catch(console.error)
