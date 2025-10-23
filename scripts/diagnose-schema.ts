#!/usr/bin/env tsx
/**
 * 診斷 Schema 問題
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function diagnose() {
  console.log('🔍 診斷資料庫 Schema\n')

  // 1. 檢查 products 表的欄位
  console.log('📋 檢查 products 表結構...')
  const { data: columns, error: columnsError } = await supabaseAdmin
    .rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'products'
        ORDER BY ordinal_position;
      `
    })

  if (columnsError) {
    console.log('嘗試使用備用方法...\n')

    // 使用 service key 直接查詢
    const { data: testData, error: testError } = await supabaseAdmin
      .from('products')
      .select('*')
      .limit(0)

    if (testError) {
      console.log(`❌ 錯誤: ${testError.message}\n`)
    } else {
      console.log('✅ products 表存在，但無法直接查看結構\n')
    }
  }

  // 2. 檢查 RLS 策略
  console.log('🔐 檢查 RLS 策略...')
  const { data: policies, error: policiesError } = await supabaseAdmin
    .rpc('exec_sql', {
      sql: `
        SELECT
          tablename,
          policyname,
          permissive,
          roles,
          cmd
        FROM pg_policies
        WHERE tablename IN ('customers', 'products')
        ORDER BY tablename, cmd;
      `
    })

  if (policiesError) {
    console.log(`無法使用 exec_sql: ${policiesError.message}\n`)
  }

  // 3. 測試直接插入（使用 service key）
  console.log('🧪 測試直接插入（使用 service key）...')

  const testUserId = '2934277f-2508-4fcf-b94c-4bac0d09f667'

  const { data: insertData, error: insertError } = await supabaseAdmin
    .from('customers')
    .insert({
      user_id: testUserId,
      name: { zh: '測試客戶', en: 'Test Customer' },
      email: 'test-customer@test.com'
    })
    .select()

  if (insertError) {
    console.log(`❌ 插入失敗: ${insertError.message}`)
    console.log(`   詳情: ${JSON.stringify(insertError, null, 2)}\n`)
  } else {
    console.log(`✅ 使用 service key 插入成功！`)
    console.log(`   這表示表結構正確，但 RLS 策略有問題\n`)

    // 清理
    if (insertData && insertData.length > 0) {
      await supabaseAdmin.from('customers').delete().eq('id', insertData[0].id)
      console.log('✅ 測試資料已清理\n')
    }
  }

  // 4. 測試 products 插入
  console.log('🧪 測試 products 插入...')
  const { data: productData, error: productError } = await supabaseAdmin
    .from('products')
    .insert({
      user_id: testUserId,
      name: { zh: '測試產品', en: 'Test Product' },
      sku: 'TEST-001',
      unit: '個',
      unit_price_twd: 100
    })
    .select()

  if (productError) {
    console.log(`❌ 插入失敗: ${productError.message}`)
    console.log(`\n這表示 products 表缺少某些欄位`)
    console.log(`需要的欄位可能包括: cost_price_twd, category, description 等\n`)
  } else {
    console.log(`✅ 使用 service key 插入成功！\n`)

    // 清理
    if (productData && productData.length > 0) {
      await supabaseAdmin.from('products').delete().eq('id', productData[0].id)
      console.log('✅ 測試資料已清理\n')
    }
  }
}

diagnose().catch(console.error)
