#!/usr/bin/env tsx
/**
 * 測試 Supabase 認證流程
 *
 * 測試項目：
 * 1. 使用者註冊
 * 2. 使用者登入
 * 3. 取得當前使用者資訊
 * 4. 使用者登出
 * 5. Session 管理
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

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP' | 'INFO'
  message: string
  details?: any
}

const results: TestResult[] = []

// 測試用的使用者資料
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: '測試使用者'
}

async function runAuthTests() {
  console.log('🔐 開始測試 Supabase 認證流程...\n')
  console.log(`測試帳號: ${testUser.email}\n`)

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 測試 1: 使用者註冊
  console.log('📋 測試 1: 使用者註冊')
  try {
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
      results.push({
        name: '使用者註冊',
        status: 'FAIL',
        message: '註冊失敗',
        details: signUpError
      })
      console.log(`❌ 註冊失敗: ${signUpError.message}\n`)
    } else if (signUpData.user) {
      results.push({
        name: '使用者註冊',
        status: 'PASS',
        message: '註冊成功',
        details: {
          userId: signUpData.user.id,
          email: signUpData.user.email,
          confirmationRequired: !signUpData.user.confirmed_at
        }
      })
      console.log('✅ 註冊成功')
      console.log(`   使用者 ID: ${signUpData.user.id}`)
      console.log(`   Email: ${signUpData.user.email}`)

      if (!signUpData.user.confirmed_at) {
        results.push({
          name: 'Email 確認狀態',
          status: 'INFO',
          message: '需要 Email 確認',
          details: {
            note: 'Supabase 可能要求 Email 確認。在開發環境中，可以在 Dashboard 關閉此要求。'
          }
        })
        console.log('   ⚠️  注意: 此帳號可能需要 Email 確認')
        console.log('   💡 開發提示: 在 Supabase Dashboard > Authentication > Settings 中')
        console.log('      可以關閉 "Enable email confirmations" 以便測試\n')
      } else {
        console.log('   ✅ Email 已確認\n')
      }
    }
  } catch (error: any) {
    results.push({
      name: '使用者註冊',
      status: 'FAIL',
      message: '註冊過程發生錯誤',
      details: error.message
    })
    console.log(`❌ 錯誤: ${error.message}\n`)
    return
  }

  // 等待一下，確保註冊完成
  await new Promise(resolve => setTimeout(resolve, 1000))

  // 測試 2: 使用者登入
  console.log('📋 測試 2: 使用者登入')
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    })

    if (signInError) {
      results.push({
        name: '使用者登入',
        status: 'FAIL',
        message: '登入失敗',
        details: signInError
      })
      console.log(`❌ 登入失敗: ${signInError.message}`)

      if (signInError.message.includes('Email not confirmed')) {
        console.log('   💡 提示: Email 未確認。請在 Supabase Dashboard 中確認使用者或關閉 Email 確認要求\n')
      }
    } else if (signInData.user && signInData.session) {
      results.push({
        name: '使用者登入',
        status: 'PASS',
        message: '登入成功',
        details: {
          userId: signInData.user.id,
          sessionId: signInData.session.access_token.substring(0, 20) + '...',
          expiresAt: new Date(signInData.session.expires_at! * 1000).toLocaleString('zh-TW')
        }
      })
      console.log('✅ 登入成功')
      console.log(`   使用者 ID: ${signInData.user.id}`)
      console.log(`   Session 到期時間: ${new Date(signInData.session.expires_at! * 1000).toLocaleString('zh-TW')}\n`)
    }
  } catch (error: any) {
    results.push({
      name: '使用者登入',
      status: 'FAIL',
      message: '登入過程發生錯誤',
      details: error.message
    })
    console.log(`❌ 錯誤: ${error.message}\n`)
  }

  // 測試 3: 取得當前使用者
  console.log('📋 測試 3: 取得當前使用者資訊')
  try {
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()

    if (getUserError) {
      results.push({
        name: '取得當前使用者',
        status: 'FAIL',
        message: '取得使用者失敗',
        details: getUserError
      })
      console.log(`❌ 取得使用者失敗: ${getUserError.message}\n`)
    } else if (user) {
      results.push({
        name: '取得當前使用者',
        status: 'PASS',
        message: '成功取得使用者資訊',
        details: {
          id: user.id,
          email: user.email,
          metadata: user.user_metadata
        }
      })
      console.log('✅ 成功取得使用者資訊')
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   名稱: ${user.user_metadata?.name || '未設定'}\n`)
    } else {
      results.push({
        name: '取得當前使用者',
        status: 'FAIL',
        message: '無使用者資訊',
        details: { note: '可能未登入或 session 已過期' }
      })
      console.log('❌ 無使用者資訊（未登入或 session 已過期）\n')
    }
  } catch (error: any) {
    results.push({
      name: '取得當前使用者',
      status: 'FAIL',
      message: '過程發生錯誤',
      details: error.message
    })
    console.log(`❌ 錯誤: ${error.message}\n`)
  }

  // 測試 4: Session 管理
  console.log('📋 測試 4: Session 管理')
  try {
    const { data: { session }, error: getSessionError } = await supabase.auth.getSession()

    if (getSessionError) {
      results.push({
        name: 'Session 管理',
        status: 'FAIL',
        message: '取得 Session 失敗',
        details: getSessionError
      })
      console.log(`❌ 取得 Session 失敗: ${getSessionError.message}\n`)
    } else if (session) {
      results.push({
        name: 'Session 管理',
        status: 'PASS',
        message: 'Session 存在且有效',
        details: {
          accessToken: session.access_token.substring(0, 20) + '...',
          refreshToken: session.refresh_token.substring(0, 20) + '...',
          expiresAt: new Date(session.expires_at! * 1000).toLocaleString('zh-TW')
        }
      })
      console.log('✅ Session 存在且有效')
      console.log(`   到期時間: ${new Date(session.expires_at! * 1000).toLocaleString('zh-TW')}\n`)
    } else {
      results.push({
        name: 'Session 管理',
        status: 'FAIL',
        message: '無有效 Session',
        details: { note: '可能未登入' }
      })
      console.log('❌ 無有效 Session\n')
    }
  } catch (error: any) {
    results.push({
      name: 'Session 管理',
      status: 'FAIL',
      message: '過程發生錯誤',
      details: error.message
    })
    console.log(`❌ 錯誤: ${error.message}\n`)
  }

  // 測試 5: 使用者登出
  console.log('📋 測試 5: 使用者登出')
  try {
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      results.push({
        name: '使用者登出',
        status: 'FAIL',
        message: '登出失敗',
        details: signOutError
      })
      console.log(`❌ 登出失敗: ${signOutError.message}\n`)
    } else {
      results.push({
        name: '使用者登出',
        status: 'PASS',
        message: '登出成功'
      })
      console.log('✅ 登出成功\n')

      // 驗證登出後無法取得使用者
      const { data: { user: userAfterLogout } } = await supabase.auth.getUser()
      if (!userAfterLogout) {
        results.push({
          name: '登出驗證',
          status: 'PASS',
          message: '登出後確實無法取得使用者資訊'
        })
        console.log('✅ 驗證: 登出後確實無使用者 Session\n')
      }
    }
  } catch (error: any) {
    results.push({
      name: '使用者登出',
      status: 'FAIL',
      message: '登出過程發生錯誤',
      details: error.message
    })
    console.log(`❌ 錯誤: ${error.message}\n`)
  }

  // 輸出測試結果摘要
  console.log('\n' + '='.repeat(60))
  console.log('📊 認證測試結果摘要')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length
  const info = results.filter(r => r.status === 'INFO').length

  console.log(`\n總測試數: ${results.length}`)
  console.log(`✅ 通過: ${passed}`)
  console.log(`❌ 失敗: ${failed}`)
  console.log(`⚠️  跳過: ${skipped}`)
  console.log(`ℹ️  資訊: ${info}`)
  console.log(`\n成功率: ${((passed / (results.length - info)) * 100).toFixed(1)}%\n`)

  // 詳細結果
  console.log('='.repeat(60))
  console.log('📝 詳細結果')
  console.log('='.repeat(60))
  results.forEach((result, index) => {
    const icon =
      result.status === 'PASS' ? '✅' :
      result.status === 'FAIL' ? '❌' :
      result.status === 'INFO' ? 'ℹ️' : '⚠️'
    console.log(`\n${index + 1}. ${icon} ${result.name}`)
    console.log(`   狀態: ${result.status}`)
    console.log(`   訊息: ${result.message}`)
    if (result.details) {
      console.log(`   詳情: ${JSON.stringify(result.details, null, 2)}`)
    }
  })

  // 最終判斷
  console.log('\n' + '='.repeat(60))
  if (failed === 0) {
    console.log('🎉 所有認證測試通過！認證系統運作正常！')
  } else if (failed === 1 && results.some(r => r.details?.note?.includes('Email 確認'))) {
    console.log('⚠️  部分測試因 Email 確認要求而失敗')
    console.log('💡 建議: 在 Supabase Dashboard 關閉 Email 確認以便開發測試')
  } else {
    console.log('⚠️  發現問題，需要進一步檢查')
  }
  console.log('='.repeat(60) + '\n')

  console.log('💡 後續清理建議:')
  console.log(`   可在 Supabase Dashboard > Authentication > Users 中刪除測試帳號`)
  console.log(`   Email: ${testUser.email}\n`)
}

// 執行測試
runAuthTests().catch(console.error)
