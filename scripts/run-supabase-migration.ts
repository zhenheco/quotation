#!/usr/bin/env tsx

/**
 * 執行 Supabase 遷移腳本
 * 這個腳本會直接連接到 Supabase 並執行 001_initial_schema.sql
 *
 * 使用方法：
 * npx tsx scripts/run-supabase-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 錯誤：缺少環境變數')
  console.error('請確保 .env.local 中包含：')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 創建 Supabase 客戶端（使用 service role key 來繞過 RLS）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSqlFile() {
  console.log('📂 讀取遷移文件...')
  const sqlFilePath = join(process.cwd(), 'supabase-migrations', '001_initial_schema.sql')
  const sqlContent = readFileSync(sqlFilePath, 'utf-8')

  console.log('🔄 執行遷移...')
  console.log('⚠️  注意：這將創建業務數據表（customers, products, quotations, quotation_items, exchange_rates）')
  console.log('⚠️  注意：這將啟用 Row Level Security 並創建安全策略')
  console.log('')

  try {
    // 使用 rpc 調用來執行原始 SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: sqlContent
    })

    if (error) {
      // 如果 exec_sql 函數不存在，嘗試使用 REST API 直接執行
      console.log('⚠️  嘗試使用替代方法執行遷移...')

      // 分割 SQL 語句
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      console.log(`📝 找到 ${statements.length} 條 SQL 語句`)

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        if (statement.length > 0) {
          console.log(`執行語句 ${i + 1}/${statements.length}...`)

          // 使用 Postgres REST API 執行
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql_string: statement + ';' })
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ 執行失敗 (語句 ${i + 1}):`, errorText)
          }
        }
      }

      console.log('')
      console.log('⚠️  由於無法使用 RPC 函數，已嘗試逐條執行 SQL')
      console.log('⚠️  建議使用 Supabase Dashboard 的 SQL Editor 來執行遷移')
      console.log('')
      console.log('📋 請按照以下步驟操作：')
      console.log('1. 打開 Supabase Dashboard: https://supabase.com/dashboard')
      console.log('2. 選擇你的項目')
      console.log('3. 進入 SQL Editor')
      console.log('4. 創建新查詢')
      console.log('5. 複製並貼上 supabase-migrations/001_initial_schema.sql 的內容')
      console.log('6. 點擊 Run 執行')
      console.log('')
      process.exit(1)
    }

    console.log('✅ 遷移執行成功！')
    console.log('')
    console.log('📊 創建的表：')
    console.log('  - customers (客戶表)')
    console.log('  - products (產品表)')
    console.log('  - quotations (報價單表)')
    console.log('  - quotation_items (報價單項目表)')
    console.log('  - exchange_rates (匯率表)')
    console.log('')
    console.log('🔒 啟用了 Row Level Security')
    console.log('📝 創建了安全策略')
    console.log('🚀 創建了索引和觸發器')
    console.log('')
    console.log('✨ 現在可以重新啟動開發伺服器，權限錯誤應該已經修復！')

  } catch (error) {
    console.error('❌ 執行遷移時發生錯誤:', error)
    console.log('')
    console.log('📋 建議使用 Supabase Dashboard 手動執行遷移：')
    console.log('1. 打開 Supabase Dashboard: https://supabase.com/dashboard')
    console.log('2. 選擇你的項目')
    console.log('3. 進入 SQL Editor')
    console.log('4. 創建新查詢')
    console.log('5. 複製並貼上 supabase-migrations/001_initial_schema.sql 的內容')
    console.log('6. 點擊 Run 執行')
    console.log('')
    process.exit(1)
  }
}

executeSqlFile()
