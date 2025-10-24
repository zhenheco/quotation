#!/usr/bin/env tsx
/**
 * 合約與付款系統完整測試腳本
 *
 * 測試範圍：
 * 1. customer_contracts 表 - CRUD 操作、排程生成
 * 2. payments 表 - 付款記錄、觸發器測試
 * 3. payment_schedules 表 - 排程管理、逾期偵測
 * 4. 整合測試 - 完整業務流程
 *
 * 執行方式:
 * npx tsx scripts/test-contract-payment-system.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 載入環境變數
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

// 初始化 Supabase 客戶端
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// 測試用的顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

// 用於清理的 ID 儲存
const createdIds = {
  contracts: [] as string[],
  payments: [] as string[],
  schedules: [] as string[],
  customers: [] as string[],
  quotations: [] as string[],
}

// 測試結果統計
let totalTests = 0
let passedTests = 0
let failedTests = 0

/**
 * 輸出測試結果
 */
function logTest(testName: string, passed: boolean, message?: string) {
  totalTests++
  if (passed) {
    passedTests++
    console.log(`${colors.green}✅ ${testName}${colors.reset}`)
    if (message) {
      console.log(`   ${colors.cyan}${message}${colors.reset}`)
    }
  } else {
    failedTests++
    console.log(`${colors.red}❌ ${testName}${colors.reset}`)
    if (message) {
      console.log(`   ${colors.red}${message}${colors.reset}`)
    }
  }
}

/**
 * 輸出測試類別標題
 */
function logSection(title: string) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.blue}${title}${colors.reset}`)
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`)
}

/**
 * 主測試流程
 */
async function runTests() {
  console.log(`${colors.cyan}開始測試合約與付款系統...${colors.reset}\n`)

  try {
    // ============================================================
    // 0. 準備工作 - 登入測試用戶
    // ============================================================
    logSection('0. 準備工作 - 登入測試用戶')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'TestPassword123!',
    })

    if (authError || !authData.user) {
      logTest('登入測試用戶', false, authError?.message)
      return
    }

    logTest('登入測試用戶', true, `User ID: ${authData.user.id}`)
    const userId = authData.user.id

    // ============================================================
    // 1. 建立測試資料 - Customer
    // ============================================================
    logSection('1. 建立測試資料 - Customer')

    const timestamp = Date.now()
    const customerData = {
      user_id: userId,
      name: {
        zh: `測試客戶公司 ${timestamp}`,
        en: `Test Customer Corp ${timestamp}`,
      },
      tax_id: `${timestamp}`.slice(0, 8),
      email: `customer-${timestamp}@example.com`,
      phone: '02-8765-4321',
      address: {
        zh: '台北市信義區信義路五段7號',
        en: '7 Xinyi Road, Xinyi District, Taipei',
      },
      contact_person: '張經理',
    }

    const { data: testCustomer, error: customerError } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single()

    if (customerError || !testCustomer) {
      logTest('建立測試客戶', false, customerError?.message)
      return
    }

    logTest('建立測試客戶', true, `Customer ID: ${testCustomer.id}`)
    createdIds.customers.push(testCustomer.id)

    // ============================================================
    // 2. 合約測試 - customer_contracts
    // ============================================================
    logSection('2. 合約測試 - customer_contracts')

    // 2.1 建立合約
    const today = new Date()
    const oneYearLater = new Date(today)
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)

    const contractData = {
      user_id: userId,
      customer_id: testCustomer.id,
      contract_number: `C-${timestamp}`,
      title: 'SaaS 訂閱服務合約',
      start_date: today.toISOString().split('T')[0],
      end_date: oneYearLater.toISOString().split('T')[0],
      signed_date: today.toISOString().split('T')[0],
      status: 'active',
      total_amount: 120000, // 一年 12 萬，每月 1 萬
      currency: 'TWD',
      payment_terms: 'monthly',
      payment_type: 'recurring', // 定期收款合約
      notes: '測試合約 - 每月 5 號收款',
    }

    const { data: createdContract, error: contractError } = await supabase
      .from('customer_contracts')
      .insert(contractData)
      .select()
      .single()

    if (contractError || !createdContract) {
      logTest('建立合約', false, contractError?.message)
      return
    }

    logTest('建立合約', true, `Contract: ${createdContract.contract_number}`)
    createdIds.contracts.push(createdContract.id)

    // 2.2 讀取合約
    const { data: readContract, error: readContractError } = await supabase
      .from('customer_contracts')
      .select(`
        *,
        customers (
          name,
          email,
          phone
        )
      `)
      .eq('id', createdContract.id)
      .single()

    const contractReadSuccess = !readContractError &&
      readContract?.contract_number === contractData.contract_number &&
      readContract?.total_amount === contractData.total_amount

    logTest(
      '讀取合約 (含 JOIN customers)',
      contractReadSuccess,
      readContractError?.message || `Total: ${readContract?.total_amount} ${readContract?.currency}`
    )

    // 2.3 更新合約
    const { data: updatedContract, error: updateContractError } = await supabase
      .from('customer_contracts')
      .update({
        notes: '測試合約 - 已更新備註',
      })
      .eq('id', createdContract.id)
      .select()
      .single()

    const contractUpdateSuccess = !updateContractError &&
      updatedContract?.notes === '測試合約 - 已更新備註'

    logTest(
      '更新合約備註',
      contractUpdateSuccess,
      updateContractError?.message
    )

    // ============================================================
    // 3. 付款排程測試 - payment_schedules
    // ============================================================
    logSection('3. 付款排程測試 - payment_schedules')

    // 3.1 生成付款排程 (使用資料庫函數)
    const { data: scheduleResult, error: scheduleError } = await supabase
      .rpc('generate_payment_schedules_for_contract', {
        p_contract_id: createdContract.id,
        p_start_date: today.toISOString().split('T')[0],
        p_payment_day: 5,
      })

    const scheduleGenSuccess = !scheduleError && scheduleResult && scheduleResult > 0

    logTest(
      '生成付款排程 (RPC 函數)',
      scheduleGenSuccess,
      scheduleError?.message || `生成 ${scheduleResult} 個排程`
    )

    // 3.2 讀取付款排程
    const { data: schedules, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select(`
        *,
        customer_contracts (
          contract_number,
          title
        )
      `)
      .eq('contract_id', createdContract.id)
      .order('schedule_number', { ascending: true })

    const schedulesReadSuccess = !schedulesError &&
      schedules &&
      schedules.length > 0

    logTest(
      '讀取付款排程 (含 JOIN)',
      schedulesReadSuccess,
      schedulesError?.message || `查詢到 ${schedules?.length} 個排程`
    )

    if (schedules && schedules.length > 0) {
      schedules.forEach(s => createdIds.schedules.push(s.id))
    }

    // 3.3 測試逾期偵測 (建立一個過去的排程)
    const pastDate = new Date(today)
    pastDate.setDate(pastDate.getDate() - 35) // 35 天前

    const overdueScheduleData = {
      user_id: userId,
      contract_id: createdContract.id,
      customer_id: testCustomer.id,
      schedule_number: 999, // 特殊編號，用於測試
      due_date: pastDate.toISOString().split('T')[0],
      amount: 10000,
      currency: 'TWD',
      status: 'pending',
      notes: '測試逾期偵測',
    }

    const { data: overdueSchedule, error: overdueScheduleError } = await supabase
      .from('payment_schedules')
      .insert(overdueScheduleData)
      .select()
      .single()

    // 檢查是否自動標記為 overdue (透過觸發器)
    const overdueDetected = !overdueScheduleError &&
      overdueSchedule?.status === 'overdue' &&
      overdueSchedule?.days_overdue > 0

    logTest(
      '逾期偵測 (觸發器自動標記)',
      overdueDetected,
      overdueScheduleError?.message ||
        `Status: ${overdueSchedule?.status}, Days: ${overdueSchedule?.days_overdue}`
    )

    if (overdueSchedule) {
      createdIds.schedules.push(overdueSchedule.id)
    }

    // 3.4 批次標記逾期付款 (測試 RPC 函數)
    const { data: markOverdueResult, error: markOverdueError } = await supabase
      .rpc('mark_overdue_payments')

    const markOverdueSuccess = !markOverdueError

    logTest(
      '批次標記逾期付款 (RPC 函數)',
      markOverdueSuccess,
      markOverdueError?.message ||
        `Updated: ${markOverdueResult?.[0]?.updated_count || 0} schedules`
    )

    // ============================================================
    // 4. 付款記錄測試 - payments
    // ============================================================
    logSection('4. 付款記錄測試 - payments')

    // 4.1 建立付款記錄 - 第一期
    const firstSchedule = schedules?.[0]

    const firstPaymentData = {
      user_id: userId,
      contract_id: createdContract.id,
      customer_id: testCustomer.id,
      payment_type: 'recurring',
      payment_date: today.toISOString().split('T')[0],
      amount: 10000,
      currency: 'TWD',
      payment_method: 'bank_transfer',
      reference_number: `TXN-${timestamp}-001`,
      status: 'confirmed',
      notes: '第一期付款 - 銀行轉帳',
    }

    const { data: firstPayment, error: firstPaymentError } = await supabase
      .from('payments')
      .insert(firstPaymentData)
      .select()
      .single()

    const firstPaymentSuccess = !firstPaymentError && firstPayment

    logTest(
      '建立第一期付款記錄',
      firstPaymentSuccess,
      firstPaymentError?.message || `Payment ID: ${firstPayment?.id}`
    )

    if (firstPayment) {
      createdIds.payments.push(firstPayment.id)
    }

    // 4.2 檢查下次收款日期是否自動更新 (觸發器)
    const { data: updatedContractAfterPayment, error: contractCheckError } = await supabase
      .from('customer_contracts')
      .select('next_collection_date, next_collection_amount')
      .eq('id', createdContract.id)
      .single()

    const nextCollectionUpdated = !contractCheckError &&
      updatedContractAfterPayment?.next_collection_date !== null &&
      updatedContractAfterPayment?.next_collection_amount !== null

    logTest(
      '下次收款日期自動更新 (觸發器)',
      nextCollectionUpdated,
      contractCheckError?.message ||
        `Next: ${updatedContractAfterPayment?.next_collection_date}, Amount: ${updatedContractAfterPayment?.next_collection_amount}`
    )

    // 4.3 建立第二期付款
    const secondPaymentData = {
      user_id: userId,
      contract_id: createdContract.id,
      customer_id: testCustomer.id,
      payment_type: 'recurring',
      payment_date: today.toISOString().split('T')[0],
      amount: 10000,
      currency: 'TWD',
      payment_method: 'credit_card',
      reference_number: `TXN-${timestamp}-002`,
      status: 'confirmed',
      notes: '第二期付款 - 信用卡',
    }

    const { data: secondPayment, error: secondPaymentError } = await supabase
      .from('payments')
      .insert(secondPaymentData)
      .select()
      .single()

    const secondPaymentSuccess = !secondPaymentError && secondPayment

    logTest(
      '建立第二期付款記錄',
      secondPaymentSuccess,
      secondPaymentError?.message
    )

    if (secondPayment) {
      createdIds.payments.push(secondPayment.id)
    }

    // 4.4 讀取付款記錄 (含 JOIN)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        customers (
          name,
          email
        ),
        customer_contracts (
          contract_number,
          title
        )
      `)
      .eq('contract_id', createdContract.id)
      .order('payment_date', { ascending: false })

    const paymentsReadSuccess = !paymentsError &&
      payments &&
      payments.length >= 2

    logTest(
      '讀取付款記錄 (含 JOIN)',
      paymentsReadSuccess,
      paymentsError?.message || `查詢到 ${payments?.length} 筆付款記錄`
    )

    // 4.5 更新付款記錄
    if (firstPayment) {
      const { data: updatedPayment, error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          notes: '第一期付款 - 已更新備註',
        })
        .eq('id', firstPayment.id)
        .select()
        .single()

      const paymentUpdateSuccess = !updatePaymentError &&
        updatedPayment?.notes === '第一期付款 - 已更新備註'

      logTest(
        '更新付款記錄',
        paymentUpdateSuccess,
        updatePaymentError?.message
      )
    }

    // ============================================================
    // 5. 更新付款排程狀態
    // ============================================================
    logSection('5. 更新付款排程狀態')

    // 5.1 將第一個排程標記為已付款
    if (firstSchedule && firstPayment) {
      const { data: paidSchedule, error: paidScheduleError } = await supabase
        .from('payment_schedules')
        .update({
          status: 'paid',
          paid_amount: firstPaymentData.amount,
          paid_date: firstPaymentData.payment_date,
          payment_id: firstPayment.id,
        })
        .eq('id', firstSchedule.id)
        .select()
        .single()

      const scheduleUpdateSuccess = !paidScheduleError &&
        paidSchedule?.status === 'paid' &&
        paidSchedule?.days_overdue === 0 // 已付款應該重置 days_overdue

      logTest(
        '更新排程為已付款 (觸發器重置逾期天數)',
        scheduleUpdateSuccess,
        paidScheduleError?.message ||
          `Status: ${paidSchedule?.status}, Days overdue: ${paidSchedule?.days_overdue}`
      )
    }

    // ============================================================
    // 6. 整合測試 - 查詢視圖
    // ============================================================
    logSection('6. 整合測試 - 查詢視圖')

    // 6.1 查詢已收款彙總視圖
    const { data: collectedPayments, error: collectedError } = await supabase
      .from('collected_payments_summary')
      .select('*')
      .eq('contract_id', createdContract.id)
      .limit(10)

    const collectedViewSuccess = !collectedError &&
      collectedPayments &&
      collectedPayments.length > 0

    logTest(
      '查詢已收款彙總視圖',
      collectedViewSuccess,
      collectedError?.message || `查詢到 ${collectedPayments?.length} 筆已收款`
    )

    // 6.2 查詢下次收款提醒視圖
    const { data: nextCollectionReminders, error: remindersError } = await supabase
      .from('next_collection_reminders')
      .select('*')
      .eq('contract_id', createdContract.id)
      .limit(10)

    const remindersViewSuccess = !remindersError

    logTest(
      '查詢下次收款提醒視圖',
      remindersViewSuccess,
      remindersError?.message ||
        `查詢到 ${nextCollectionReminders?.length || 0} 個提醒`
    )

    // 6.3 查詢未收款列表視圖 (>30 天)
    const { data: unpaidPayments, error: unpaidError } = await supabase
      .from('unpaid_payments_30_days')
      .select('*')
      .eq('contract_id', createdContract.id)
      .limit(10)

    const unpaidViewSuccess = !unpaidError

    logTest(
      '查詢未收款列表視圖 (>30 天)',
      unpaidViewSuccess,
      unpaidError?.message ||
        `查詢到 ${unpaidPayments?.length || 0} 筆逾期 30 天以上`
    )

    // ============================================================
    // 7. 資料清理
    // ============================================================
    logSection('7. 資料清理')

    // 反向依賴順序刪除
    let cleanupSuccess = true

    // 7.1 刪除付款記錄
    if (createdIds.payments.length > 0) {
      const { error: deletePaymentsError } = await supabase
        .from('payments')
        .delete()
        .in('id', createdIds.payments)

      if (deletePaymentsError) {
        cleanupSuccess = false
        logTest('清理付款記錄', false, deletePaymentsError.message)
      } else {
        logTest('清理付款記錄', true, `刪除 ${createdIds.payments.length} 筆`)
      }
    }

    // 7.2 刪除付款排程
    if (createdIds.schedules.length > 0) {
      const { error: deleteSchedulesError } = await supabase
        .from('payment_schedules')
        .delete()
        .in('id', createdIds.schedules)

      if (deleteSchedulesError) {
        cleanupSuccess = false
        logTest('清理付款排程', false, deleteSchedulesError.message)
      } else {
        logTest('清理付款排程', true, `刪除 ${createdIds.schedules.length} 個`)
      }
    }

    // 7.3 刪除合約
    if (createdIds.contracts.length > 0) {
      const { error: deleteContractsError } = await supabase
        .from('customer_contracts')
        .delete()
        .in('id', createdIds.contracts)

      if (deleteContractsError) {
        cleanupSuccess = false
        logTest('清理合約', false, deleteContractsError.message)
      } else {
        logTest('清理合約', true, `刪除 ${createdIds.contracts.length} 個`)
      }
    }

    // 7.4 刪除客戶
    if (createdIds.customers.length > 0) {
      const { error: deleteCustomersError } = await supabase
        .from('customers')
        .delete()
        .in('id', createdIds.customers)

      if (deleteCustomersError) {
        cleanupSuccess = false
        logTest('清理客戶資料', false, deleteCustomersError.message)
      } else {
        logTest('清理客戶資料', true, `刪除 ${createdIds.customers.length} 個`)
      }
    }

  } catch (error: any) {
    console.error(`${colors.red}測試過程發生錯誤:${colors.reset}`, error.message)
  }

  // ============================================================
  // 測試總結
  // ============================================================
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.cyan}測試總結${colors.reset}`)
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`)

  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0'

  console.log(`總測試數量: ${totalTests}`)
  console.log(`${colors.green}通過: ${passedTests}${colors.reset}`)
  console.log(`${colors.red}失敗: ${failedTests}${colors.reset}`)
  console.log(`${colors.yellow}成功率: ${successRate}%${colors.reset}\n`)

  if (failedTests === 0) {
    console.log(`${colors.green}🎉 所有測試通過！${colors.reset}\n`)
  } else {
    console.log(`${colors.red}⚠️  有 ${failedTests} 個測試失敗，請檢查錯誤訊息${colors.reset}\n`)
  }
}

// 執行測試
runTests().catch(console.error)
