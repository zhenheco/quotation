#!/usr/bin/env tsx
/**
 * 使用 Service Key 測試（繞過 RLS）
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

async function testWithServiceKey() {
  console.log('🔧 使用 Service Key 測試（繞過 RLS）\n')

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const testUserId = '2934277f-2508-4fcf-b94c-4bac0d09f667'

  // 測試 customers
  console.log('📋 測試 1: 使用 Service Key 插入 customer')
  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .insert({
      user_id: testUserId,
      name: { zh: '測試客戶', en: 'Test Customer' },
      email: 'test-service@test.com'
    })
    .select()

  if (customerError) {
    console.log(`❌ 失敗: ${customerError.message}`)
    console.log(`   這表示表本身有問題，不是 RLS 的問題\n`)
  } else {
    console.log(`✅ 成功！ID: ${customer[0]?.id}`)
    console.log(`   這表示表沒問題，是 RLS 策略的問題\n`)

    // 清理
    if (customer[0]?.id) {
      await supabaseAdmin.from('customers').delete().eq('id', customer[0].id)
      console.log('✅ 已清理\n')
    }
  }

  // 測試 products
  console.log('📋 測試 2: 使用 Service Key 插入 product')
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .insert({
      user_id: testUserId,
      sku: 'TEST-SERVICE-001',
      name: { zh: '測試產品', en: 'Test Product' },
      unit_price: 100,
      currency: 'TWD'
    })
    .select()

  if (productError) {
    console.log(`❌ 失敗: ${productError.message}`)
    console.log(`   這表示表本身有問題\n`)
  } else {
    console.log(`✅ 成功！ID: ${product[0]?.id}`)
    console.log(`   這表示表沒問題，是 RLS 策略的問題\n`)

    // 清理
    if (product[0]?.id) {
      await supabaseAdmin.from('products').delete().eq('id', product[0].id)
      console.log('✅ 已清理\n')
    }
  }
}

testWithServiceKey().catch(console.error)
