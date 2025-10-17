/**
 * 建立測試數據到 Zeabur PostgreSQL
 * 使用方式：npx tsx scripts/create-test-data.ts <user_id>
 *
 * user_id 可以從 Supabase Dashboard -> Authentication -> Users 獲取
 */

import { Pool } from 'pg'

// 從環境變數獲取 Zeabur PostgreSQL 連線字串
const connectionString = process.env.ZEABUR_POSTGRES_URL

if (!connectionString) {
  console.error('❌ 錯誤：未設定 ZEABUR_POSTGRES_URL 環境變數')
  console.error('請在 .env.local 檔案中設置資料庫連線字串')
  process.exit(1)
}

// 從命令列參數獲取 user_id
const userId = process.argv[2]

if (!userId) {
  console.error('❌ 錯誤：請提供 User ID')
  console.error('使用方式：npx tsx scripts/create-test-data.ts <user_id>')
  console.error('\n您可以從以下位置獲取 User ID:')
  console.error('1. 登入系統後，前往 Supabase Dashboard')
  console.error('2. 點擊 Authentication -> Users')
  console.error('3. 複製您的 User ID (UUID 格式)')
  process.exit(1)
}

// UUID 格式驗證
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(userId)) {
  console.error('❌ 錯誤：User ID 格式不正確')
  console.error('User ID 應該是 UUID 格式，例如：a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function createTestData() {
  const client = await pool.connect()

  try {
    console.log('========================================')
    console.log('🌱 建立測試數據')
    console.log('========================================')
    console.log(`User ID: ${userId}`)
    console.log('')

    // 開始交易
    await client.query('BEGIN')

    // 1. 建立測試客戶
    console.log('📋 建立測試客戶...')
    await client.query(`
      INSERT INTO customers (id, user_id, name, email, phone, address, tax_id, contact_person)
      VALUES
        ('c1111111-1111-1111-1111-111111111111', $1,
         '{"zh": "台灣科技股份有限公司", "en": "Taiwan Tech Corp."}',
         'contact@taiwantech.com.tw', '+886-2-2345-6789',
         '{"zh": "台北市信義區信義路五段7號", "en": "No.7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City"}',
         '12345678', '{"zh": "王大明", "en": "David Wang"}'),
        ('c2222222-2222-2222-2222-222222222222', $1,
         '{"zh": "優質貿易有限公司", "en": "Quality Trading Ltd."}',
         'info@qualitytrading.com', '+886-3-1234-5678',
         '{"zh": "新竹市東區光復路二段101號", "en": "No.101, Sec. 2, Guangfu Rd., East Dist., Hsinchu City"}',
         '87654321', '{"zh": "李小華", "en": "Lisa Lee"}'),
        ('c3333333-3333-3333-3333-333333333333', $1,
         '{"zh": "創新設計工作室", "en": "Innovation Design Studio"}',
         'hello@innovationdesign.tw', '+886-4-5678-1234',
         '{"zh": "台中市西屯區台灣大道三段99號", "en": "No.99, Sec. 3, Taiwan Blvd., Xitun Dist., Taichung City"}',
         NULL, '{"zh": "陳美玲", "en": "Meiling Chen"}'),
        ('c4444444-4444-4444-4444-444444444444', $1,
         '{"zh": "全球物流企業", "en": "Global Logistics Enterprise"}',
         'service@globallogistics.com.tw', '+886-7-9876-5432',
         '{"zh": "高雄市前鎮區中山三路132號", "en": "No.132, Zhongshan 3rd Rd., Qianzhen Dist., Kaohsiung City"}',
         '11223344', '{"zh": "張建國", "en": "Johnson Chang"}'),
        ('c5555555-5555-5555-5555-555555555555', $1,
         '{"zh": "美國進口商公司", "en": "American Importer Inc."}',
         'orders@americanimporter.com', '+1-415-555-0123',
         '{"zh": "美國加州舊金山市場街123號", "en": "123 Market St, San Francisco, CA 94103, USA"}',
         NULL, '{"zh": "約翰史密斯", "en": "John Smith"}')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        updated_at = NOW()
    `, [userId])
    console.log('✅ 已建立 5 個測試客戶')

    // 2. 建立測試產品
    console.log('📦 建立測試產品...')
    await client.query(`
      INSERT INTO products (id, user_id, sku, name, description, unit_price, currency)
      VALUES
        ('p1111111-1111-1111-1111-111111111111', $1, 'LAPTOP-001',
         '{"zh": "筆記型電腦", "en": "Laptop Computer"}',
         '{"zh": "15.6吋 Intel i7 16GB RAM 512GB SSD", "en": "15.6\\" Intel i7 16GB RAM 512GB SSD"}',
         35000, 'TWD'),
        ('p2222222-2222-2222-2222-222222222222', $1, 'MOUSE-001',
         '{"zh": "無線滑鼠", "en": "Wireless Mouse"}',
         '{"zh": "2.4GHz 無線連接 人體工學設計", "en": "2.4GHz Wireless Ergonomic Design"}',
         800, 'TWD'),
        ('p3333333-3333-3333-3333-333333333333', $1, 'KEYBOARD-001',
         '{"zh": "機械式鍵盤", "en": "Mechanical Keyboard"}',
         '{"zh": "青軸 RGB 背光 104鍵", "en": "Blue Switch RGB Backlit 104 Keys"}',
         2500, 'TWD'),
        ('p4444444-4444-4444-4444-444444444444', $1, 'MONITOR-001',
         '{"zh": "27吋 4K 顯示器", "en": "27\\" 4K Monitor"}',
         '{"zh": "4K UHD IPS 面板 HDR400", "en": "4K UHD IPS Panel HDR400"}',
         12000, 'TWD'),
        ('p5555555-5555-5555-5555-555555555555', $1, 'WEBCAM-001',
         '{"zh": "網路攝影機", "en": "Webcam"}',
         '{"zh": "1080P 自動對焦 內建麥克風", "en": "1080P Auto Focus Built-in Mic"}',
         1500, 'TWD'),
        ('p6666666-6666-6666-6666-666666666666', $1, 'HDD-001',
         '{"zh": "外接硬碟 1TB", "en": "External HDD 1TB"}',
         '{"zh": "USB 3.0 2.5吋 便攜式", "en": "USB 3.0 2.5\\" Portable"}',
         1800, 'TWD'),
        ('p7777777-7777-7777-7777-777777777777', $1, 'PRINTER-001',
         '{"zh": "多功能印表機", "en": "Multifunction Printer"}',
         '{"zh": "列印/掃描/影印 無線連接", "en": "Print/Scan/Copy Wireless"}',
         8500, 'TWD'),
        ('p8888888-8888-8888-8888-888888888888', $1, 'CHAIR-001',
         '{"zh": "辦公椅", "en": "Office Chair"}',
         '{"zh": "人體工學 腰部支撐 可調式扶手", "en": "Ergonomic Lumbar Support Adjustable Arms"}',
         4500, 'TWD'),
        ('p9999999-9999-9999-9999-999999999999', $1, 'BAG-001',
         '{"zh": "電腦包", "en": "Laptop Bag"}',
         '{"zh": "15吋 防水 多夾層設計", "en": "15\\" Waterproof Multiple Compartments"}',
         1200, 'TWD'),
        ('paaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', $1, 'HUB-001',
         '{"zh": "USB 集線器", "en": "USB Hub"}',
         '{"zh": "7埠 USB 3.0 附電源", "en": "7-Port USB 3.0 Powered"}',
         600, 'TWD')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        unit_price = EXCLUDED.unit_price,
        updated_at = NOW()
    `, [userId])
    console.log('✅ 已建立 10 個測試產品')

    // 3. 建立測試報價單
    console.log('💰 建立測試報價單...')
    const today = new Date().toISOString().split('T')[0]
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const validUntil = nextMonth.toISOString().split('T')[0]

    await client.query(`
      INSERT INTO quotations (id, user_id, customer_id, quotation_number, status, issue_date, valid_until, currency, subtotal, tax_rate, tax_amount, total_amount, notes)
      VALUES
        ('q1111111-1111-1111-1111-111111111111', $1, 'c1111111-1111-1111-1111-111111111111',
         'Q2025-001', 'draft', $2, $3, 'TWD', 49000, 5, 2450, 51450, '測試報價單 - 草稿狀態'),
        ('q2222222-2222-2222-2222-222222222222', $1, 'c2222222-2222-2222-2222-222222222222',
         'Q2025-002', 'sent', $2, $3, 'TWD', 26500, 5, 1325, 27825, '測試報價單 - 已發送'),
        ('q3333333-3333-3333-3333-333333333333', $1, 'c3333333-3333-3333-3333-333333333333',
         'Q2025-003', 'accepted', $2, $3, 'TWD', 38400, 5, 1920, 40320, '測試報價單 - 已接受'),
        ('q4444444-4444-4444-4444-444444444444', $1, 'c5555555-5555-5555-5555-555555555555',
         'Q2025-004', 'sent', $2, $3, 'USD', 1512, 0, 0, 1512, 'Test quotation - Sent to US customer'),
        ('q5555555-5555-5555-5555-555555555555', $1, 'c4444444-4444-4444-4444-444444444444',
         'Q2025-005', 'rejected', $2, $3, 'TWD', 15000, 5, 750, 15750, '測試報價單 - 已拒絕')
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        subtotal = EXCLUDED.subtotal,
        tax_amount = EXCLUDED.tax_amount,
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW()
    `, [userId, today, validUntil])
    console.log('✅ 已建立 5 個測試報價單')

    // 4. 建立報價單項目
    console.log('📝 建立報價單項目...')
    await client.query(`
      INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount, subtotal)
      VALUES
        -- Q2025-001 items
        ('q1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 1, 35000, 0, 35000),
        ('q1111111-1111-1111-1111-111111111111', 'p4444444-4444-4444-4444-444444444444', 1, 12000, 0, 12000),
        ('q1111111-1111-1111-1111-111111111111', 'p3333333-3333-3333-3333-333333333333', 1, 2500, 10, 2250),
        -- Q2025-002 items
        ('q2222222-2222-2222-2222-222222222222', 'p7777777-7777-7777-7777-777777777777', 2, 8500, 0, 17000),
        ('q2222222-2222-2222-2222-222222222222', 'p8888888-8888-8888-8888-888888888888', 2, 4500, 5, 8550),
        ('q2222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222222', 2, 800, 0, 1600),
        -- Q2025-003 items
        ('q3333333-3333-3333-3333-333333333333', 'p4444444-4444-4444-4444-444444444444', 3, 12000, 0, 36000),
        ('q3333333-3333-3333-3333-333333333333', 'p5555555-5555-5555-5555-555555555555', 2, 1500, 0, 3000),
        -- Q2025-004 items (USD)
        ('q4444444-4444-4444-4444-444444444444', 'p1111111-1111-1111-1111-111111111111', 1, 1080, 0, 1080),
        ('q4444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444444', 1, 360, 0, 360),
        ('q4444444-4444-4444-4444-444444444444', 'p3333333-3333-3333-3333-333333333333', 1, 72, 0, 72),
        -- Q2025-005 items
        ('q5555555-5555-5555-5555-555555555555', 'p6666666-6666-6666-6666-666666666666', 5, 1800, 0, 9000),
        ('q5555555-5555-5555-5555-555555555555', 'p9999999-9999-9999-9999-999999999999', 5, 1200, 0, 6000)
      ON CONFLICT DO NOTHING
    `)
    console.log('✅ 已建立報價單項目')

    // 提交交易
    await client.query('COMMIT')

    console.log('')
    console.log('========================================')
    console.log('✅ 測試數據建立成功！')
    console.log('========================================')
    console.log('')
    console.log('已建立的測試數據：')
    console.log('  📋 5 個客戶')
    console.log('  📦 10 個產品')
    console.log('  💰 5 個報價單（各種狀態）')
    console.log('  📝 13 個報價單項目')
    console.log('')
    console.log('您現在可以：')
    console.log('  1. 前往 http://localhost:3000')
    console.log('  2. 使用 Google OAuth 登入')
    console.log('  3. 測試各項功能')
    console.log('========================================')

  } catch (error) {
    // 回滾交易
    await client.query('ROLLBACK')
    console.error('\n❌ 錯誤：建立測試數據失敗')
    console.error(error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

createTestData()
