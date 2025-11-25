/**
 * 收款管理測試資料建立腳本（使用 API）
 *
 * 功能：
 * 1. 建立測試客戶
 * 2. 建立測試產品
 * 3. 建立測試報價單
 * 4. 將報價單轉換為合約，自動建立付款排程
 *
 * 使用方法：
 *   1. 啟動開發伺服器: pnpm run dev
 *   2. 在瀏覽器中登入系統
 *   3. 執行腳本: TEST_USER_ID="your-user-id" pnpm run seed:payments
 *
 * 注意：此腳本需要取得使用者的 session cookie 才能呼叫 API
 */

import fs from 'fs'
import path from 'path'

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Cookie 檔案路徑
const COOKIE_FILE = path.join(process.cwd(), '.dev-session-cookie')

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let cookie = ''

  // 嘗試從檔案讀取 cookie
  if (fs.existsSync(COOKIE_FILE)) {
    cookie = fs.readFileSync(COOKIE_FILE, 'utf-8').trim()
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers
    }
  })

  // 如果是 401，提示用戶需要登入
  if (response.status === 401) {
    console.error('\n❌ 未授權：請先登入系統')
    console.error('\n💡 解決方案：')
    console.error('   1. 啟動開發伺服器: pnpm run dev')
    console.error('   2. 在瀏覽器中登入: http://localhost:3000')
    console.error('   3. 在瀏覽器 console 執行以下腳本取得 cookie：')
    console.error('   ')
    console.error('      document.cookie.split(";").map(c => c.trim()).filter(c => c.startsWith("next-auth")).join("; ")')
    console.error('   ')
    console.error('   4. 將取得的 cookie 內容儲存到檔案：')
    console.error(`      echo "your-cookie-here" > ${COOKIE_FILE}`)
    console.error('   5. 重新執行腳本')
    process.exit(1)
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { error?: string; message?: string }
    throw new Error(`API 錯誤 (${response.status}): ${errorData.error || errorData.message || response.statusText}`)
  }

  return response
}

async function seedPaymentTestData() {
  console.log('🌱 開始建立收款管理測試資料（透過 API）...\n')

  try {
    // 步驟 1: 建立測試客戶
    console.log('👥 建立測試客戶...')
    const customers = [
      {
        name: '台灣科技股份有限公司',
        email: 'contact@twtech.com.tw',
        phone: '+886-2-2345-6789',
        address: '台北市信義區信義路五段7號',
        tax_id: '12345678',
        contact_person: '王大明'
      },
      {
        name: '環球貿易有限公司',
        email: 'info@globaltrading.com',
        phone: '+886-4-2234-5678',
        address: '台中市西區公益路123號',
        tax_id: '23456789',
        contact_person: '李小華'
      },
      {
        name: '創新軟體開發公司',
        email: 'hello@innovsoft.com',
        phone: '+886-7-123-4567',
        address: '高雄市前金區中正四路56號',
        tax_id: '34567890',
        contact_person: '陳志明'
      }
    ]

    const createdCustomers = []
    for (const customerData of customers) {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        body: JSON.stringify(customerData)
      })

      const customer = await response.json() as { id: string; name: { zh: string } }
      createdCustomers.push(customer)
      console.log(`  ✓ 已建立客戶: ${customer.name.zh}`)
    }
    console.log(`✅ 成功建立 ${createdCustomers.length} 個客戶`)
    console.log()

    // 步驟 2: 建立測試產品
    console.log('📦 建立測試產品...')
    const products = [
      {
        name: '企業網站設計',
        description: '專業響應式網站設計與開發',
        unit_price: 150000,
        currency: 'TWD',
        category: 'web_design',
        base_price: 150000
      },
      {
        name: '手機應用程式開發',
        description: 'iOS/Android 原生應用開發',
        unit_price: 300000,
        currency: 'TWD',
        category: 'mobile_dev',
        base_price: 300000
      }
    ]

    const createdProducts = []
    for (const productData of products) {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        body: JSON.stringify(productData)
      })

      const product = await response.json() as { id: string; name: { zh: string }; unit_price: number; currency: string }
      createdProducts.push(product)
      console.log(`  ✓ 已建立產品: ${product.name.zh} (${product.currency} ${product.unit_price.toLocaleString()})`)
    }
    console.log(`✅ 成功建立 ${createdProducts.length} 個產品`)
    console.log()

    // 步驟 3: 建立測試報價單
    console.log('📝 建立測試報價單...')
    const today = new Date()
    const thirtyDaysLater = new Date(today)
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

    const quotations = [
      {
        customer_id: createdCustomers[0].id,
        status: 'draft',
        issue_date: today.toISOString().split('T')[0],
        valid_until: thirtyDaysLater.toISOString().split('T')[0],
        currency: 'TWD',
        tax_rate: 0.05,
        items: [
          {
            product_id: createdProducts[0].id,
            description: '企業網站設計',
            quantity: 1,
            unit_price: createdProducts[0].unit_price,
            discount: 0
          }
        ]
      },
      {
        customer_id: createdCustomers[1].id,
        status: 'draft',
        issue_date: today.toISOString().split('T')[0],
        valid_until: thirtyDaysLater.toISOString().split('T')[0],
        currency: 'TWD',
        tax_rate: 0.05,
        items: [
          {
            product_id: createdProducts[1].id,
            description: '手機應用程式開發',
            quantity: 1,
            unit_price: createdProducts[1].unit_price,
            discount: 0
          }
        ]
      },
      {
        customer_id: createdCustomers[2].id,
        status: 'draft',
        issue_date: today.toISOString().split('T')[0],
        valid_until: thirtyDaysLater.toISOString().split('T')[0],
        currency: 'TWD',
        tax_rate: 0.05,
        items: [
          {
            product_id: createdProducts[0].id,
            description: '企業網站設計',
            quantity: 2,
            unit_price: createdProducts[0].unit_price,
            discount: 0.1
          },
          {
            product_id: createdProducts[1].id,
            description: '手機應用程式開發',
            quantity: 1,
            unit_price: createdProducts[1].unit_price,
            discount: 0
          }
        ]
      }
    ]

    const createdQuotations = []
    for (const quotationData of quotations) {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/quotations`, {
        method: 'POST',
        body: JSON.stringify(quotationData)
      })

      const quotation = await response.json() as { id: string; quotation_number: string; total_amount: number; currency: string }
      createdQuotations.push(quotation)
      console.log(`  ✓ 已建立報價單: ${quotation.quotation_number} (${quotation.currency} ${quotation.total_amount.toLocaleString()})`)
    }
    console.log(`✅ 成功建立 ${createdQuotations.length} 個報價單`)
    console.log()

    // 步驟 4: 將報價單轉換為合約
    console.log('📋 將報價單轉換為合約...')
    const contracts = []
    const paymentFrequencies = ['monthly', 'quarterly', 'semi_annual'] as const

    for (let i = 0; i < createdQuotations.length; i++) {
      const quotation = createdQuotations[i]
      const signedDate = new Date(today)
      signedDate.setDate(signedDate.getDate() - 30) // 30 天前簽約
      const expiryDate = new Date(signedDate)
      expiryDate.setFullYear(expiryDate.getFullYear() + 1) // 一年期合約

      const contractData = {
        quotation_id: quotation.id,
        signed_date: signedDate.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        payment_frequency: paymentFrequencies[i % paymentFrequencies.length],
        payment_day: 5
      }

      const response = await fetchWithAuth(`${API_BASE_URL}/api/contracts/from-quotation`, {
        method: 'POST',
        body: JSON.stringify(contractData)
      })

      const result = await response.json() as { data: { contract: { contract_number: string } } }
      contracts.push(result.data.contract)
      console.log(`  ✓ 已建立合約: ${result.data.contract.contract_number} (付款頻率: ${contractData.payment_frequency})`)
    }
    console.log(`✅ 成功建立 ${contracts.length} 個合約`)
    console.log()

    console.log('✅ 收款管理測試資料建立完成！')
    console.log()
    console.log('📝 測試資料摘要：')
    console.log(`   • 客戶數: ${createdCustomers.length}`)
    console.log(`   • 產品數: ${createdProducts.length}`)
    console.log(`   • 報價單數: ${createdQuotations.length}`)
    console.log(`   • 合約數: ${contracts.length}`)
    console.log()
    console.log('💡 下一步：')
    console.log('   1. 重新整理瀏覽器頁面')
    console.log('   2. 查看儀表板統計是否顯示正確數據')
    console.log('   3. 檢查收款管理頁面')

  } catch (error) {
    console.error('\n❌ 發生錯誤:', error)
    if (error instanceof Error) {
      console.error('錯誤訊息:', error.message)
    }
    process.exit(1)
  }
}

// 執行腳本
seedPaymentTestData()
