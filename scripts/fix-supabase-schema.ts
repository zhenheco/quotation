#!/usr/bin/env tsx

/**
 * 修復 Supabase Schema - 診斷並修復表結構問題
 * 解決 "column sku does not exist" 錯誤
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 錯誤：缺少環境變數')
  console.error('請確保 .env.local 中包含：')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function diagnoseSchema() {
  console.log('🔍 診斷當前資料庫狀態...\n')

  const tables = ['customers', 'products', 'quotations', 'quotation_items', 'exchange_rates']
  const existingTables: string[] = []

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(0)

    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ ${table} - 表不存在`)
      } else {
        console.log(`⚠️  ${table} - 錯誤: ${error.message}`)
      }
    } else {
      console.log(`✅ ${table} - 表存在`)
      existingTables.push(table)
    }
  }

  console.log(`\n📊 找到 ${existingTables.length}/${tables.length} 個表`)
  return existingTables
}

async function checkProductsColumns() {
  console.log('\n🔍 檢查 products 表結構...')

  // 嘗試查詢 sku 欄位
  const { data, error } = await supabase
    .from('products')
    .select('id, sku')
    .limit(1)

  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('❌ products 表缺少必要欄位（如 sku）')
      return false
    }
    console.log('⚠️  無法檢查欄位:', error.message)
    return false
  }

  console.log('✅ products 表結構正確')
  return true
}

async function dropAllTables() {
  console.log('\n🗑️  刪除現有表（準備重建）...')

  const dropStatements = [
    'DROP TABLE IF EXISTS quotation_items CASCADE;',
    'DROP TABLE IF EXISTS quotations CASCADE;',
    'DROP TABLE IF EXISTS products CASCADE;',
    'DROP TABLE IF EXISTS customers CASCADE;',
    'DROP TABLE IF EXISTS exchange_rates CASCADE;',
  ]

  for (const statement of dropStatements) {
    console.log(`執行: ${statement}`)
    // 注意：我們需要使用 RPC 或其他方式執行 DDL 語句
    // Supabase JS 客戶端不直接支持 DDL
  }

  console.log('\n⚠️  注意：需要在 Supabase Dashboard SQL Editor 中手動執行刪除操作')
  console.log('請複製以下 SQL 到 Dashboard 執行：\n')
  console.log('```sql')
  dropStatements.forEach(s => console.log(s))
  console.log('```\n')
}

async function provideSolution() {
  console.log('\n' + '='.repeat(60))
  console.log('🔧 解決方案')
  console.log('='.repeat(60) + '\n')

  console.log('由於檢測到表結構問題，請按照以下步驟操作：\n')

  console.log('步驟 1: 打開 Supabase Dashboard SQL Editor')
  console.log('  → https://supabase.com/dashboard\n')

  console.log('步驟 2: 複製並執行以下 SQL（刪除舊表）')
  console.log('```sql')
  console.log('DROP TABLE IF EXISTS quotation_items CASCADE;')
  console.log('DROP TABLE IF EXISTS quotations CASCADE;')
  console.log('DROP TABLE IF EXISTS products CASCADE;')
  console.log('DROP TABLE IF EXISTS customers CASCADE;')
  console.log('DROP TABLE IF EXISTS exchange_rates CASCADE;')
  console.log('```\n')

  console.log('步驟 3: 執行完整遷移腳本')
  console.log('  → 打開 supabase-migrations/001_initial_schema.sql')
  console.log('  → 複製全部內容（291 行）')
  console.log('  → 貼到 SQL Editor 並執行\n')

  console.log('步驟 4: 驗證表結構')
  console.log('  → 在 Table Editor 中檢查 products 表')
  console.log('  → 確認 sku 欄位存在\n')

  console.log('步驟 5: 重啟開發伺服器')
  console.log('  → npm run dev\n')
}

async function createDropScript() {
  const dropSql = `-- ========================================
-- 刪除所有業務表（重建前清理）
-- ========================================

-- 按照依賴順序刪除表
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;

-- 刪除觸發器函數
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 完成
SELECT 'All tables dropped successfully' AS status;
`

  const dropFilePath = join(process.cwd(), 'supabase-migrations', '000_drop_all_tables.sql')
  require('fs').writeFileSync(dropFilePath, dropSql)

  console.log(`\n📝 已創建刪除腳本: ${dropFilePath}`)
}

async function main() {
  console.log('🚀 Supabase Schema 診斷與修復工具\n')

  try {
    // 步驟 1: 診斷
    const existingTables = await diagnoseSchema()

    if (existingTables.length === 0) {
      console.log('\n✨ 資料庫是空的，可以直接執行遷移')
      console.log('\n請在 Supabase Dashboard 執行: supabase-migrations/001_initial_schema.sql')
      return
    }

    // 步驟 2: 檢查 products 表
    if (existingTables.includes('products')) {
      const isValid = await checkProductsColumns()

      if (!isValid) {
        console.log('\n⚠️  檢測到表結構不正確')
        await createDropScript()
        await provideSolution()
        return
      }
    }

    console.log('\n✅ 所有表結構看起來正確')
    console.log('如果仍有錯誤，請檢查應用代碼中的查詢')

  } catch (error) {
    console.error('\n❌ 診斷過程中發生錯誤:', error)
    await provideSolution()
  }
}

main()
