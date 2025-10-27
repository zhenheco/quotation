#!/usr/bin/env tsx
/**
 * 自動建立測試使用者（使用 Service Role Key）
 *
 * 此腳本使用 Supabase Admin API 建立測試使用者
 * 使用者會自動確認，無需 Email 驗證
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

if (!supabaseServiceKey) {
  console.log('❌ 錯誤：找不到 SUPABASE_SERVICE_ROLE_KEY')
  console.log('請確認 .env.local 中有設定 SUPABASE_SERVICE_ROLE_KEY\n')
  process.exit(1)
}

const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: '測試使用者'
}

async function createTestUser() {
  console.log('🔧 使用 Service Role Key 建立測試使用者\n')

  // 使用 Service Role Key 建立 admin 客戶端
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('📋 測試使用者資訊：')
  console.log(`   Email: ${testUser.email}`)
  console.log(`   密碼: ${testUser.password}`)
  console.log(`   名稱: ${testUser.name}\n`)

  // 先檢查使用者是否已存在
  console.log('🔍 檢查使用者是否已存在...')
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    console.log(`❌ 查詢使用者失敗: ${listError.message}\n`)
    return
  }

  const existingUser = existingUsers.users.find(u => u.email === testUser.email)

  if (existingUser) {
    console.log(`✅ 使用者已存在`)
    console.log(`   User ID: ${existingUser.id}`)
    console.log(`   Email: ${existingUser.email}`)
    console.log(`   建立時間: ${new Date(existingUser.created_at).toLocaleString('zh-TW')}`)
    console.log(`   Email 確認: ${existingUser.email_confirmed_at ? '✅ 已確認' : '❌ 未確認'}\n`)

    // 如果 Email 未確認，更新為已確認
    if (!existingUser.email_confirmed_at) {
      console.log('🔄 更新使用者為已確認狀態...')
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { email_confirm: true }
      )

      if (updateError) {
        console.log(`❌ 更新失敗: ${updateError.message}\n`)
      } else {
        console.log('✅ 使用者已更新為已確認狀態\n')
      }
    }

    console.log('💡 可以直接使用此帳號進行測試：')
    console.log(`   npx tsx scripts/test-crud-operations.ts ${testUser.email} ${testUser.password}\n`)
    return existingUser
  }

  // 建立新使用者
  console.log('🔨 建立新使用者...')
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testUser.email,
    password: testUser.password,
    email_confirm: true, // 自動確認 Email
    user_metadata: {
      name: testUser.name
    }
  })

  if (createError) {
    console.log(`❌ 建立失敗: ${createError.message}\n`)
    return
  }

  if (newUser.user) {
    console.log('✅ 測試使用者建立成功！')
    console.log(`   User ID: ${newUser.user.id}`)
    console.log(`   Email: ${newUser.user.email}`)
    console.log(`   Email 確認: ${newUser.user.email_confirmed_at ? '✅ 已確認' : '❌ 未確認'}`)
    console.log(`   建立時間: ${new Date(newUser.user.created_at).toLocaleString('zh-TW')}\n`)

    console.log('🎉 測試帳號已就緒！\n')
    console.log('下一步：執行 CRUD 測試')
    console.log(`npx tsx scripts/test-crud-operations.ts ${testUser.email} ${testUser.password}\n`)

    return newUser.user
  }
}

// 執行
createTestUser().catch(console.error)
