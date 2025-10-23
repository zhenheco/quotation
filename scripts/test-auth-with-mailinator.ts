#!/usr/bin/env tsx
/**
 * 使用 Mailinator 測試 Supabase 認證流程
 *
 * Mailinator 是免費的測試 Email 服務，無需註冊
 * 收信網址：https://www.mailinator.com/
 *
 * 使用方式：
 * 1. 執行此腳本
 * 2. 前往 https://www.mailinator.com/
 * 3. 輸入腳本顯示的 Email 前綴（去掉 @mailinator.com）
 * 4. 查看確認郵件並點擊連結（如果需要）
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
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 使用 Mailinator 作為測試 Email
const timestamp = Date.now()
const testUser = {
  email: `quotation-test-${timestamp}@mailinator.com`,
  password: 'TestPassword123!',
  name: '測試使用者'
}

async function runAuthTestWithMailinator() {
  console.log('🔐 使用 Mailinator 測試 Supabase 認證流程\n')
  console.log('=' .repeat(60))
  console.log('📧 測試 Email 資訊')
  console.log('='.repeat(60))
  console.log(`Email: ${testUser.email}`)
  console.log(`密碼: ${testUser.password}`)
  console.log(`\n📬 收信方式：`)
  console.log(`1. 前往：https://www.mailinator.com/`)
  console.log(`2. 輸入：quotation-test-${timestamp}`)
  console.log(`3. 查看確認郵件（如果需要）\n`)
  console.log('='.repeat(60) + '\n')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 測試 1: 註冊
  console.log('📋 步驟 1: 註冊新使用者...')
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testUser.email,
    password: testUser.password,
    options: {
      data: {
        name: testUser.name
      }
    }
  })

  if (signUpError) {
    console.log(`❌ 註冊失敗: ${signUpError.message}`)
    console.log(`\n錯誤詳情:`)
    console.log(JSON.stringify(signUpError, null, 2))
    return
  }

  if (signUpData.user) {
    console.log('✅ 註冊成功！')
    console.log(`   使用者 ID: ${signUpData.user.id}`)
    console.log(`   Email: ${signUpData.user.email}`)

    if (!signUpData.user.confirmed_at) {
      console.log(`\n⚠️  Email 需要確認`)
      console.log(`\n請執行以下步驟：`)
      console.log(`1. 前往 https://www.mailinator.com/`)
      console.log(`2. 輸入收件匣名稱: quotation-test-${timestamp}`)
      console.log(`3. 點擊確認郵件中的連結`)
      console.log(`4. 確認後重新執行登入測試\n`)
      console.log(`或者，在 Supabase Dashboard > Authentication > Users 中`)
      console.log(`手動確認使用者或關閉 Email 確認要求\n`)
    } else {
      console.log(`   ✅ Email 已確認`)
    }
  }

  // 等待一下
  console.log('\n等待 2 秒...\n')
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 測試 2: 登入
  console.log('📋 步驟 2: 嘗試登入...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testUser.email,
    password: testUser.password
  })

  if (signInError) {
    console.log(`❌ 登入失敗: ${signInError.message}`)

    if (signInError.message.includes('Email not confirmed')) {
      console.log(`\n💡 原因: Email 尚未確認`)
      console.log(`\n解決方案：`)
      console.log(`選項 1: 前往 Mailinator 確認 Email`)
      console.log(`選項 2: 在 Supabase Dashboard 手動確認使用者`)
      console.log(`選項 3: 關閉 Email 確認要求（Authentication > Settings）\n`)
    }
    return
  }

  if (signInData.user && signInData.session) {
    console.log('✅ 登入成功！')
    console.log(`   使用者 ID: ${signInData.user.id}`)
    console.log(`   Session 到期: ${new Date(signInData.session.expires_at! * 1000).toLocaleString('zh-TW')}`)

    // 測試 3: 取得使用者資訊
    console.log('\n📋 步驟 3: 取得使用者資訊...')
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      console.log('✅ 成功取得使用者資訊')
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   名稱: ${user.user_metadata?.name || '未設定'}`)
    }

    // 測試 4: 登出
    console.log('\n📋 步驟 4: 登出...')
    await supabase.auth.signOut()
    console.log('✅ 登出成功')

    const { data: { user: afterLogout } } = await supabase.auth.getUser()
    if (!afterLogout) {
      console.log('✅ 驗證: Session 已清除\n')
    }

    console.log('='.repeat(60))
    console.log('🎉 所有認證流程測試完成！')
    console.log('='.repeat(60))
  }

  console.log(`\n💡 測試帳號資訊（供後續測試使用）：`)
  console.log(`Email: ${testUser.email}`)
  console.log(`密碼: ${testUser.password}`)
  console.log(`\n如需刪除測試帳號，請前往：`)
  console.log(`Supabase Dashboard > Authentication > Users\n`)
}

// 執行測試
runAuthTestWithMailinator().catch(console.error)
