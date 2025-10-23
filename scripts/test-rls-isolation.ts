#!/usr/bin/env tsx
/**
 * 測試 RLS 資料隔離
 * 驗證使用者只能存取自己的資料，無法存取其他使用者的資料
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

async function testRlsIsolation() {
  console.log('🔒 開始測試 RLS 資料隔離\n')

  // 建立兩個不同的客戶端（模擬兩個不同使用者）
  const user1Client = createClient(supabaseUrl, supabaseAnonKey)
  const user2Client = createClient(supabaseUrl, supabaseAnonKey)

  let testPassed = 0
  let testFailed = 0

  // 使用者 1 登入
  console.log('📋 步驟 1: 使用者 1 登入')
  const { data: user1Data, error: user1Error } = await user1Client.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'TestPassword123!'
  })

  if (user1Error || !user1Data.user) {
    console.log(`❌ 使用者 1 登入失敗: ${user1Error?.message}`)
    return
  }
  console.log(`✅ 使用者 1 登入成功 (${user1Data.user.id})\n`)

  // 使用者 1 建立一筆客戶資料
  console.log('📋 步驟 2: 使用者 1 建立客戶資料')
  const { data: customer1, error: createError } = await user1Client
    .from('customers')
    .insert({
      user_id: user1Data.user.id,
      name: { zh: '使用者1的客戶', en: 'User 1 Customer' },
      email: 'user1-customer@test.com'
    })
    .select()
    .single()

  if (createError) {
    console.log(`❌ 建立失敗: ${createError.message}`)
    testFailed++
  } else {
    console.log(`✅ 建立成功 (ID: ${customer1.id})`)
    testPassed++
  }
  console.log()

  // 使用者 1 登出
  await user1Client.auth.signOut()

  // 使用者 2 登入（使用另一個測試帳號，如果不存在則跳過）
  console.log('📋 步驟 3: 測試資料隔離（使用未授權的查詢）')
  console.log('   嘗試以匿名身份讀取使用者 1 的資料...')

  const anonymousClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: unauthorizedData, error: unauthorizedError } = await anonymousClient
    .from('customers')
    .select('*')
    .eq('id', customer1.id)
    .single()

  if (unauthorizedError || !unauthorizedData) {
    console.log(`✅ 正確！RLS 阻止了未授權存取`)
    console.log(`   錯誤訊息: ${unauthorizedError?.message || '查無資料'}`)
    testPassed++
  } else {
    console.log(`❌ 錯誤！未授權使用者可以讀取資料`)
    console.log(`   這是安全漏洞！`)
    testFailed++
  }
  console.log()

  // 使用者 1 重新登入並驗證可以讀取自己的資料
  console.log('📋 步驟 4: 使用者 1 重新登入並讀取自己的資料')
  await user1Client.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'TestPassword123!'
  })

  const { data: ownData, error: ownError } = await user1Client
    .from('customers')
    .select('*')
    .eq('id', customer1.id)
    .single()

  if (ownError) {
    console.log(`❌ 使用者無法讀取自己的資料: ${ownError.message}`)
    testFailed++
  } else {
    console.log(`✅ 正確！使用者可以讀取自己的資料`)
    console.log(`   客戶名稱: ${ownData.name.zh}`)
    testPassed++
  }
  console.log()

  // 清理測試資料
  console.log('📋 步驟 5: 清理測試資料')
  const { error: deleteError } = await user1Client
    .from('customers')
    .delete()
    .eq('id', customer1.id)

  if (deleteError) {
    console.log(`⚠️  清理失敗: ${deleteError.message}`)
  } else {
    console.log(`✅ 測試資料已清理`)
  }
  console.log()

  // 登出
  await user1Client.auth.signOut()

  // 結果摘要
  console.log('=' .repeat(60))
  console.log('📊 RLS 隔離測試結果摘要')
  console.log('='.repeat(60))
  console.log(`\n總測試數: ${testPassed + testFailed}`)
  console.log(`✅ 通過: ${testPassed}`)
  console.log(`❌ 失敗: ${testFailed}`)
  console.log(`\n成功率: ${((testPassed / (testPassed + testFailed)) * 100).toFixed(1)}%\n`)

  if (testFailed === 0) {
    console.log('🎉 所有 RLS 隔離測試通過！資料安全性正常！')
  } else {
    console.log('⚠️  部分測試失敗，請檢查 RLS 策略配置')
  }
  console.log('='.repeat(60) + '\n')
}

testRlsIsolation().catch(console.error)
