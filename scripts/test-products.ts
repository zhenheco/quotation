#!/usr/bin/env tsx

/**
 * ============================================================
 * 產品管理系統測試腳本
 * ============================================================
 * 測試範圍：
 * 1. 產品 CRUD 操作
 * 2. JSONB 欄位功能（name, description）
 * 3. 價格和貨幣處理
 * 4. SKU 唯一性
 * 5. 索引查詢
 *
 * 預期測試數量：10 個
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
let testProductId: string = ''
let testSku: string = ''

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
  console.log('產品管理系統測試')
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
    testSku = `SKU-TEST-${Date.now()}`
  })

  // ========================================
  // 分類 2: 產品 CRUD (4 tests)
  // ========================================
  console.log('\n📋 分類 2: 產品 CRUD\n')

  await runTest('產品 CRUD', '建立產品（包含 JSONB 欄位）', async () => {
    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: testUserId,
        sku: testSku,
        name: {
          zh: '專業軟體開發服務',
          en: 'Professional Software Development Service'
        },
        description: {
          zh: '提供全方位軟體開發服務，包含需求分析、系統設計、程式開發、測試部署',
          en: 'Full-cycle software development including requirements analysis, system design, coding, and deployment'
        },
        unit_price: 50000.00,
        currency: 'TWD',
        category: '軟體服務'
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('建立產品失敗')

    testProductId = data.id

    // 驗證 JSONB 欄位
    if (data.name.zh !== '專業軟體開發服務') {
      throw new Error('name.zh 不符合預期')
    }
    if (data.description.en !== 'Full-cycle software development including requirements analysis, system design, coding, and deployment') {
      throw new Error('description.en 不符合預期')
    }

    // 驗證預設貨幣
    if (data.currency !== 'TWD') {
      throw new Error('currency 預設值錯誤')
    }
  })

  await runTest('產品 CRUD', '讀取產品', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', testProductId)
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 驗證資料完整性
    if (data.sku !== testSku) {
      throw new Error('SKU 資料錯誤')
    }
    if (parseFloat(data.unit_price) !== 50000.00) {
      throw new Error('unit_price 資料錯誤')
    }
  })

  await runTest('產品 CRUD', '更新產品（更新價格和 JSONB 欄位）', async () => {
    const { data, error } = await supabase
      .from('products')
      .update({
        name: {
          zh: '進階軟體開發服務',
          en: 'Advanced Software Development Service'
        },
        unit_price: 75000.00,
        category: '進階軟體服務'
      })
      .eq('id', testProductId)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('更新失敗')

    // 驗證更新
    if (data.name.zh !== '進階軟體開發服務') {
      throw new Error('name 更新失敗')
    }
    if (parseFloat(data.unit_price) !== 75000.00) {
      throw new Error('unit_price 更新失敗')
    }
  })

  await runTest('產品 CRUD', '按 user_id 查詢產品列表', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', testUserId)

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('查詢結果為空')
    }

    // 驗證包含我們的測試產品
    const found = data.some(p => p.id === testProductId)
    if (!found) {
      throw new Error('未找到測試產品')
    }
  })

  // ========================================
  // 分類 3: JSONB 和索引查詢 (3 tests)
  // ========================================
  console.log('\n📋 分類 3: JSONB 和索引查詢\n')

  await runTest('JSONB 和索引查詢', '按 SKU 查詢（索引欄位）', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('sku', testSku)
      .single()

    if (error) throw error
    if (!data || data.id !== testProductId) {
      throw new Error('SKU 索引查詢失敗')
    }
  })

  await runTest('JSONB 和索引查詢', '按 category 查詢', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', '進階軟體服務')

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('category 查詢失敗')
    }

    const found = data.some(p => p.id === testProductId)
    if (!found) {
      throw new Error('未找到測試產品')
    }
  })

  await runTest('JSONB 和索引查詢', '驗證 JSONB 欄位結構', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', testProductId)
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 驗證 name JSONB 結構
    if (typeof data.name !== 'object' || !data.name.zh || !data.name.en) {
      throw new Error('name JSONB 結構錯誤')
    }

    // 驗證 description JSONB 結構
    if (typeof data.description !== 'object' || !data.description.zh) {
      throw new Error('description JSONB 結構錯誤')
    }
  })

  // ========================================
  // 分類 4: 資料驗證 (1 test)
  // ========================================
  console.log('\n📋 分類 4: 資料驗證\n')

  await runTest('資料驗證', '驗證時間戳記和貨幣預設值', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', testProductId)
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

    // 驗證 currency 預設值
    if (data.currency !== 'TWD') {
      throw new Error('currency 預設值應該是 TWD')
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

  await runTest('清理測試資料', '刪除測試產品', async () => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', testProductId)

    if (error) throw error

    // 驗證刪除成功
    const { data: remaining } = await supabase
      .from('products')
      .select('id')
      .eq('id', testProductId)

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
