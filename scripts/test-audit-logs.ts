#!/usr/bin/env tsx

/**
 * ============================================================
 * 稽核日誌系統測試腳本
 * ============================================================
 * 測試範圍：
 * 1. 稽核日誌建立（create, update, delete 三種類型）
 * 2. 查詢功能（按 user_id, table_name, record_id, action, 時間）
 * 3. JSONB 欄位查詢（old_values, new_values）
 * 4. 組合查詢與分頁
 * 5. 資料驗證
 *
 * 預期測試數量：17 個
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

envContent.split('\n').forEach((line: string) => {
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
let testRecordId: string = ''
let testAuditLogIds: string[] = []

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
  console.log('稽核日誌系統測試')
  console.log('='.repeat(60) + '\n')

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ========================================
  // 分類 1: 認證與初始化 (2 tests)
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

  await runTest('認證與初始化', '準備測試資料', async () => {
    // 生成測試用的 record_id
    testRecordId = crypto.randomUUID()

    if (!testRecordId) {
      throw new Error('無法生成測試 record_id')
    }
  })

  // ========================================
  // 分類 2: 稽核日誌建立 (4 tests)
  // ========================================
  console.log('\n📋 分類 2: 稽核日誌建立\n')

  await runTest('稽核日誌建立', "建立 'create' 類型的稽核日誌", async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: testUserId,
        table_name: 'quotations',
        record_id: testRecordId,
        action: 'create',
        new_values: {
          quotation_number: 'Q-TEST-001',
          title: '測試報價單',
          total_amount: 10000,
          status: 'draft'
        },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Test)'
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('建立稽核日誌失敗')

    testAuditLogIds.push(data.id)
  })

  await runTest('稽核日誌建立', "建立 'update' 類型的稽核日誌（包含 old_values 和 new_values）", async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: testUserId,
        table_name: 'quotations',
        record_id: testRecordId,
        action: 'update',
        old_values: {
          status: 'draft',
          total_amount: 10000
        },
        new_values: {
          status: 'sent',
          total_amount: 12000
        },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Test)'
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('建立稽核日誌失敗')

    testAuditLogIds.push(data.id)
  })

  await runTest('稽核日誌建立', "建立 'delete' 類型的稽核日誌", async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: testUserId,
        table_name: 'quotations',
        record_id: testRecordId,
        action: 'delete',
        old_values: {
          quotation_number: 'Q-TEST-001',
          title: '測試報價單',
          status: 'sent'
        },
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Test)'
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('建立稽核日誌失敗')

    testAuditLogIds.push(data.id)
  })

  await runTest('稽核日誌建立', '建立其他表的稽核日誌（測試多表支援）', async () => {
    const anotherRecordId = crypto.randomUUID()

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: testUserId,
        table_name: 'customer_contracts',
        record_id: anotherRecordId,
        action: 'create',
        new_values: {
          contract_number: 'C-TEST-001',
          title: '測試合約',
          status: 'active'
        }
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('建立稽核日誌失敗')

    testAuditLogIds.push(data.id)
  })

  // ========================================
  // 分類 3: 查詢功能 (8 tests)
  // ========================================
  console.log('\n📋 分類 3: 查詢功能\n')

  await runTest('查詢功能', '按 user_id 查詢', async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', testUserId)

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('查詢結果為空')
    }
    if (data.length < 4) {
      throw new Error(`預期至少 4 筆記錄，實際 ${data.length} 筆`)
    }
  })

  await runTest('查詢功能', '按 table_name 查詢', async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'quotations')
      .eq('user_id', testUserId)

    if (error) throw error
    if (!data || data.length !== 3) {
      throw new Error(`預期 3 筆 quotations 記錄，實際 ${data?.length || 0} 筆`)
    }
  })

  await runTest('查詢功能', '按 record_id 查詢', async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('record_id', testRecordId)
      .eq('user_id', testUserId)

    if (error) throw error
    if (!data || data.length !== 3) {
      throw new Error(`預期 3 筆記錄，實際 ${data?.length || 0} 筆`)
    }
  })

  await runTest('查詢功能', '按 action 類型查詢', async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'update')
      .eq('user_id', testUserId)

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('查詢結果為空')
    }

    // 驗證查詢結果確實是 update 類型
    const allAreUpdate = data.every(log => log.action === 'update')
    if (!allAreUpdate) {
      throw new Error('查詢結果包含非 update 類型的記錄')
    }
  })

  await runTest('查詢功能', '時間範圍查詢（最近 1 小時）', async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', testUserId)
      .gte('created_at', oneHourAgo)

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('查詢結果為空')
    }
  })

  await runTest('查詢功能', 'JSONB 欄位查詢（new_values 包含特定鍵）', async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', testUserId)
      .not('new_values', 'is', null)

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('查詢結果為空')
    }

    // 驗證每筆記錄都有 new_values
    const allHaveNewValues = data.every(log => log.new_values !== null)
    if (!allHaveNewValues) {
      throw new Error('部分記錄缺少 new_values')
    }
  })

  await runTest('查詢功能', '組合查詢（user_id + table_name + action）', async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', testUserId)
      .eq('table_name', 'quotations')
      .eq('action', 'create')

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('查詢結果為空')
    }
  })

  await runTest('查詢功能', '分頁查詢（limit 和 offset）', async () => {
    const { data: page1, error: error1 } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(2)

    if (error1) throw error1
    if (!page1 || page1.length === 0) {
      throw new Error('第一頁查詢結果為空')
    }

    const { data: page2, error: error2 } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .range(2, 3)

    if (error2) throw error2
    if (!page2) {
      throw new Error('第二頁查詢失敗')
    }

    // 驗證分頁結果不重複
    const page1Ids = page1.map(log => log.id)
    const page2Ids = page2.map(log => log.id)
    const hasOverlap = page1Ids.some(id => page2Ids.includes(id))

    if (hasOverlap) {
      throw new Error('分頁結果有重複')
    }
  })

  // ========================================
  // 分類 4: 資料驗證 (3 tests)
  // ========================================
  console.log('\n📋 分類 4: 資料驗證\n')

  await runTest('資料驗證', '驗證 JSONB 欄位格式正確', async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', testAuditLogIds[1]) // update 類型的記錄
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 驗證 old_values 和 new_values 都存在且為物件
    if (typeof data.old_values !== 'object' || data.old_values === null) {
      throw new Error('old_values 格式錯誤')
    }
    if (typeof data.new_values !== 'object' || data.new_values === null) {
      throw new Error('new_values 格式錯誤')
    }

    // 驗證內容正確
    if (data.old_values.status !== 'draft') {
      throw new Error('old_values 內容錯誤')
    }
    if (data.new_values.status !== 'sent') {
      throw new Error('new_values 內容錯誤')
    }
  })

  await runTest('資料驗證', '驗證時間戳記自動設定', async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', testAuditLogIds[0])
      .single()

    if (error) throw error
    if (!data) throw new Error('查詢失敗')

    // 驗證 created_at 存在且為有效日期
    if (!data.created_at) {
      throw new Error('created_at 未設定')
    }

    const createdAt = new Date(data.created_at)
    if (isNaN(createdAt.getTime())) {
      throw new Error('created_at 不是有效日期')
    }

    // 驗證時間合理（不應該是未來時間）
    const now = new Date()
    if (createdAt > now) {
      throw new Error('created_at 是未來時間')
    }
  })

  await runTest('資料驗證', '驗證必填欄位限制', async () => {
    // 測試缺少必填欄位時應該失敗
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: testUserId,
        // 缺少 table_name, record_id, action
      })
      .select()

    if (!error) {
      throw new Error('應該要拋出錯誤，但沒有')
    }

    // 驗證錯誤訊息包含 NOT NULL 或相關字串
    if (!error.message.includes('null') && !error.message.includes('required')) {
      throw new Error(`錯誤訊息不符合預期: ${error.message}`)
    }
  })

  // ========================================
  // 分類 5: 清理測試資料 (1 test)
  // ========================================
  console.log('\n📋 分類 5: 清理測試資料\n')

  await runTest('清理測試資料', '刪除所有測試資料', async () => {
    // 刪除稽核日誌
    const { error: deleteLogsError } = await supabase
      .from('audit_logs')
      .delete()
      .in('id', testAuditLogIds)

    if (deleteLogsError) throw deleteLogsError

    // 驗證刪除成功
    const { data: remainingLogs } = await supabase
      .from('audit_logs')
      .select('id')
      .in('id', testAuditLogIds)

    if (remainingLogs && remainingLogs.length > 0) {
      throw new Error(`還有 ${remainingLogs.length} 筆未刪除的記錄`)
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
