#!/usr/bin/env ts-node
/**
 * 收款管理測試資料種子腳本
 *
 * 建立完整的測試資料以驗證收款管理功能：
 * - 3 個測試客戶
 * - 6 個報價單（不同付款條款組合）
 * - 自動生成付款排程
 * - 模擬部分已收款記錄
 * - 模擬部分逾期記錄
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// 手動載入環境變數
try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
} catch (error) {
  console.warn('⚠️  無法讀取 .env.local，使用現有環境變數')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 計算日期（相對於今天）
function getRelativeDate(daysOffset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString().split('T')[0]
}

async function seedPaymentTestData() {
  console.log('🌱 開始建立收款管理測試資料...\n')

  try {
    // 查詢現有使用者（使用第一個管理員用戶）
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('is_active', true)
      .limit(1)

    if (userError || !users || users.length === 0) {
      console.error('❌ 找不到活躍的使用者，請先建立使用者資料')
      console.error('   提示：執行 pnpm run seed 或 pnpm run seed:admin')
      process.exit(1)
    }

    const userId = users[0].user_id
    console.log(`✅ 使用者 ID: ${userId}\n`)

    // ========== 1. 建立測試客戶 ==========
    console.log('📦 建立 3 個測試客戶...')
    const customers = []

    const customerData = [
      {
        name: { zh: '華碩電腦股份有限公司', en: 'ASUSTek Computer Inc.' },
        contact_person: { zh: '張經理', en: 'Manager Chang' },
        email: 'manager.chang@asus.com',
        phone: '+886-2-2894-3447',
        address: { zh: '台北市北投區立德路 150 號', en: '150 Lide Rd., Beitou District, Taipei City' },
        tax_id: '12345001',
      },
      {
        name: { zh: '台積電股份有限公司', en: 'Taiwan Semiconductor Manufacturing Company' },
        contact_person: { zh: '李副總', en: 'VP Lee' },
        email: 'vp.lee@tsmc.com',
        phone: '+886-3-567-8899',
        address: { zh: '新竹市力行六路 8 號', en: '8 Li-Hsin Rd. 6, Hsinchu Science Park' },
        tax_id: '12345002',
      },
      {
        name: { zh: '鴻海精密工業股份有限公司', en: 'Hon Hai Precision Industry Co., Ltd.' },
        contact_person: { zh: '王協理', en: 'Director Wang' },
        email: 'director.wang@foxconn.com',
        phone: '+886-2-2268-3466',
        address: { zh: '新北市土城區自由街 2 號', en: '2 Ziyou St., Tucheng District, New Taipei City' },
        tax_id: '12345003',
      },
    ]

    for (const customer of customerData) {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customer,
          user_id: userId,
        })
        .select()
        .single()

      if (error) {
        console.error(`❌ 建立客戶失敗: ${customer.name.zh}`, error)
        continue
      }

      customers.push(data)
      console.log(`   ✅ ${data.name.zh} (${data.id})`)
    }

    console.log(`✅ 成功建立 ${customers.length} 個客戶\n`)

    // ========== 2. 建立測試產品 ==========
    console.log('📦 建立測試產品...')
    const { data: products, error: productsError } = await supabase
      .from('products')
      .insert([
        {
          name: { zh: '企業網站建置', en: 'Enterprise Website Development' },
          description: { zh: '完整的企業形象網站', en: 'Complete corporate website' },
          base_price: 150000,
          base_currency: 'TWD',
          category: 'Development',
          user_id: userId,
          sku: 'WEB-001'
        },
        {
          name: { zh: '系統整合服務', en: 'System Integration Service' },
          description: { zh: 'ERP/CRM 系統整合', en: 'ERP/CRM integration' },
          base_price: 300000,
          base_currency: 'TWD',
          category: 'Integration',
          user_id: userId,
          sku: 'SYS-001'
        },
      ])
      .select()

    if (productsError) {
      console.error('❌ 建立產品失敗:', productsError)
      process.exit(1)
    }

    console.log(`✅ 成功建立 ${products.length} 個產品\n`)

    // ========== 3. 建立報價單（含付款條款） ==========
    console.log('📦 建立 6 個報價單...')

    const quotationConfigs = [
      {
        customer: customers[0],
        product: products[0],
        status: 'accepted',
        paymentTerms: [
          { term_number: 1, term_name: '簽約頭款', percentage: 30, due_date: getRelativeDate(-60) },
          { term_number: 2, term_name: '期中款', percentage: 40, due_date: getRelativeDate(-30) },
          { term_number: 3, term_name: '驗收尾款', percentage: 30, due_date: getRelativeDate(-5) },
        ],
        payments: [
          { term_number: 1, paid_date: getRelativeDate(-58), amount_percentage: 100 }, // 已全額付款
          { term_number: 2, paid_date: getRelativeDate(-25), amount_percentage: 100 }, // 已全額付款
        ] // term 3 未付款（逾期）
      },
      {
        customer: customers[1],
        product: products[1],
        status: 'accepted',
        paymentTerms: [
          { term_number: 1, term_name: '訂金', percentage: 50, due_date: getRelativeDate(-20) },
          { term_number: 2, term_name: '尾款', percentage: 50, due_date: getRelativeDate(10) },
        ],
        payments: [
          { term_number: 1, paid_date: getRelativeDate(-18), amount_percentage: 100 }, // 已付款
        ] // term 2 未到期
      },
      {
        customer: customers[2],
        product: products[0],
        status: 'accepted',
        paymentTerms: [
          { term_number: 1, term_name: '第一期', percentage: 25, due_date: getRelativeDate(-45) },
          { term_number: 2, term_name: '第二期', percentage: 25, due_date: getRelativeDate(-15) },
          { term_number: 3, term_name: '第三期', percentage: 25, due_date: getRelativeDate(15) },
          { term_number: 4, term_name: '第四期', percentage: 25, due_date: getRelativeDate(45) },
        ],
        payments: [
          { term_number: 1, paid_date: getRelativeDate(-40), amount_percentage: 100 },
          { term_number: 2, paid_date: getRelativeDate(-10), amount_percentage: 100 },
        ] // term 3, 4 未付款
      },
      {
        customer: customers[0],
        product: products[1],
        status: 'accepted',
        paymentTerms: [
          { term_number: 1, term_name: '簽約款', percentage: 40, due_date: getRelativeDate(-10) },
          { term_number: 2, term_name: '完工款', percentage: 60, due_date: getRelativeDate(20) },
        ],
        payments: [] // 全部未付款（term 1 已逾期）
      },
      {
        customer: customers[1],
        product: products[0],
        status: 'accepted',
        paymentTerms: [
          { term_number: 1, term_name: '頭款', percentage: 30, due_date: getRelativeDate(5) },
          { term_number: 2, term_name: '尾款', percentage: 70, due_date: getRelativeDate(35) },
        ],
        payments: [] // 全部未付款（即將到期）
      },
      {
        customer: customers[2],
        product: products[1],
        status: 'accepted',
        paymentTerms: [
          { term_number: 1, term_name: '全額付款', percentage: 100, due_date: getRelativeDate(-5) },
        ],
        payments: [
          { term_number: 1, paid_date: getRelativeDate(-3), amount_percentage: 50 }, // 部分付款
        ] // 仍有 50% 未付款
      },
    ]

    for (let i = 0; i < quotationConfigs.length; i++) {
      const config = quotationConfigs[i]

      const subtotal = config.product.base_price
      const taxAmount = subtotal * (5 / 100)
      const totalAmount = subtotal + taxAmount

      // 建立報價單
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          quotation_number: `QT-2025-TEST-${String(i + 1).padStart(3, '0')}`,
          customer_id: config.customer.id,
          user_id: userId,
          issue_date: getRelativeDate(-90 + i * 10),
          valid_until: getRelativeDate(30),
          currency: 'TWD',
          subtotal: subtotal,
          tax_rate: 5,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: config.status,
          notes: `測試報價單 #${i + 1}`,
        })
        .select()
        .single()

      if (quotationError) {
        console.error(`❌ 建立報價單失敗:`, quotationError)
        continue
      }

      // 建立報價單項目
      await supabase
        .from('quotation_items')
        .insert({
          quotation_id: quotation.id,
          product_id: config.product.id,
          quantity: 1,
          unit_price: config.product.base_price,
          discount: 0,
          tax_rate: 5,
          user_id: userId,
        })

      // 建立付款條款
      for (const term of config.paymentTerms) {
        const termAmount = Math.round(totalAmount * (term.percentage / 100))

        await supabase
          .from('payment_terms')
          .insert({
            quotation_id: quotation.id,
            term_number: term.term_number,
            term_name: term.term_name,
            percentage: term.percentage,
            amount: termAmount,
            due_date: term.due_date,
            payment_status: 'unpaid',
            paid_amount: 0,
          })
      }

      // 建立付款記錄
      for (const payment of config.payments) {
        const term = config.paymentTerms.find(t => t.term_number === payment.term_number)
        if (!term) continue

        const paidAmount = Math.round(totalAmount * (term.percentage / 100) * (payment.amount_percentage / 100))

        // 建立收款記錄
        const { data: paymentRecord } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            quotation_id: quotation.id,
            customer_id: config.customer.id,
            payment_type: payment.term_number === 1 ? 'deposit' :
                          payment.term_number === config.paymentTerms.length ? 'final' : 'installment',
            payment_date: payment.paid_date,
            amount: paidAmount,
            currency: 'TWD',
            payment_method: '銀行轉帳',
            status: 'confirmed',
            notes: `${term.term_name} - 測試收款`,
          })
          .select()
          .single()

        if (paymentRecord) {
          // 更新付款條款狀態
          const newPaidAmount = paidAmount
          const termTotalAmount = Math.round(totalAmount * (term.percentage / 100))
          const newStatus = newPaidAmount >= termTotalAmount ? 'paid' : 'partial'

          await supabase
            .from('payment_terms')
            .update({
              paid_amount: newPaidAmount,
              paid_date: payment.paid_date,
              payment_status: newStatus,
            })
            .eq('quotation_id', quotation.id)
            .eq('term_number', term.term_number)
        }
      }

      console.log(`   ✅ ${quotation.quotation_number} - ${config.customer.name}`)
    }

    console.log(`✅ 成功建立 ${quotationConfigs.length} 個報價單\n`)

    // ========== 4. 顯示統計資訊 ==========
    console.log('\n📊 測試資料統計：\n')

    const { data: stats } = await supabase
      .from('payment_terms')
      .select('payment_status, amount')

    const unpaidCount = stats?.filter(s => s.payment_status === 'unpaid').length || 0
    const partialCount = stats?.filter(s => s.payment_status === 'partial').length || 0
    const paidCount = stats?.filter(s => s.payment_status === 'paid').length || 0
    const overdueCount = stats?.filter(s => s.payment_status === 'overdue').length || 0

    console.log(`   客戶數: ${customers.length}`)
    console.log(`   報價單數: ${quotationConfigs.length}`)
    console.log(`   付款條款總數: ${stats?.length || 0}`)
    console.log(`   - 未付款: ${unpaidCount}`)
    console.log(`   - 部分付款: ${partialCount}`)
    console.log(`   - 已付款: ${paidCount}`)
    console.log(`   - 逾期: ${overdueCount}`)

    console.log('\n✅ 收款管理測試資料建立完成！')
    console.log('\n💡 請前往 /payments 頁面查看收款管理功能')
    console.log('   - 本月應收款明細')
    console.log('   - 已收款記錄')
    console.log('   - 未收款記錄（逾期提醒）')
    console.log('   - 收款統計')

  } catch (error) {
    console.error('❌ 發生錯誤:', error)
    process.exit(1)
  }
}

// 執行腳本
seedPaymentTestData()
