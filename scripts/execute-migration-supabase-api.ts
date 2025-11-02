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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeMigration() {
  try {
    console.log('🚀 開始執行 migration 016_ensure_products_base_price.sql...\n')

    const migrationPath = join(
      process.cwd(),
      'migrations',
      '016_ensure_products_base_price.sql'
    )

    console.log(`📄 讀取檔案: ${migrationPath}`)
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('⚙️  透過 Supabase REST API 執行 SQL...\n')

    // 使用 Supabase REST API 執行 SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Migration 執行失敗：', error)

      // 嘗試使用原生 PostgreSQL 函數
      console.log('\n🔄 嘗試使用原生查詢...\n')

      const { error: queryError } = await supabase.rpc('exec_raw_sql', { sql })

      if (queryError) {
        console.error('❌ 原生查詢也失敗：', queryError.message)
        console.log('\n💡 解決方案：')
        console.log('1. 打開 Supabase Dashboard: https://supabase.com/dashboard')
        console.log('2. 前往 SQL Editor')
        console.log('3. 複製並執行 migrations/016_ensure_products_base_price.sql')
        process.exit(1)
      }
    }

    console.log('✅ Migration 執行成功！\n')

    // 驗證結果
    const { data: columns } = await supabase
      .from('products')
      .select('*')
      .limit(1)

    if (columns && columns.length > 0) {
      const firstProduct = columns[0]
      console.log('📊 當前欄位：')
      console.log(Object.keys(firstProduct).sort().join(', '))

      console.log('\n💡 欄位檢查：')
      console.log(`   - base_price: ${firstProduct.base_price !== undefined ? '✅ 存在' : '❌ 不存在'}`)
      console.log(`   - base_currency: ${firstProduct.base_currency !== undefined ? '✅ 存在' : '❌ 不存在'}`)
      console.log(`   - unit_price: ${firstProduct.unit_price !== undefined ? '⚠️  存在（舊欄位）' : '✅ 已移除'}`)
      console.log(`   - currency: ${firstProduct.currency !== undefined ? '⚠️  存在（舊欄位）' : '✅ 已移除'}`)
    }

  } catch (error) {
    console.error('\n❌ 執行過程中發生錯誤：')
    console.error(error)
    console.log('\n💡 請手動執行：')
    console.log('1. 打開 Supabase Dashboard')
    console.log('2. 前往 SQL Editor')
    console.log('3. 複製並執行 migrations/016_ensure_products_base_price.sql')
    process.exit(1)
  }
}

executeMigration()
