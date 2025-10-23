#!/usr/bin/env tsx
/**
 * 測試基本 CRUD 操作
 *
 * 測試項目：
 * 1. 客戶 (customers) CRUD
 * 2. 產品 (products) CRUD
 * 3. RLS 策略驗證
 *
 * 使用前提：
 * - 需要先在 Supabase Dashboard 建立測試使用者
 * - 或執行 test-auth-with-mailinator.ts 建立測試帳號
 *
 * 使用方式：
 * npx tsx scripts/test-crud-operations.ts <email> <password>
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
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  details?: any
}

const results: TestResult[] = []

// 從命令列參數取得帳號密碼
const email = process.argv[2]
const password = process.argv[3]

async function runCrudTests() {
  console.log('🧪 開始測試基本 CRUD 操作\n')

  // 檢查參數
  if (!email || !password) {
    console.log('❌ 錯誤：缺少必要參數\n')
    console.log('使用方式：')
    console.log('  npx tsx scripts/test-crud-operations.ts <email> <password>\n')
    console.log('範例：')
    console.log('  npx tsx scripts/test-crud-operations.ts test@example.com TestPassword123!\n')
    console.log('💡 提示：')
    console.log('  1. 先在 Supabase Dashboard > Authentication > Users 建立測試使用者')
    console.log('  2. 或執行 test-auth-with-mailinator.ts 建立測試帳號\n')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 步驟 1: 登入
  console.log('📋 步驟 1: 登入測試帳號')
  console.log(`   Email: ${email}\n`)

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (signInError || !signInData.user) {
    results.push({
      name: '使用者登入',
      status: 'FAIL',
      message: '登入失敗',
      details: signInError
    })
    console.log(`❌ 登入失敗: ${signInError?.message}`)
    console.log('\n請確認：')
    console.log('1. Email 和密碼正確')
    console.log('2. 使用者已在 Supabase Dashboard 建立')
    console.log('3. Email 已確認（或已關閉 Email 確認要求）\n')
    return
  }

  results.push({
    name: '使用者登入',
    status: 'PASS',
    message: '登入成功',
    details: { userId: signInData.user.id }
  })
  console.log(`✅ 登入成功 (User ID: ${signInData.user.id})\n`)

  const userId = signInData.user.id

  // ========================================
  // 測試 2: 客戶 CRUD
  // ========================================
  console.log('=' .repeat(60))
  console.log('📊 測試客戶 (Customers) CRUD 操作')
  console.log('='.repeat(60) + '\n')

  let customerId: string | null = null

  // 2.1 建立客戶
  console.log('📋 測試 2.1: 建立客戶 (CREATE)')
  const customerData = {
    user_id: userId,
    name: {
      zh: '測試客戶公司',
      en: 'Test Customer Company'
    },
    email: 'customer@test.com',
    phone: '+886-2-1234-5678',
    address: {
      zh: '台北市信義區信義路五段7號',
      en: '7 Xinyi Rd, Sec 5, Xinyi District, Taipei City'
    },
    tax_id: '12345678',
    contact_person: {
      name: '王小明',
      title: '採購經理',
      phone: '+886-912-345-678',
      email: 'wang@test.com'
    }
  }

  const { data: createdCustomer, error: createError } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single()

  if (createError) {
    results.push({
      name: '建立客戶',
      status: 'FAIL',
      message: '建立失敗',
      details: createError
    })
    console.log(`❌ 建立失敗: ${createError.message}\n`)
  } else {
    customerId = createdCustomer.id
    results.push({
      name: '建立客戶',
      status: 'PASS',
      message: '建立成功',
      details: { id: customerId, name: createdCustomer.name }
    })
    console.log(`✅ 建立成功`)
    console.log(`   ID: ${customerId}`)
    console.log(`   名稱: ${createdCustomer.name.zh}\n`)
  }

  // 2.2 讀取客戶
  if (customerId) {
    console.log('📋 測試 2.2: 讀取客戶 (READ)')
    const { data: readCustomer, error: readError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (readError) {
      results.push({
        name: '讀取客戶',
        status: 'FAIL',
        message: '讀取失敗',
        details: readError
      })
      console.log(`❌ 讀取失敗: ${readError.message}\n`)
    } else {
      results.push({
        name: '讀取客戶',
        status: 'PASS',
        message: '讀取成功',
        details: { id: readCustomer.id, name: readCustomer.name }
      })
      console.log(`✅ 讀取成功`)
      console.log(`   ID: ${readCustomer.id}`)
      console.log(`   名稱: ${readCustomer.name.zh}`)
      console.log(`   Email: ${readCustomer.email}\n`)
    }
  }

  // 2.3 更新客戶
  if (customerId) {
    console.log('📋 測試 2.3: 更新客戶 (UPDATE)')
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        phone: '+886-2-8765-4321',
        contact_person: {
          name: '李小華',
          title: '總經理',
          phone: '+886-987-654-321',
          email: 'lee@test.com'
        }
      })
      .eq('id', customerId)
      .select()
      .single()

    if (updateError) {
      results.push({
        name: '更新客戶',
        status: 'FAIL',
        message: '更新失敗',
        details: updateError
      })
      console.log(`❌ 更新失敗: ${updateError.message}\n`)
    } else {
      results.push({
        name: '更新客戶',
        status: 'PASS',
        message: '更新成功',
        details: {
          id: updatedCustomer.id,
          phone: updatedCustomer.phone,
          contact: updatedCustomer.contact_person.name
        }
      })
      console.log(`✅ 更新成功`)
      console.log(`   新電話: ${updatedCustomer.phone}`)
      console.log(`   新聯絡人: ${updatedCustomer.contact_person.name}\n`)
    }
  }

  // ========================================
  // 測試 3: 產品 CRUD
  // ========================================
  console.log('=' .repeat(60))
  console.log('📦 測試產品 (Products) CRUD 操作')
  console.log('='.repeat(60) + '\n')

  let productId: string | null = null

  // 3.1 建立產品
  console.log('📋 測試 3.1: 建立產品 (CREATE)')
  const productData = {
    user_id: userId,
    name: {
      zh: '高效能伺服器',
      en: 'High Performance Server'
    },
    description: {
      zh: 'Intel Xeon 處理器，64GB RAM，2TB SSD',
      en: 'Intel Xeon CPU, 64GB RAM, 2TB SSD'
    },
    category: 'hardware',
    sku: 'SRV-HP-001',
    unit: '台',
    unit_price_twd: 150000,
    cost_price_twd: 120000,
    stock_quantity: 5,
    specifications: {
      cpu: 'Intel Xeon E5-2680 v4',
      ram: '64GB DDR4',
      storage: '2TB NVMe SSD',
      warranty: '3 years'
    }
  }

  const { data: createdProduct, error: createProductError } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single()

  if (createProductError) {
    results.push({
      name: '建立產品',
      status: 'FAIL',
      message: '建立失敗',
      details: createProductError
    })
    console.log(`❌ 建立失敗: ${createProductError.message}\n`)
  } else {
    productId = createdProduct.id
    results.push({
      name: '建立產品',
      status: 'PASS',
      message: '建立成功',
      details: { id: productId, name: createdProduct.name, sku: createdProduct.sku }
    })
    console.log(`✅ 建立成功`)
    console.log(`   ID: ${productId}`)
    console.log(`   名稱: ${createdProduct.name.zh}`)
    console.log(`   SKU: ${createdProduct.sku}`)
    console.log(`   單價: NT$ ${createdProduct.unit_price_twd.toLocaleString()}\n`)
  }

  // 3.2 讀取產品
  if (productId) {
    console.log('📋 測試 3.2: 讀取產品 (READ)')
    const { data: readProduct, error: readProductError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (readProductError) {
      results.push({
        name: '讀取產品',
        status: 'FAIL',
        message: '讀取失敗',
        details: readProductError
      })
      console.log(`❌ 讀取失敗: ${readProductError.message}\n`)
    } else {
      results.push({
        name: '讀取產品',
        status: 'PASS',
        message: '讀取成功',
        details: { id: readProduct.id, name: readProduct.name }
      })
      console.log(`✅ 讀取成功`)
      console.log(`   ID: ${readProduct.id}`)
      console.log(`   名稱: ${readProduct.name.zh}`)
      console.log(`   庫存: ${readProduct.stock_quantity} ${readProduct.unit}\n`)
    }
  }

  // 3.3 更新產品
  if (productId) {
    console.log('📋 測試 3.3: 更新產品 (UPDATE)')
    const { data: updatedProduct, error: updateProductError } = await supabase
      .from('products')
      .update({
        unit_price_twd: 145000,
        stock_quantity: 3
      })
      .eq('id', productId)
      .select()
      .single()

    if (updateProductError) {
      results.push({
        name: '更新產品',
        status: 'FAIL',
        message: '更新失敗',
        details: updateProductError
      })
      console.log(`❌ 更新失敗: ${updateProductError.message}\n`)
    } else {
      results.push({
        name: '更新產品',
        status: 'PASS',
        message: '更新成功',
        details: {
          id: updatedProduct.id,
          price: updatedProduct.unit_price_twd,
          stock: updatedProduct.stock_quantity
        }
      })
      console.log(`✅ 更新成功`)
      console.log(`   新單價: NT$ ${updatedProduct.unit_price_twd.toLocaleString()}`)
      console.log(`   新庫存: ${updatedProduct.stock_quantity}\n`)
    }
  }

  // ========================================
  // 測試 4: 刪除操作（清理）
  // ========================================
  console.log('=' .repeat(60))
  console.log('🗑️  測試刪除操作 (DELETE) 與清理')
  console.log('='.repeat(60) + '\n')

  // 4.1 刪除產品
  if (productId) {
    console.log('📋 測試 4.1: 刪除產品')
    const { error: deleteProductError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (deleteProductError) {
      results.push({
        name: '刪除產品',
        status: 'FAIL',
        message: '刪除失敗',
        details: deleteProductError
      })
      console.log(`❌ 刪除失敗: ${deleteProductError.message}\n`)
    } else {
      results.push({
        name: '刪除產品',
        status: 'PASS',
        message: '刪除成功'
      })
      console.log(`✅ 刪除成功\n`)
    }
  }

  // 4.2 刪除客戶
  if (customerId) {
    console.log('📋 測試 4.2: 刪除客戶')
    const { error: deleteCustomerError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)

    if (deleteCustomerError) {
      results.push({
        name: '刪除客戶',
        status: 'FAIL',
        message: '刪除失敗',
        details: deleteCustomerError
      })
      console.log(`❌ 刪除失敗: ${deleteCustomerError.message}\n`)
    } else {
      results.push({
        name: '刪除客戶',
        status: 'PASS',
        message: '刪除成功'
      })
      console.log(`✅ 刪除成功\n`)
    }
  }

  // ========================================
  // 測試結果摘要
  // ========================================
  console.log('\n' + '='.repeat(60))
  console.log('📊 CRUD 測試結果摘要')
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
    '認證': ['使用者登入'],
    '客戶 CRUD': ['建立客戶', '讀取客戶', '更新客戶', '刪除客戶'],
    '產品 CRUD': ['建立產品', '讀取產品', '更新產品', '刪除產品']
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
    console.log('🎉 所有 CRUD 測試通過！資料庫操作功能正常！')
  } else {
    console.log('⚠️  部分測試失敗，請檢查錯誤訊息')
  }
  console.log('='.repeat(60) + '\n')

  // 登出
  await supabase.auth.signOut()
  console.log('✅ 已登出測試帳號\n')
}

// 執行測試
runCrudTests().catch(console.error)
