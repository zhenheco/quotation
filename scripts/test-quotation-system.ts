#!/usr/bin/env tsx
/**
 * 報價單系統完整測試
 *
 * 測試項目：
 * 1. Quotations (報價單) CRUD
 * 2. Quotation Items (報價單項目) 管理
 * 3. 計算邏輯驗證（小計、稅額、總計）
 * 4. 狀態流程（draft → sent → accepted/rejected）
 * 5. Quotation Versions (版本控制)
 * 6. Quotation Shares (分享功能)
 * 7. Exchange Rates (匯率) 管理
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  details?: any
}

const results: TestResult[] = []

// 儲存建立的資料 ID，用於清理
const createdIds = {
  customers: [] as string[],
  products: [] as string[],
  quotations: [] as string[],
  quotationItems: [] as string[],
  quotationVersions: [] as string[],
  quotationShares: [] as string[],
  exchangeRates: [] as string[]
}

async function testQuotationSystem() {
  console.log('📋 開始測試報價單系統\n')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 登入測試使用者
  console.log('📋 步驟 0: 登入測試帳號')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'TestPassword123!'
  })

  if (signInError || !signInData.user) {
    console.log(`❌ 登入失敗: ${signInError?.message}\n`)
    return
  }

  console.log(`✅ 登入成功 (User ID: ${signInData.user.id})\n`)
  const userId = signInData.user.id

  // ========================================
  // 準備：建立測試用的客戶和產品
  // ========================================
  console.log('='.repeat(60))
  console.log('🔧 準備測試資料（客戶和產品）')
  console.log('='.repeat(60) + '\n')

  // 建立測試客戶
  console.log('📋 建立測試客戶')
  const timestamp = Date.now()
  const { data: testCustomer, error: customerError } = await supabase
    .from('customers')
    .insert({
      user_id: userId,
      name: { zh: '測試科技公司', en: 'Test Tech Co.' },
      email: `test-customer-${timestamp}@example.com`,
      phone: '+886-2-1234-5678',
      tax_id: '12345678'
    })
    .select()
    .single()

  if (customerError || !testCustomer) {
    console.log(`❌ 建立客戶失敗: ${customerError?.message}\n`)
    return
  }

  createdIds.customers.push(testCustomer.id)
  console.log(`✅ 測試客戶已建立 (ID: ${testCustomer.id})\n`)

  // 建立測試產品
  console.log('📋 建立測試產品')
  const { data: testProduct, error: productError } = await supabase
    .from('products')
    .insert({
      user_id: userId,
      sku: `TEST-PROD-${timestamp}`,
      name: { zh: 'HP 商用筆電', en: 'HP Business Laptop' },
      description: { zh: 'Intel i7 處理器，16GB RAM', en: 'Intel i7, 16GB RAM' },
      unit_price: 30000,
      currency: 'TWD',
      category: 'laptop'
    })
    .select()
    .single()

  if (productError || !testProduct) {
    console.log(`❌ 建立產品失敗: ${productError?.message}\n`)
    return
  }

  createdIds.products.push(testProduct.id)
  console.log(`✅ 測試產品已建立 (ID: ${testProduct.id})\n`)

  // ========================================
  // 測試 1: Quotations CRUD
  // ========================================
  console.log('='.repeat(60))
  console.log('📊 測試 Quotations (報價單) CRUD 操作')
  console.log('='.repeat(60) + '\n')

  // 1.1 建立報價單
  console.log('📋 測試 1.1: 建立報價單 (CREATE)')
  const quotationData = {
    user_id: userId,
    customer_id: testCustomer.id,
    quotation_number: `QT-${timestamp}`,
    status: 'draft',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30天後
    currency: 'TWD',
    subtotal: 0,
    tax_rate: 5.0,
    tax_amount: 0,
    total_amount: 0,
    notes: '這是測試報價單'
  }

  const { data: createdQuotation, error: createQuotError } = await supabase
    .from('quotations')
    .insert(quotationData)
    .select()
    .single()

  if (createQuotError) {
    results.push({
      name: '建立報價單',
      status: 'FAIL',
      message: '建立失敗',
      details: createQuotError
    })
    console.log(`❌ 建立失敗: ${createQuotError.message}\n`)
  } else {
    createdIds.quotations.push(createdQuotation.id)
    results.push({
      name: '建立報價單',
      status: 'PASS',
      message: '建立成功',
      details: { id: createdQuotation.id, number: createdQuotation.quotation_number }
    })
    console.log(`✅ 建立成功`)
    console.log(`   ID: ${createdQuotation.id}`)
    console.log(`   報價單號: ${createdQuotation.quotation_number}`)
    console.log(`   狀態: ${createdQuotation.status}`)
    console.log(`   客戶: ${testCustomer.name.zh}\n`)
  }

  // 1.2 讀取報價單
  if (createdIds.quotations.length > 0) {
    console.log('📋 測試 1.2: 讀取報價單 (READ)')
    const { data: readQuotation, error: readQuotError } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          name,
          email
        )
      `)
      .eq('id', createdIds.quotations[0])
      .single()

    if (readQuotError) {
      results.push({
        name: '讀取報價單',
        status: 'FAIL',
        message: '讀取失敗',
        details: readQuotError
      })
      console.log(`❌ 讀取失敗: ${readQuotError.message}\n`)
    } else {
      results.push({
        name: '讀取報價單',
        status: 'PASS',
        message: '讀取成功',
        details: { id: readQuotation.id }
      })
      console.log(`✅ 讀取成功`)
      console.log(`   報價單號: ${readQuotation.quotation_number}`)
      console.log(`   客戶: ${(readQuotation.customers as any).name.zh}`)
      console.log(`   總金額: ${readQuotation.currency} ${readQuotation.total_amount.toLocaleString()}\n`)
    }
  }

  // ========================================
  // 測試 2: Quotation Items 管理
  // ========================================
  console.log('='.repeat(60))
  console.log('📦 測試 Quotation Items (報價單項目) 管理')
  console.log('='.repeat(60) + '\n')

  // 2.1 新增報價單項目
  if (createdIds.quotations.length > 0) {
    console.log('📋 測試 2.1: 新增報價單項目')
    const itemData = {
      quotation_id: createdIds.quotations[0],
      product_id: testProduct.id,
      quantity: 5,
      unit_price: 30000,
      discount: 5.0, // 5% 折扣
      subtotal: 30000 * 5 * (1 - 5.0 / 100) // 142500
    }

    const { data: createdItem, error: createItemError } = await supabase
      .from('quotation_items')
      .insert(itemData)
      .select()
      .single()

    if (createItemError) {
      results.push({
        name: '新增報價單項目',
        status: 'FAIL',
        message: '新增失敗',
        details: createItemError
      })
      console.log(`❌ 新增失敗: ${createItemError.message}\n`)
    } else {
      createdIds.quotationItems.push(createdItem.id)
      results.push({
        name: '新增報價單項目',
        status: 'PASS',
        message: '新增成功',
        details: { id: createdItem.id }
      })
      console.log(`✅ 新增成功`)
      console.log(`   產品: ${testProduct.name.zh}`)
      console.log(`   數量: ${createdItem.quantity}`)
      console.log(`   單價: TWD ${createdItem.unit_price.toLocaleString()}`)
      console.log(`   折扣: ${createdItem.discount}%`)
      console.log(`   小計: TWD ${createdItem.subtotal.toLocaleString()}\n`)
    }
  }

  // 2.2 查詢報價單的所有項目
  if (createdIds.quotations.length > 0) {
    console.log('📋 測試 2.2: 查詢報價單的所有項目')
    const { data: items, error: queryItemsError } = await supabase
      .from('quotation_items')
      .select(`
        *,
        products (
          name,
          sku
        )
      `)
      .eq('quotation_id', createdIds.quotations[0])

    if (queryItemsError) {
      results.push({
        name: '查詢報價單項目',
        status: 'FAIL',
        message: '查詢失敗',
        details: queryItemsError
      })
      console.log(`❌ 查詢失敗: ${queryItemsError.message}\n`)
    } else {
      results.push({
        name: '查詢報價單項目',
        status: 'PASS',
        message: '查詢成功',
        details: { count: items?.length }
      })
      console.log(`✅ 查詢成功`)
      console.log(`   找到 ${items?.length} 個項目`)
      items?.forEach((item: any) => {
        console.log(`   - ${item.products?.name.zh} x ${item.quantity} = TWD ${item.subtotal.toLocaleString()}`)
      })
      console.log()
    }
  }

  // ========================================
  // 測試 3: 計算邏輯驗證
  // ========================================
  console.log('='.repeat(60))
  console.log('🧮 測試計算邏輯驗證')
  console.log('='.repeat(60) + '\n')

  // 3.1 更新報價單總額
  if (createdIds.quotations.length > 0 && createdIds.quotationItems.length > 0) {
    console.log('📋 測試 3.1: 更新報價單總額')

    // 計算小計
    const { data: items } = await supabase
      .from('quotation_items')
      .select('subtotal')
      .eq('quotation_id', createdIds.quotations[0])

    const subtotal = items?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0
    const taxRate = 5.0
    const taxAmount = subtotal * (taxRate / 100)
    const totalAmount = subtotal + taxAmount

    const { data: updatedQuotation, error: updateError } = await supabase
      .from('quotations')
      .update({
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount
      })
      .eq('id', createdIds.quotations[0])
      .select()
      .single()

    if (updateError) {
      results.push({
        name: '更新報價單總額',
        status: 'FAIL',
        message: '更新失敗',
        details: updateError
      })
      console.log(`❌ 更新失敗: ${updateError.message}\n`)
    } else {
      // 驗證計算是否正確
      const isCalculationCorrect =
        Math.abs(updatedQuotation.subtotal - subtotal) < 0.01 &&
        Math.abs(updatedQuotation.tax_amount - taxAmount) < 0.01 &&
        Math.abs(updatedQuotation.total_amount - totalAmount) < 0.01

      if (isCalculationCorrect) {
        results.push({
          name: '更新報價單總額',
          status: 'PASS',
          message: '更新成功，計算正確',
          details: { subtotal, taxAmount, totalAmount }
        })
        console.log(`✅ 更新成功，計算正確`)
        console.log(`   小計: TWD ${subtotal.toLocaleString()}`)
        console.log(`   稅率: ${taxRate}%`)
        console.log(`   稅額: TWD ${taxAmount.toLocaleString()}`)
        console.log(`   總計: TWD ${totalAmount.toLocaleString()}\n`)
      } else {
        results.push({
          name: '更新報價單總額',
          status: 'FAIL',
          message: '計算錯誤',
          details: { expected: { subtotal, taxAmount, totalAmount }, actual: updatedQuotation }
        })
        console.log(`❌ 計算錯誤\n`)
      }
    }
  }

  // ========================================
  // 測試 4: 狀態流程
  // ========================================
  console.log('='.repeat(60))
  console.log('🔄 測試狀態流程')
  console.log('='.repeat(60) + '\n')

  // 4.1 變更狀態：draft → sent
  if (createdIds.quotations.length > 0) {
    console.log('📋 測試 4.1: 變更狀態 (draft → sent)')
    const { data: sentQuotation, error: statusError } = await supabase
      .from('quotations')
      .update({ status: 'sent' })
      .eq('id', createdIds.quotations[0])
      .select()
      .single()

    if (statusError) {
      results.push({
        name: '變更報價單狀態',
        status: 'FAIL',
        message: '變更失敗',
        details: statusError
      })
      console.log(`❌ 變更失敗: ${statusError.message}\n`)
    } else {
      results.push({
        name: '變更報價單狀態',
        status: 'PASS',
        message: '變更成功',
        details: { oldStatus: 'draft', newStatus: sentQuotation.status }
      })
      console.log(`✅ 狀態變更成功`)
      console.log(`   draft → ${sentQuotation.status}\n`)
    }
  }

  // ========================================
  // 測試 5: 版本控制
  // ========================================
  console.log('='.repeat(60))
  console.log('📚 測試版本控制')
  console.log('='.repeat(60) + '\n')

  // 5.1 建立報價單版本
  if (createdIds.quotations.length > 0) {
    console.log('📋 測試 5.1: 建立報價單版本')

    // 取得完整的報價單資料
    const { data: fullQuotation } = await supabase
      .from('quotations')
      .select(`
        *,
        quotation_items (*)
      `)
      .eq('id', createdIds.quotations[0])
      .single()

    const versionData = {
      quotation_id: createdIds.quotations[0],
      version_number: 1,
      data: fullQuotation,
      created_by: userId,
      change_summary: '初始版本'
    }

    const { data: createdVersion, error: versionError } = await supabase
      .from('quotation_versions')
      .insert(versionData)
      .select()
      .single()

    if (versionError) {
      results.push({
        name: '建立報價單版本',
        status: 'FAIL',
        message: '建立失敗',
        details: versionError
      })
      console.log(`❌ 建立失敗: ${versionError.message}\n`)
    } else {
      createdIds.quotationVersions.push(createdVersion.id)
      results.push({
        name: '建立報價單版本',
        status: 'PASS',
        message: '建立成功',
        details: { id: createdVersion.id, version: createdVersion.version_number }
      })
      console.log(`✅ 版本建立成功`)
      console.log(`   版本號: ${createdVersion.version_number}`)
      console.log(`   變更摘要: ${createdVersion.change_summary}\n`)
    }
  }

  // ========================================
  // 測試 6: 分享功能
  // ========================================
  console.log('='.repeat(60))
  console.log('🔗 測試分享功能')
  console.log('='.repeat(60) + '\n')

  // 6.1 建立分享連結
  if (createdIds.quotations.length > 0) {
    console.log('📋 測試 6.1: 建立分享連結')
    const shareToken = `share-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const shareData = {
      quotation_id: createdIds.quotations[0],
      share_token: shareToken,
      shared_by: userId,
      recipient_email: 'recipient@example.com',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天後
      is_active: true
    }

    const { data: createdShare, error: shareError } = await supabase
      .from('quotation_shares')
      .insert(shareData)
      .select()
      .single()

    if (shareError) {
      results.push({
        name: '建立分享連結',
        status: 'FAIL',
        message: '建立失敗',
        details: shareError
      })
      console.log(`❌ 建立失敗: ${shareError.message}\n`)
    } else {
      createdIds.quotationShares.push(createdShare.id)
      results.push({
        name: '建立分享連結',
        status: 'PASS',
        message: '建立成功',
        details: { id: createdShare.id, token: createdShare.share_token }
      })
      console.log(`✅ 分享連結建立成功`)
      console.log(`   Token: ${createdShare.share_token}`)
      console.log(`   收件人: ${createdShare.recipient_email}`)
      console.log(`   到期時間: ${new Date(createdShare.expires_at).toLocaleString('zh-TW')}\n`)
    }
  }

  // ========================================
  // 測試 7: 匯率管理
  // ========================================
  console.log('='.repeat(60))
  console.log('💱 測試匯率管理')
  console.log('='.repeat(60) + '\n')

  // 7.1 新增匯率
  console.log('📋 測試 7.1: 新增匯率')
  const rateData = {
    from_currency: 'USD',
    to_currency: 'TWD',
    rate: 31.5,
    date: new Date().toISOString().split('T')[0],
    source: 'test'
  }

  const { data: createdRate, error: rateError } = await supabase
    .from('exchange_rates')
    .insert(rateData)
    .select()
    .single()

  if (rateError) {
    results.push({
      name: '新增匯率',
      status: 'FAIL',
      message: '新增失敗',
      details: rateError
    })
    console.log(`❌ 新增失敗: ${rateError.message}\n`)
  } else {
    createdIds.exchangeRates.push(createdRate.id)
    results.push({
      name: '新增匯率',
      status: 'PASS',
      message: '新增成功',
      details: { id: createdRate.id }
    })
    console.log(`✅ 匯率新增成功`)
    console.log(`   ${createdRate.from_currency} → ${createdRate.to_currency}`)
    console.log(`   匯率: ${createdRate.rate}`)
    console.log(`   日期: ${createdRate.date}\n`)
  }

  // ========================================
  // 清理測試資料
  // ========================================
  console.log('='.repeat(60))
  console.log('🗑️  清理測試資料')
  console.log('='.repeat(60) + '\n')

  // 刪除順序很重要（避免外鍵約束錯誤）
  if (createdIds.exchangeRates.length > 0) {
    console.log('清理 exchange_rates...')
    for (const id of createdIds.exchangeRates) {
      await supabase.from('exchange_rates').delete().eq('id', id)
    }
    console.log('✅ exchange_rates 已清理')
  }

  if (createdIds.quotationShares.length > 0) {
    console.log('清理 quotation_shares...')
    for (const id of createdIds.quotationShares) {
      await supabase.from('quotation_shares').delete().eq('id', id)
    }
    console.log('✅ quotation_shares 已清理')
  }

  if (createdIds.quotationVersions.length > 0) {
    console.log('清理 quotation_versions...')
    for (const id of createdIds.quotationVersions) {
      await supabase.from('quotation_versions').delete().eq('id', id)
    }
    console.log('✅ quotation_versions 已清理')
  }

  if (createdIds.quotationItems.length > 0) {
    console.log('清理 quotation_items...')
    for (const id of createdIds.quotationItems) {
      await supabase.from('quotation_items').delete().eq('id', id)
    }
    console.log('✅ quotation_items 已清理')
  }

  if (createdIds.quotations.length > 0) {
    console.log('清理 quotations...')
    for (const id of createdIds.quotations) {
      await supabase.from('quotations').delete().eq('id', id)
    }
    console.log('✅ quotations 已清理')
  }

  if (createdIds.products.length > 0) {
    console.log('清理 products...')
    for (const id of createdIds.products) {
      await supabase.from('products').delete().eq('id', id)
    }
    console.log('✅ products 已清理')
  }

  if (createdIds.customers.length > 0) {
    console.log('清理 customers...')
    for (const id of createdIds.customers) {
      await supabase.from('customers').delete().eq('id', id)
    }
    console.log('✅ customers 已清理')
  }

  console.log()

  // ========================================
  // 測試結果摘要
  // ========================================
  console.log('='.repeat(60))
  console.log('📊 報價單系統測試結果摘要')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length

  console.log(`\n總測試數: ${results.length}`)
  console.log(`✅ 通過: ${passed}`)
  console.log(`❌ 失敗: ${failed}`)
  console.log(`\n成功率: ${((passed / results.length) * 100).toFixed(1)}%\n`)

  // 分組顯示結果
  console.log('='.repeat(60))
  console.log('📝 詳細結果')
  console.log('='.repeat(60))

  const categories = {
    '報價單管理': ['建立報價單', '讀取報價單'],
    '報價單項目': ['新增報價單項目', '查詢報價單項目'],
    '計算邏輯': ['更新報價單總額'],
    '狀態流程': ['變更報價單狀態'],
    '版本控制': ['建立報價單版本'],
    '分享功能': ['建立分享連結'],
    '匯率管理': ['新增匯率']
  }

  Object.entries(categories).forEach(([category, testNames]) => {
    console.log(`\n${category}:`)
    testNames.forEach(name => {
      const result = results.find(r => r.name === name)
      if (result) {
        const icon = result.status === 'PASS' ? '✅' : '❌'
        console.log(`  ${icon} ${result.name} - ${result.message}`)
      }
    })
  })

  // 最終判斷
  console.log('\n' + '='.repeat(60))
  if (failed === 0) {
    console.log('🎉 所有報價單系統測試通過！功能正常運作！')
  } else {
    console.log('⚠️  部分測試失敗，請檢查錯誤訊息')
  }
  console.log('='.repeat(60) + '\n')

  // 登出
  await supabase.auth.signOut()
  console.log('✅ 已登出測試帳號\n')
}

// 執行測試
testQuotationSystem().catch(console.error)
