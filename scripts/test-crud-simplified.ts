#!/usr/bin/env tsx
/**
 * 簡化版 CRUD 測試 - 使用正確的 schema
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
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function runSimplifiedTest() {
  console.log('🧪 簡化版 CRUD 測試\n')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 登入
  console.log('📋 步驟 1: 登入')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'TestPassword123!'
  })

  if (signInError || !signInData.user) {
    console.log(`❌ 登入失敗: ${signInError?.message}\n`)
    return
  }

  console.log(`✅ 登入成功 (${signInData.user.id})\n`)

  // 測試 customers - 使用最簡單的欄位
  console.log('📋 步驟 2: 測試 customers 插入')
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      user_id: signInData.user.id,
      name: { zh: '測試客戶', en: 'Test Customer' },
      email: 'test@test.com'
    })
    .select()

  if (customerError) {
    console.log(`❌ 插入失敗: ${customerError.message}`)
    console.log(`   Code: ${customerError.code}`)
    console.log(`   詳情: ${JSON.stringify(customerError, null, 2)}\n`)
  } else {
    console.log(`✅ customers 插入成功！`)
    console.log(`   ID: ${customer[0]?.id}\n`)

    // 清理
    if (customer[0]?.id) {
      await supabase.from('customers').delete().eq('id', customer[0].id)
      console.log('✅ 測試資料已清理\n')
    }
  }

  // 測試 products - 使用正確的欄位名稱
  console.log('📋 步驟 3: 測試 products 插入')
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      user_id: signInData.user.id,
      sku: 'TEST-001',
      name: { zh: '測試產品', en: 'Test Product' },
      unit_price: 100,
      currency: 'TWD'
    })
    .select()

  if (productError) {
    console.log(`❌ 插入失敗: ${productError.message}`)
    console.log(`   Code: ${productError.code}`)
    console.log(`   詳情: ${JSON.stringify(productError, null, 2)}\n`)
  } else {
    console.log(`✅ products 插入成功！`)
    console.log(`   ID: ${product[0]?.id}\n`)

    // 清理
    if (product[0]?.id) {
      await supabase.from('products').delete().eq('id', product[0].id)
      console.log('✅ 測試資料已清理\n')
    }
  }

  // 登出
  await supabase.auth.signOut()
  console.log('✅ 已登出\n')
}

runSimplifiedTest().catch(console.error)
