#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
} catch (error) {
  console.warn('⚠️  無法讀取 .env.local')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    console.log('🚀 開始執行 migration 016_ensure_products_base_price.sql...\n')

    const migrationPath = join(
      process.cwd(),
      'migrations',
      '016_ensure_products_base_price.sql'
    )

    console.log(`📄 讀取檔案: ${migrationPath}`)
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('⚙️  透過 Supabase API 執行 SQL...\n')

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ Migration 執行失敗：', error)
      process.exit(1)
    }

    console.log('✅ Migration 執行成功！\n')

    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'products')
      .in('column_name', ['base_price', 'base_currency', 'unit_price', 'currency'])
      .order('column_name')

    if (columnsError) {
      console.error('❌ 無法查詢欄位資訊：', columnsError)
    } else {
      console.log('📊 products 表格欄位狀態：')
      console.table(columns)
    }

    const { data: sampleData, error: sampleError } = await supabase
      .from('products')
      .select('id, sku, base_price, base_currency')
      .limit(3)

    if (!sampleError && sampleData && sampleData.length > 0) {
      console.log('\n📝 範例資料（前 3 筆）：')
      console.table(sampleData)
    }

  } catch (error) {
    console.error('\n❌ 執行過程中發生錯誤：')
    console.error(error)
    process.exit(1)
  }
}

applyMigration()
