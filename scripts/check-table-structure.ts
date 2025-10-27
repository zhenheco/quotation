#!/usr/bin/env tsx
/**
 * 檢查資料表結構
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 手動載入 .env.local
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

async function checkStructure() {
  console.log('🔍 檢查資料表結構\n')

  // 檢查 customers 表
  console.log('📋 Customers 表：')
  const { data: customers, error: customersError } = await supabaseAdmin
    .from('customers')
    .select('*')
    .limit(0)

  if (customersError) {
    console.log(`❌ 錯誤: ${customersError.message}\n`)
  } else {
    console.log('✅ 表存在\n')
  }

  // 檢查 products 表
  console.log('📋 Products 表：')
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('*')
    .limit(0)

  if (productsError) {
    console.log(`❌ 錯誤: ${productsError.message}\n`)
  } else {
    console.log('✅ 表存在\n')
  }

  // 檢查 RLS 策略
  console.log('🔐 檢查 RLS 策略（使用 anon key）：')
  const supabaseAnon = createClient(supabaseUrl, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  // 先登入
  const { data: signInData } = await supabaseAnon.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'TestPassword123!'
  })

  if (signInData.user) {
    console.log(`✅ 使用者登入成功 (${signInData.user.id})\n`)

    // 測試插入客戶
    console.log('測試插入客戶...')
    const { data: insertTest, error: insertError } = await supabaseAnon
      .from('customers')
      .insert({
        user_id: signInData.user.id,
        name: { zh: '測試', en: 'Test' },
        email: 'test@test.com'
      })
      .select()

    if (insertError) {
      console.log(`❌ 插入失敗: ${insertError.message}`)
      console.log(`   錯誤詳情: ${JSON.stringify(insertError, null, 2)}\n`)
    } else {
      console.log(`✅ 插入成功\n`)

      // 清理
      if (insertTest && insertTest.length > 0) {
        await supabaseAnon.from('customers').delete().eq('id', insertTest[0].id)
        console.log('✅ 測試資料已清理\n')
      }
    }
  }
}

checkStructure().catch(console.error)
