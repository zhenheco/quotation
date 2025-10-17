#!/usr/bin/env tsx

/**
 * Supabase 連接診斷工具
 * 檢查資料庫連接、表結構和權限
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// 加載 .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Supabase 診斷工具\n')
console.log('=' .repeat(60))

// 檢查環境變數
console.log('\n1️⃣ 檢查環境變數')
console.log('-'.repeat(60))
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ 已設定' : '❌ 未設定')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ 已設定' : '❌ 未設定')

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('\n❌ 環境變數未正確設定！')
  console.log('請檢查 .env.local 文件')
  process.exit(1)
}

console.log('\nSupabase URL:', supabaseUrl)
console.log('Anon Key (前20字元):', supabaseAnonKey.substring(0, 20) + '...')

// 創建客戶端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function diagnose() {
  try {
    // 檢查認證狀態
    console.log('\n2️⃣ 檢查認證狀態')
    console.log('-'.repeat(60))
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.log('❌ 認證檢查失敗:', authError.message)
    } else if (!user) {
      console.log('⚠️  目前沒有登入用戶')
      console.log('提示：請先在瀏覽器登入，然後重新執行此腳本')
    } else {
      console.log('✅ 已登入用戶:', user.email)
      console.log('用戶 ID:', user.id)
    }

    // 檢查表是否存在
    console.log('\n3️⃣ 檢查資料表')
    console.log('-'.repeat(60))

    const tables = ['customers', 'products', 'quotations', 'quotation_items', 'exchange_rates']

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(0)

      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${table} - 表不存在`)
        } else if (error.code === '42501') {
          console.log(`⚠️  ${table} - 權限被拒 (RLS 可能未正確配置)`)
          console.log(`   錯誤詳情: ${error.message}`)
        } else {
          console.log(`❌ ${table} - 錯誤: ${error.message} (code: ${error.code})`)
        }
      } else {
        console.log(`✅ ${table} - 表存在`)
      }
    }

    // 如果有登入用戶，嘗試查詢 customers
    if (user) {
      console.log('\n4️⃣ 測試查詢 customers 表')
      console.log('-'.repeat(60))

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .limit(5)

      if (error) {
        console.log('❌ 查詢失敗')
        console.log('錯誤碼:', error.code)
        console.log('錯誤訊息:', error.message)
        console.log('錯誤詳情:', error.details)
        console.log('錯誤提示:', error.hint)
        console.log('完整錯誤對象:', JSON.stringify(error, null, 2))
      } else {
        console.log('✅ 查詢成功')
        console.log('找到記錄數:', data?.length || 0)
        if (data && data.length > 0) {
          console.log('第一筆記錄:', JSON.stringify(data[0], null, 2))
        }
      }
    }

    // 檢查 RLS 策略
    console.log('\n5️⃣ RLS 策略建議')
    console.log('-'.repeat(60))
    console.log('如果看到權限錯誤，請執行以下操作：')
    console.log('1. 打開 Supabase Dashboard SQL Editor')
    console.log('2. 執行 supabase-migrations/000_drop_and_recreate.sql')
    console.log('3. 確認看到 "Schema recreated successfully!"')

    console.log('\n' + '='.repeat(60))
    console.log('診斷完成！')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ 診斷過程發生錯誤:', error)
  }
}

diagnose()
