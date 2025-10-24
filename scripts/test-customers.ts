#!/usr/bin/env tsx

/**
 * ============================================================
 * 客戶管理系統測試腳本
 * ============================================================
 * 測試範圍：
 * 1. 客戶 CRUD 操作
 * 2. JSONB 欄位功能（name, address, contact_person）
 * 3. 資料驗證
 * 4. 索引查詢
 *
 * 預期測試數量：9 個
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
let testCustomerId: string = ''

function addResult(category: string, name: string, passed: boolean, error?: any, duration?: number) {
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
  console.log('客戶管理系統測試')
  console.log('='.repeat(60) + '\n')

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ========================================
  // 分類 1: 認證與初始化 (1 test)
  // ========================================
  console.log('\n📋 分類 1: 認證與初始化\n')

  await runTest('認證與初始化', '使用者認證', async () => {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'TestPassword123!'
    })

    if (signInError) throw signInError
    if (!signInData.user) throw new Error('登入失敗：無使用者資料')

    testUserId = signInData.user.id
  })

  // ========================================
  // 分類 2: 客戶 CRUD (4 tests)
  // ========================================
  console.log('\n📋 分類 2: 客戶 CRUD\n')

  await runTest('客戶 CRUD', '建立客戶（包含 JSONB 欄位）', async () => {
    const timestamp = Date.now()

    const { data, error } = await supabase
      .from('customers')
      .insert({
        user_id: testUserId,
        name: {
          zh: '測試科技公司',
          en: 'Test Tech Co.'
        },
        email: `test-customer-${timestamp}@example.com`,
        phone: '+886-2-1234-5678',
        address: {
          zh: '台北市信義區信義路五段7號',
          en: '7 Xinyi Rd., Xinyi Dist., Taipei City'
        },
        tax_id: '12345678',
        contact_person: {
          name: '王小明',
          title: '採購經理',
          phone: '+886-912-345-678',
          email: 'wang@test.com'
        }
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('建立客戶失敗')

    testCustomerId = data.id

    // 驗證 JSONB 欄位
    if (data.name.zh !== '測試科技公司') {
      throw new Error('name.zh 不符合預期')
    }
    if (data.address.zh !=='台北市信義區信義路五段7號') {
      throw new Error('address.zh 不符合預期')
    }
    if (data.contact_person.name !== '王小明') {
      throw new Error('contact_person.name 不符合預期')
    }
  })

  await runTest('客戶 CRUD', '讀取客戶', async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', testCustomerId)
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 驗證資料完整性
    if (data.name.en !== 'Test Tech Co.') {
      throw new Error('資料不符合預期')
    }
    if (data.tax_id !== '12345678') {
      throw new Error('tax_id 資料錯誤')
    }
  })

  await runTest('客戶 CRUD', '更新客戶（更新 JSONB 欄位）', async () => {
    const { data, error } = await supabase
      .from('customers')
      .update({
        name: {
          zh: '更新科技公司',
          en: 'Updated Tech Co.'
        },
        phone: '+886-2-9876-5432',
        contact_person: {
          name: '李小華',
          title: '總經理',
          phone: '+886-987-654-321',
          email: 'lee@updated.com'
        }
      })
      .eq('id', testCustomerId)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('更新失敗')

    // 驗證更新
    if (data.name.zh !== '更新科技公司') {
      throw new Error('name 更新失敗')
    }
    if (data.contact_person.name !== '李小華') {
      throw new Error('contact_person 更新失敗')
    }
  })

  await runTest('客戶 CRUD', '按 user_id 查詢客戶列表', async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', testUserId)

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('查詢結果為空')
    }

    // 驗證包含我們的測試客戶
    const found = data.some(c => c.id === testCustomerId)
    if (!found) {
      throw new Error('未找到測試客戶')
    }
  })

  // ========================================
  // 分類 3: JSONB 查詢 (2 tests)
  // ========================================
  console.log('\n📋 分類 3: JSONB 查詢\n')

  await runTest('JSONB 查詢', '按 email 查詢（索引欄位）', async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', testCustomerId)
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 使用 email 再次查詢
    const { data: data2, error: error2 } = await supabase
      .from('customers')
      .select('*')
      .eq('email', data.email)
      .single()

    if (error2) throw error2
    if (!data2 || data2.id !== testCustomerId) {
      throw new Error('email 索引查詢失敗')
    }
  })

  await runTest('JSONB 查詢', '驗證 JSONB 欄位結構', async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', testCustomerId)
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 驗證 name JSONB 結構
    if (typeof data.name !== 'object' || !data.name.zh || !data.name.en) {
      throw new Error('name JSONB 結構錯誤')
    }

    // 驗證 address JSONB 結構
    if (typeof data.address !== 'object' || !data.address.zh) {
      throw new Error('address JSONB 結構錯誤')
    }

    // 驗證 contact_person JSONB 結構
    if (typeof data.contact_person !== 'object' ||
        !data.contact_person.name ||
        !data.contact_person.email) {
      throw new Error('contact_person JSONB 結構錯誤')
    }
  })

  // ========================================
  // 分類 4: 資料驗證 (1 test)
  // ========================================
  console.log('\n📋 分類 4: 資料驗證\n')

  await runTest('資料驗證', '驗證時間戳記自動設定', async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', testCustomerId)
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 驗證 created_at
    if (!data.created_at) {
      throw new Error('created_at 未設定')
    }

    // 驗證 updated_at
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

  // ========================================
  // 分類 5: 清理測試資料 (1 test)
  // ========================================
  console.log('\n📋 分類 5: 清理測試資料\n')

  await runTest('清理測試資料', '刪除測試客戶', async () => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', testCustomerId)

    if (error) throw error

    // 驗證刪除成功
    const { data: remaining } = await supabase
      .from('customers')
      .select('id')
      .eq('id', testCustomerId)

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
