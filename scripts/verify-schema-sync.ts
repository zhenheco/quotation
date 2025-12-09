/**
 * 驗證資料庫 Schema 與代碼同步
 * 檢查 DAL 層定義的欄位是否都存在於資料庫中
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oubsycwrxzkuviakzahi.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''

// 從 DAL 層定義的表和欄位
const EXPECTED_SCHEMA: Record<string, string[]> = {
  customers: [
    'id', 'user_id', 'company_id', 'owner_id', 'customer_number',
    'name', 'email', 'phone', 'fax', 'address', 'tax_id',
    'contact_person', 'notes', 'created_at', 'updated_at'
  ],
  products: [
    'id', 'user_id', 'company_id', 'product_number', 'sku',
    'name', 'description', 'base_price', 'base_currency',
    'category', 'cost_price', 'cost_currency', 'profit_margin',
    'supplier', 'supplier_code', 'unit', 'is_active',
    'created_at', 'updated_at'
  ],
  quotations: [
    'id', 'user_id', 'company_id', 'owner_id', 'quotation_number',
    'customer_id', 'title', 'status', 'currency', 'exchange_rate',
    'subtotal', 'tax_rate', 'tax_amount', 'discount_type',
    'discount_value', 'discount_amount', 'total', 'notes',
    'valid_until', 'payment_terms_id', 'created_at', 'updated_at'
  ]
}

async function verifySchemaSync() {
  console.log('🔍 驗證資料庫 Schema 與代碼同步\n')
  console.log('=' .repeat(60))

  if (!SUPABASE_KEY) {
    console.error('❌ 請設定 SUPABASE_SERVICE_KEY 或 SUPABASE_KEY 環境變數')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  let hasErrors = false
  const results: Array<{table: string, missing: string[], extra: string[]}> = []

  for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
    console.log(`\n📋 檢查表: ${tableName}`)

    // 查詢資料庫中的實際欄位
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0)

    if (error) {
      console.error(`   ❌ 無法查詢表 ${tableName}: ${error.message}`)
      hasErrors = true
      continue
    }

    // 從 Supabase 獲取實際欄位（通過測試 insert）
    const { error: schemaError } = await supabase.rpc('get_table_columns', {
      p_table_name: tableName
    }).single()

    // 備用方案：透過 information_schema 查詢
    const { data: columnsData, error: columnsError } = await supabase
      .from('information_schema.columns' as 'customers')
      .select('column_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')

    if (columnsError) {
      // 使用 RPC 函數查詢
      console.log(`   ⚠️ 無法直接查詢 schema，改用測試方式`)

      // 測試每個欄位是否存在
      const missingColumns: string[] = []
      for (const col of expectedColumns) {
        const testQuery = await supabase
          .from(tableName)
          .select(col)
          .limit(1)

        if (testQuery.error?.message?.includes(`column "${col}" does not exist`) ||
            testQuery.error?.message?.includes(`Could not find the '${col}' column`)) {
          missingColumns.push(col)
        }
      }

      if (missingColumns.length > 0) {
        console.log(`   ❌ 缺少欄位: ${missingColumns.join(', ')}`)
        hasErrors = true
        results.push({ table: tableName, missing: missingColumns, extra: [] })
      } else {
        console.log(`   ✅ 所有欄位都存在`)
        results.push({ table: tableName, missing: [], extra: [] })
      }
    } else {
      const actualColumns = columnsData?.map(c => (c as { column_name: string }).column_name) || []
      const missingColumns = expectedColumns.filter(c => !actualColumns.includes(c))
      const extraColumns = actualColumns.filter(c => !expectedColumns.includes(c))

      if (missingColumns.length > 0) {
        console.log(`   ❌ 缺少欄位: ${missingColumns.join(', ')}`)
        hasErrors = true
      }
      if (extraColumns.length > 0) {
        console.log(`   ℹ️ 額外欄位: ${extraColumns.join(', ')}`)
      }
      if (missingColumns.length === 0) {
        console.log(`   ✅ 所有預期欄位都存在`)
      }

      results.push({ table: tableName, missing: missingColumns, extra: extraColumns })
    }
  }

  // 檢查未執行的 migrations
  console.log('\n\n📊 檢查 Migration 執行狀態')
  console.log('=' .repeat(60))

  const { data: migrations, error: migrationsError } = await supabase
    .from('schema_migrations')
    .select('filename, executed_at')
    .order('filename')

  if (migrationsError) {
    console.log('   ⚠️ 無法查詢 schema_migrations 表（可能尚未建立）')
  } else {
    const executedMigrations = new Set(migrations?.map(m => m.filename) || [])

    // 讀取本地 migration 檔案
    const migrationsDir = path.join(process.cwd(), 'migrations')
    const localMigrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.startsWith('SUPABASE'))
      .sort()

    const unexecuted = localMigrations.filter(f => !executedMigrations.has(f))

    if (unexecuted.length > 0) {
      console.log(`\n   ⚠️ 未執行的 migrations:`)
      unexecuted.forEach(f => console.log(`      - ${f}`))
      hasErrors = true
    } else {
      console.log(`\n   ✅ 所有 ${localMigrations.length} 個 migrations 都已執行`)
    }
  }

  // 總結
  console.log('\n\n' + '=' .repeat(60))
  console.log('📝 總結')
  console.log('=' .repeat(60))

  if (hasErrors) {
    console.log('\n❌ 發現 Schema 不同步問題！')
    console.log('   請檢查上述錯誤並執行必要的 migrations')
    process.exit(1)
  } else {
    console.log('\n✅ 資料庫 Schema 與代碼同步！')
    process.exit(0)
  }
}

verifySchemaSync().catch(error => {
  console.error('💥 驗證失敗:', error)
  process.exit(1)
})
