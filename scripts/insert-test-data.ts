#!/usr/bin/env tsx

/**
 * 插入測試數據到 Zeabur PostgreSQL
 * 包含：客戶、產品、報價單、報價單項目
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

// 手動載入 .env.local
const envPath = join(process.cwd(), '.env.local')
if (readFileSync(envPath, 'utf-8')) {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=')
        process.env[key] = value
      }
    }
  })
}

const connectionString = process.env.ZEABUR_POSTGRES_URL

if (!connectionString) {
  console.error('❌ ZEABUR_POSTGRES_URL 未設置')
  process.exit(1)
}

// 從命令列參數獲取 user_id
const userId = process.argv[2]

if (!userId) {
  console.error('❌ 請提供 user_id')
  console.error('')
  console.error('使用方法：')
  console.error('  npx tsx scripts/insert-test-data.ts YOUR_USER_ID')
  console.error('')
  console.error('如何獲取 user_id：')
  console.error('  1. 登入系統 http://localhost:3000')
  console.error('  2. 打開瀏覽器 Console')
  console.error('  3. 執行：await fetch("/api/me").then(r => r.json())')
  console.error('')
  process.exit(1)
}

console.log('🎨 插入測試數據到 Zeabur PostgreSQL')
console.log('========================================')
console.log(`👤 User ID: ${userId}`)
console.log('')

async function insertTestData() {
  const client = new Client({
    connectionString,
    ssl: false
  })

  try {
    await client.connect()
    console.log('✅ 連接成功')
    console.log('')

    // 開始事務
    await client.query('BEGIN')

    // ========================================
    // 1. 插入客戶 (10 個)
    // ========================================
    console.log('📋 插入客戶資料...')

    const customers = [
      {
        name: { zh: '台灣科技股份有限公司', en: 'Taiwan Tech Co., Ltd.' },
        email: 'contact@taiwantech.com.tw',
        phone: '02-2345-6789',
        address: { zh: '台北市信義區信義路五段7號', en: '7 Xinyi Rd., Xinyi Dist., Taipei City' },
        tax_id: '12345678',
        contact_person: { zh: '張經理', en: 'Manager Zhang' }
      },
      {
        name: { zh: '優質貿易有限公司', en: 'Premium Trade Ltd.' },
        email: 'sales@premiumtrade.com',
        phone: '03-1234-5678',
        address: { zh: '新竹市東區光復路一段123號', en: '123 Guangfu Rd., East Dist., Hsinchu City' },
        tax_id: '23456789',
        contact_person: { zh: '李小姐', en: 'Ms. Li' }
      },
      {
        name: { zh: '創新設計工作室', en: 'Innovation Design Studio' },
        email: 'hello@innovationdesign.tw',
        phone: '04-2345-6789',
        address: { zh: '台中市西屯區台灣大道三段200號', en: '200 Taiwan Blvd., Xitun Dist., Taichung City' },
        tax_id: null,
        contact_person: { zh: '王設計師', en: 'Designer Wang' }
      },
      {
        name: { zh: '全球物流企業社', en: 'Global Logistics Enterprise' },
        email: 'info@globallogistics.com',
        phone: '07-3456-7890',
        address: { zh: '高雄市前鎮區中山三路50號', en: '50 Zhongshan 3rd Rd., Qianzhen Dist., Kaohsiung City' },
        tax_id: '34567890',
        contact_person: { zh: '陳主任', en: 'Director Chen' }
      },
      {
        name: { zh: '美國進口商公司', en: 'US Import Company' },
        email: 'purchase@usimport.com',
        phone: '+1-415-555-0123',
        address: { zh: '美國舊金山市場街100號', en: '100 Market St., San Francisco, CA' },
        tax_id: null,
        contact_person: { zh: 'John Smith', en: 'John Smith' }
      },
      {
        name: { zh: '東南亞電子商務', en: 'Southeast Asia E-commerce' },
        email: 'support@seaecom.com',
        phone: '+65-6789-0123',
        address: { zh: '新加坡烏節路88號', en: '88 Orchard Road, Singapore' },
        tax_id: null,
        contact_person: { zh: 'Tan Wei Ming', en: 'Tan Wei Ming' }
      },
      {
        name: { zh: '日本精密工業株式會社', en: 'Japan Precision Industries Inc.' },
        email: 'sales@jprecision.jp',
        phone: '+81-3-1234-5678',
        address: { zh: '日本東京都千代田區丸之內1-1', en: '1-1 Marunouchi, Chiyoda-ku, Tokyo, Japan' },
        tax_id: null,
        contact_person: { zh: '佐藤先生', en: 'Mr. Sato' }
      },
      {
        name: { zh: '歐洲時尚集團', en: 'European Fashion Group' },
        email: 'contact@eufashion.eu',
        phone: '+33-1-2345-6789',
        address: { zh: '法國巴黎香榭麗舍大道100號', en: '100 Avenue des Champs-Élysées, Paris, France' },
        tax_id: null,
        contact_person: { zh: 'Sophie Dubois', en: 'Sophie Dubois' }
      },
      {
        name: { zh: '南部科技園區企業', en: 'Southern Science Park Enterprise' },
        email: 'admin@southpark.com.tw',
        phone: '06-1234-5678',
        address: { zh: '台南市新市區南科三路10號', en: '10 Nanke 3rd Rd., Xinshi Dist., Tainan City' },
        tax_id: '45678901',
        contact_person: { zh: '林總經理', en: 'General Manager Lin' }
      },
      {
        name: { zh: '北部連鎖零售商', en: 'Northern Chain Retailer' },
        email: 'procurement@northchain.tw',
        phone: '02-8765-4321',
        address: { zh: '台北市大安區復興南路一段200號', en: '200 Fuxing S. Rd., Da\'an Dist., Taipei City' },
        tax_id: '56789012',
        contact_person: { zh: '黃採購', en: 'Buyer Huang' }
      }
    ]

    const customerIds: string[] = []

    for (const customer of customers) {
      const result = await client.query(
        `INSERT INTO customers (user_id, name, email, phone, address, tax_id, contact_person)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [userId, customer.name, customer.email, customer.phone, customer.address, customer.tax_id, customer.contact_person]
      )
      customerIds.push(result.rows[0].id)
    }

    console.log(`✅ 已插入 ${customerIds.length} 個客戶`)

    // ========================================
    // 2. 插入產品 (10 個)
    // ========================================
    console.log('📦 插入產品資料...')

    const products = [
      { sku: 'LAP-001', name: { zh: '筆記型電腦 - 商務款', en: 'Laptop - Business Edition' }, description: { zh: '高效能商務筆電，適合辦公使用', en: 'High-performance business laptop' }, unit_price: 35000, category: '電腦' },
      { sku: 'MOU-001', name: { zh: '無線滑鼠 - 人體工學', en: 'Wireless Mouse - Ergonomic' }, description: { zh: '人體工學設計，長時間使用不疲勞', en: 'Ergonomic design for extended use' }, unit_price: 800, category: '週邊' },
      { sku: 'KEY-001', name: { zh: '機械式鍵盤 - RGB 背光', en: 'Mechanical Keyboard - RGB Backlit' }, description: { zh: 'RGB 背光機械鍵盤，青軸', en: 'RGB backlit mechanical keyboard, blue switches' }, unit_price: 2500, category: '週邊' },
      { sku: 'MON-001', name: { zh: '27吋 4K 顯示器', en: '27" 4K Monitor' }, description: { zh: 'IPS 面板，色彩準確', en: 'IPS panel with accurate colors' }, unit_price: 12000, category: '顯示器' },
      { sku: 'HDD-001', name: { zh: '外接硬碟 2TB', en: 'External HDD 2TB' }, description: { zh: 'USB 3.0 高速傳輸', en: 'USB 3.0 high-speed transfer' }, unit_price: 2200, category: '儲存' },
      { sku: 'WEB-001', name: { zh: '視訊攝影機 1080P', en: 'Webcam 1080P' }, description: { zh: '視訊會議專用，自動對焦', en: 'For video conferencing, auto-focus' }, unit_price: 1500, category: '週邊' },
      { sku: 'HEA-001', name: { zh: '藍牙耳機 - 降噪款', en: 'Bluetooth Headset - Noise Cancelling' }, description: { zh: '主動降噪，通話清晰', en: 'Active noise cancellation, clear calls' }, unit_price: 3500, category: '音訊' },
      { sku: 'CHA-001', name: { zh: '電競椅 - 人體工學', en: 'Gaming Chair - Ergonomic' }, description: { zh: '可調式扶手，腰部支撐', en: 'Adjustable armrests, lumbar support' }, unit_price: 8900, category: '辦公家具' },
      { sku: 'DES-001', name: { zh: '升降桌 - 電動款', en: 'Standing Desk - Electric' }, description: { zh: '電動升降，記憶高度', en: 'Electric height adjustment, memory function' }, unit_price: 15000, category: '辦公家具' },
      { sku: 'ROU-001', name: { zh: 'Wi-Fi 6 路由器', en: 'Wi-Fi 6 Router' }, description: { zh: '高速無線網路，支援 Wi-Fi 6', en: 'High-speed wireless, Wi-Fi 6 compatible' }, unit_price: 3800, category: '網路設備' }
    ]

    const productIds: string[] = []

    for (const product of products) {
      const result = await client.query(
        `INSERT INTO products (user_id, sku, name, description, unit_price, currency, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [userId, product.sku, product.name, product.description, product.unit_price, 'TWD', product.category]
      )
      productIds.push(result.rows[0].id)
    }

    console.log(`✅ 已插入 ${productIds.length} 個產品`)

    // ========================================
    // 3. 插入報價單 (8 個)
    // ========================================
    console.log('📄 插入報價單資料...')

    const quotations = [
      {
        customer_id: customerIds[0],
        status: 'draft',
        issue_date: '2025-10-10',
        valid_until: '2025-10-24',
        items: [
          { product_id: productIds[0], quantity: 5, unit_price: 35000, discount: 0 },
          { product_id: productIds[3], quantity: 5, unit_price: 12000, discount: 5 }
        ]
      },
      {
        customer_id: customerIds[1],
        status: 'sent',
        issue_date: '2025-10-12',
        valid_until: '2025-10-26',
        items: [
          { product_id: productIds[1], quantity: 20, unit_price: 800, discount: 0 },
          { product_id: productIds[2], quantity: 10, unit_price: 2500, discount: 0 }
        ]
      },
      {
        customer_id: customerIds[2],
        status: 'accepted',
        issue_date: '2025-10-08',
        valid_until: '2025-10-22',
        items: [
          { product_id: productIds[7], quantity: 3, unit_price: 8900, discount: 0 },
          { product_id: productIds[8], quantity: 3, unit_price: 15000, discount: 10 }
        ]
      },
      {
        customer_id: customerIds[3],
        status: 'sent',
        issue_date: '2025-10-15',
        valid_until: '2025-10-29',
        items: [
          { product_id: productIds[4], quantity: 10, unit_price: 2200, discount: 0 }
        ]
      },
      {
        customer_id: customerIds[4],
        status: 'draft',
        issue_date: '2025-10-16',
        valid_until: '2025-10-30',
        items: [
          { product_id: productIds[0], quantity: 10, unit_price: 35000, discount: 5 },
          { product_id: productIds[3], quantity: 10, unit_price: 12000, discount: 5 },
          { product_id: productIds[5], quantity: 10, unit_price: 1500, discount: 0 }
        ]
      },
      {
        customer_id: customerIds[5],
        status: 'accepted',
        issue_date: '2025-10-05',
        valid_until: '2025-10-19',
        items: [
          { product_id: productIds[6], quantity: 15, unit_price: 3500, discount: 0 }
        ]
      },
      {
        customer_id: customerIds[8],
        status: 'sent',
        issue_date: '2025-10-14',
        valid_until: '2025-10-28',
        items: [
          { product_id: productIds[9], quantity: 8, unit_price: 3800, discount: 0 },
          { product_id: productIds[1], quantity: 8, unit_price: 800, discount: 0 }
        ]
      },
      {
        customer_id: customerIds[9],
        status: 'rejected',
        issue_date: '2025-10-01',
        valid_until: '2025-10-15',
        items: [
          { product_id: productIds[7], quantity: 20, unit_price: 8900, discount: 15 }
        ]
      }
    ]

    let quotationNumber = 1

    for (const quotation of quotations) {
      // 計算金額
      let subtotal = 0
      const items = quotation.items

      for (const item of items) {
        const itemSubtotal = item.quantity * item.unit_price * (1 - item.discount / 100)
        subtotal += itemSubtotal
      }

      const tax_rate = 5.0
      const tax_amount = subtotal * (tax_rate / 100)
      const total_amount = subtotal + tax_amount

      // 插入報價單
      const quotationResult = await client.query(
        `INSERT INTO quotations (
          user_id, customer_id, quotation_number, status, issue_date, valid_until,
          currency, subtotal, tax_rate, tax_amount, total_amount, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          userId,
          quotation.customer_id,
          `Q2025-${quotationNumber.toString().padStart(3, '0')}`,
          quotation.status,
          quotation.issue_date,
          quotation.valid_until,
          'TWD',
          subtotal,
          tax_rate,
          tax_amount,
          total_amount,
          `測試報價單 #${quotationNumber}`
        ]
      )

      const quotationId = quotationResult.rows[0].id

      // 插入報價單項目
      for (const item of items) {
        const itemSubtotal = item.quantity * item.unit_price * (1 - item.discount / 100)

        await client.query(
          `INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [quotationId, item.product_id, item.quantity, item.unit_price, item.discount, itemSubtotal]
        )
      }

      quotationNumber++
    }

    console.log(`✅ 已插入 ${quotations.length} 個報價單`)

    // 提交事務
    await client.query('COMMIT')

    console.log('')
    console.log('==========================================')
    console.log('✅ 測試數據插入完成！')
    console.log('==========================================')
    console.log('')
    console.log('已插入：')
    console.log(`  • ${customerIds.length} 個客戶`)
    console.log(`  • ${productIds.length} 個產品`)
    console.log(`  • ${quotations.length} 個報價單`)
    console.log(`  • ${quotations.reduce((sum, q) => sum + q.items.length, 0)} 個報價單項目`)
    console.log('')
    console.log('現在可以測試系統：')
    console.log('  http://localhost:3000/zh/customers')
    console.log('  http://localhost:3000/zh/products')
    console.log('  http://localhost:3000/zh/quotations')
    console.log('')

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('')
    console.error('❌ 插入失敗！', error)
    console.error('')
    process.exit(1)
  } finally {
    await client.end()
  }
}

insertTestData()
