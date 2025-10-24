#!/usr/bin/env tsx

/**
 * ============================================================
 * 使用者資料系統測試腳本
 * ============================================================
 * 測試範圍：
 * 1. 使用者資料 CRUD (user_profiles)
 * 2. 欄位驗證（UNIQUE、預設值、時間戳記）
 * 3. 資料完整性
 *
 * 預期測試數量：11 個
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ============================================================
// 環境設定
// ============================================================

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
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 環境變數')
  process.exit(1)
}

// ============================================================
// 測試狀態追蹤
// ============================================================

interface TestResult {
  category: string
  name: string
  passed: boolean
  error?: string
  duration?: number
}

const results: TestResult[] = []
let testUserId: string = ''
let testProfileId: string = ''

function addResult(category: string, name: string, passed: boolean, error?: any, duration?: number) {
  // 處理錯誤訊息
  let errorMessage = ''
  if (error) {
    if (typeof error === 'string') {
      errorMessage = error
    } else if (error.message) {
      errorMessage = error.message
    } else {
      errorMessage = JSON.stringify(error)
    }
  }

  results.push({ category, name, passed, error: errorMessage, duration })
  const status = passed ? '✅' : '❌'
  const time = duration ? ` (${duration}ms)` : ''
  console.log(`${status} ${category} - ${name}${time}`)
  if (errorMessage && !passed) {
    console.log(`   錯誤: ${errorMessage}`)
  }
}

// ============================================================
// 測試工具函數
// ============================================================

async function runTest(
  category: string,
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now()
  try {
    await testFn()
    const duration = Date.now() - startTime
    addResult(category, name, true, undefined, duration)
  } catch (error) {
    const duration = Date.now() - startTime
    addResult(category, name, false, error, duration)
  }
}

// ============================================================
// 主測試流程
// ============================================================

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('使用者資料系統測試')
  console.log('='.repeat(60) + '\n')

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ========================================
  // 分類 1: 認證與初始化 (1 test)
  // ========================================
  console.log('\n📋 分類 1: 認證與初始化\n')

  await runTest('認證與初始化', '使用者認證', async () => {
    // 使用已存在的測試帳號
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'TestPassword123!'
    })

    if (signInError) throw signInError
    if (!signInData.user) throw new Error('登入失敗：無使用者資料')

    testUserId = signInData.user.id
  })

  // ========================================
  // 分類 2: 使用者資料 CRUD (4 tests)
  // ========================================
  console.log('\n📋 分類 2: 使用者資料 CRUD\n')

  await runTest('使用者資料 CRUD', '建立使用者資料', async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: testUserId,
        full_name: '測試使用者',
        display_name: 'Test User',
        phone: '+886-912-345-678',
        department: '技術部',
        avatar_url: 'https://example.com/avatar.jpg'
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('建立使用者資料失敗')

    testProfileId = data.id

    // 驗證資料
    if (data.full_name !== '測試使用者') {
      throw new Error('full_name 不符合預期')
    }
    if (data.is_active !== true) {
      throw new Error('is_active 預設值應該是 true')
    }
  })

  await runTest('使用者資料 CRUD', '讀取使用者資料', async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', testUserId)
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 驗證資料完整性
    if (data.full_name !== '測試使用者') {
      throw new Error('資料不符合預期')
    }
    if (data.department !== '技術部') {
      throw new Error('department 資料錯誤')
    }
  })

  await runTest('使用者資料 CRUD', '更新使用者資料', async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        display_name: 'Updated User',
        department: '產品部',
        phone: '+886-987-654-321'
      })
      .eq('id', testProfileId)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('更新失敗')

    // 驗證更新
    if (data.display_name !== 'Updated User') {
      throw new Error('display_name 更新失敗')
    }
    if (data.department !== '產品部') {
      throw new Error('department 更新失敗')
    }
  })

  await runTest('使用者資料 CRUD', '更新 last_login_at', async () => {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        last_login_at: now
      })
      .eq('id', testProfileId)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('更新失敗')

    // 驗證 last_login_at 已設定
    if (!data.last_login_at) {
      throw new Error('last_login_at 未設定')
    }
  })

  // ========================================
  // 分類 3: 欄位驗證 (4 tests)
  // ========================================
  console.log('\n📋 分類 3: 欄位驗證\n')

  await runTest('欄位驗證', '驗證 user_id UNIQUE 約束', async () => {
    // 嘗試插入相同的 user_id，應該要失敗
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: testUserId, // 相同的 user_id
        full_name: '重複使用者'
      })

    if (!error) {
      throw new Error('應該要拋出 UNIQUE 約束錯誤，但沒有')
    }

    // 驗證錯誤訊息包含 unique 或 duplicate
    if (!error.message.toLowerCase().includes('unique') &&
        !error.message.toLowerCase().includes('duplicate')) {
      throw new Error(`錯誤訊息不符合預期: ${error.message}`)
    }
  })

  await runTest('欄位驗證', '驗證 is_active 預設值', async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', testProfileId)
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 驗證 is_active 預設為 true
    if (data.is_active !== true) {
      throw new Error(`is_active 應該是 true，實際是 ${data.is_active}`)
    }
  })

  await runTest('欄位驗證', '驗證時間戳記自動設定', async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', testProfileId)
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 驗證 created_at 存在
    if (!data.created_at) {
      throw new Error('created_at 未設定')
    }

    // 驗證 updated_at 存在
    if (!data.updated_at) {
      throw new Error('updated_at 未設定')
    }

    // 驗證時間格式
    const createdAt = new Date(data.created_at)
    const updatedAt = new Date(data.updated_at)

    if (isNaN(createdAt.getTime())) {
      throw new Error('created_at 格式錯誤')
    }
    if (isNaN(updatedAt.getTime())) {
      throw new Error('updated_at 格式錯誤')
    }
  })

  await runTest('欄位驗證', '測試 is_active 切換', async () => {
    // 設定為 false
    const { data: deactivated, error: error1 } = await supabase
      .from('user_profiles')
      .update({ is_active: false })
      .eq('id', testProfileId)
      .select()
      .single()

    if (error1) throw error1
    if (deactivated?.is_active !== false) {
      throw new Error('設定 is_active = false 失敗')
    }

    // 設定回 true
    const { data: activated, error: error2 } = await supabase
      .from('user_profiles')
      .update({ is_active: true })
      .eq('id', testProfileId)
      .select()
      .single()

    if (error2) throw error2
    if (activated?.is_active !== true) {
      throw new Error('設定 is_active = true 失敗')
    }
  })

  // ========================================
  // 分類 4: 進階查詢 (2 tests)
  // ========================================
  console.log('\n📋 分類 4: 進階查詢\n')

  await runTest('進階查詢', '按 department 查詢', async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('department', '產品部')

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('查詢結果為空')
    }

    // 驗證查詢結果包含我們的測試資料
    const found = data.some(profile => profile.id === testProfileId)
    if (!found) {
      throw new Error('未找到測試資料')
    }
  })

  await runTest('進階查詢', '按 is_active 過濾', async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', true)

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('查詢結果為空')
    }

    // 驗證所有結果的 is_active 都是 true
    const allActive = data.every(profile => profile.is_active === true)
    if (!allActive) {
      throw new Error('查詢結果包含非 active 的資料')
    }
  })

  // ========================================
  // 分類 5: 清理測試資料 (1 test)
  // ========================================
  console.log('\n📋 分類 5: 清理測試資料\n')

  await runTest('清理測試資料', '刪除測試資料', async () => {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', testProfileId)

    if (error) throw error

    // 驗證刪除成功
    const { data: remaining } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', testProfileId)

    if (remaining && remaining.length > 0) {
      throw new Error('刪除失敗，資料仍然存在')
    }
  })

  // ========================================
  // 測試結果統計
  // ========================================
  console.log('\n' + '='.repeat(60))
  console.log('測試結果統計')
  console.log('='.repeat(60) + '\n')

  const totalTests = results.length
  const passedTests = results.filter(r => r.passed).length
  const failedTests = results.filter(r => !r.passed).length
  const successRate = ((passedTests / totalTests) * 100).toFixed(1)

  console.log(`總測試數: ${totalTests}`)
  console.log(`✅ 通過: ${passedTests}`)
  console.log(`❌ 失敗: ${failedTests}`)
  console.log(`成功率: ${successRate}%`)

  // 按分類顯示結果
  console.log('\n' + '-'.repeat(60))
  console.log('各分類測試結果')
  console.log('-'.repeat(60) + '\n')

  const categories = [...new Set(results.map(r => r.category))]
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category)
    const categoryPassed = categoryResults.filter(r => r.passed).length
    const categoryTotal = categoryResults.length
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1)

    console.log(`📂 ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`)
    categoryResults.forEach(r => {
      const status = r.passed ? '✅' : '❌'
      console.log(`   ${status} ${r.name}`)
      if (r.error && !r.passed) {
        console.log(`      錯誤: ${r.error}`)
      }
    })
    console.log()
  })

  // 失敗測試詳情
  if (failedTests > 0) {
    console.log('\n' + '-'.repeat(60))
    console.log('失敗測試詳情')
    console.log('-'.repeat(60) + '\n')

    results.filter(r => !r.passed).forEach((r, index) => {
      console.log(`${index + 1}. ${r.category} - ${r.name}`)
      console.log(`   錯誤: ${r.error}`)
      console.log()
    })
  }

  // ========================================
  // 退出並返回狀態碼
  // ========================================
  if (failedTests > 0) {
    console.log('❌ 測試未完全通過\n')
    process.exit(1)
  } else {
    console.log('✅ 所有測試通過！\n')
    process.exit(0)
  }
}

// ============================================================
// 執行測試
// ============================================================

main().catch(error => {
  console.error('\n❌ 測試執行失敗:', error)
  process.exit(1)
})
