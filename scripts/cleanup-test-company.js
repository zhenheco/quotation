/**
 * 清理振禾有限公司測試資料
 * Company ID: 9a987505-5044-493c-bb63-cba891bb79df
 *
 * 執行方式:
 *   node -r dotenv-safe/config scripts/cleanup-test-company.js
 */

const COMPANY_ID = '9a987505-5044-493c-bb63-cba891bb79df'

// 從環境變數獲取 Supabase URL 和 Key
const SUPABASE_URL = process.env.SUPABASE_DB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 缺少 Supabase 環境變數')
  console.error('請確保 .env.local 包含 SUPABASE_DB_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 提取 PostgreSQL 連線資訊
const pgUrlMatch = SUPABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
if (!pgUrlMatch) {
  console.error('❌ 無法解析 SUPABASE_DB_URL')
  process.exit(1)
}

const [, user, password, host, port, database] = pgUrlMatch

async function cleanupTestData() {
  const { Client } = await import('pg')

  const client = new Client({
    host,
    port: parseInt(port),
    database,
    user,
    password,
  })

  try {
    await client.connect()
    console.log('✅ 已連接到資料庫')

    console.log('\n🧹 開始清理振禾有限公司測試資料...')
    console.log(`Company ID: ${COMPANY_ID}`)

    // 1. 獲取公司資訊
    const companyResult = await client.query(`
      SELECT * FROM companies WHERE id = $1
    `, [COMPANY_ID])

    if (companyResult.rows.length === 0) {
      console.log('✅ 公司不存在，無需清理')
      return
    }

    const company = companyResult.rows[0]
    const companyName = company.name?.zh || company.name?.en || 'N/A'

    console.log(`\n📊 公司資訊:`)
    console.log(`   名稱: ${companyName}`)
    console.log(`   ID: ${company.id}`)

    // 2. 統計資料
    const stats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM accounting_invoices WHERE company_id = $1) as invoices,
        (SELECT COUNT(*) FROM accounting_journal_entries WHERE company_id = $1) as journals,
        (SELECT COUNT(*) FROM quotations WHERE company_id = $1) as quotations,
        (SELECT COUNT(*) FROM customers WHERE company_id = $1) as customers,
        (SELECT COUNT(*) FROM products WHERE company_id = $1) as products
    `, [COMPANY_ID])

    const { invoices, journals, quotations, customers, products } = stats.rows[0]

    console.log(`\n📋 即將刪除的資料統計:`)
    console.log(`   發票: ${invoices || 0} 張`)
    console.log(`   傳票: ${journals || 0} 筆`)
    console.log(`   報價單: ${quotations || 0} 份`)
    console.log(`   客戶: ${customers || 0} 位`)
    console.log(`   產品: ${products || 0} 個`)

    // 3. 開始事務執行刪除
    console.log('\n🗑️ 開始刪除...')
    await client.query('BEGIN')

    try {
      // 刪除發票項目
      await client.query(`
        DELETE FROM accounting_invoice_items
        WHERE invoice_id IN (
          SELECT id FROM accounting_invoices WHERE company_id = $1
        )
      `, [COMPANY_ID])

      // 刪除發票
      const invoicesResult = await client.query(`
        DELETE FROM accounting_invoices WHERE company_id = $1
      `, [COMPANY_ID])
      console.log(`   ✅ 已刪除 ${invoicesResult.rowCount} 張發票`)

      // 刪除傳票分錄
      await client.query(`
        DELETE FROM accounting_journal_entry_lines
        WHERE entry_id IN (
          SELECT id FROM accounting_journal_entries WHERE company_id = $1
        )
      `, [COMPANY_ID])

      // 刪除傳票
      const journalsResult = await client.query(`
        DELETE FROM accounting_journal_entries WHERE company_id = $1
      `, [COMPANY_ID])
      console.log(`   ✅ 已刪除 ${journalsResult.rowCount} 筆傳票`)

      // 刪除報價單項目
      await client.query(`
        DELETE FROM quotation_items
        WHERE quotation_id IN (
          SELECT id FROM quotations WHERE company_id = $1
        )
      `, [COMPANY_ID])

      // 刪除報價單
      const quotationsResult = await client.query(`
        DELETE FROM quotations WHERE company_id = $1
      `, [COMPANY_ID])
      console.log(`   ✅ 已刪除 ${quotationsResult.rowCount} 份報價單`)

      // 刪除客戶
      const customersResult = await client.query(`
        DELETE FROM customers WHERE company_id = $1
      `, [COMPANY_ID])
      console.log(`   ✅ 已刪除 ${customersResult.rowCount} 位客戶`)

      // 刪除產品
      const productsResult = await client.query(`
        DELETE FROM products WHERE company_id = $1
      `, [COMPANY_ID])
      console.log(`   ✅ 已刪除 ${productsResult.rowCount} 個產品`)

      // 刪除供應商
      const suppliersResult = await client.query(`
        DELETE FROM suppliers WHERE company_id = $1
      `, [COMPANY_ID])
      console.log(`   ✅ 已刪除 ${suppliersResult.rowCount} 位供應商`)

      // 刪除訂單
      await client.query(`
        DELETE FROM orders WHERE company_id = $1
      `, [COMPANY_ID])

      // 刪除出貨
      await client.query(`
        DELETE FROM shipments WHERE company_id = $1
      `, [COMPANY_ID])

      // 刪除合約
      await client.query(`
        DELETE FROM contracts WHERE company_id = $1
      `, [COMPANY_ID])

      // 刪除訂閱
      await client.query(`
        DELETE FROM subscriptions WHERE company_id = $1
      `, [COMPANY_ID])

      // 刪除公司設定
      await client.query(`
        DELETE FROM company_settings WHERE company_id = $1
      `, [COMPANY_ID])

      // 刪除公司
      const companyResult = await client.query(`
        DELETE FROM companies WHERE id = $1
      `, [COMPANY_ID])
      console.log(`   ✅ 已刪除公司`)

      await client.query('COMMIT')
      console.log('\n✅ 清理完成！振禾有限公司的所有測試資料已刪除')

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('\n❌ 清理過程發生錯誤:', error)
    throw error
  } finally {
    await client.end()
    console.log('\n🔌 資料庫連線已關閉')
  }
}

// 執行清理
cleanupTestData()
  .then(() => {
    console.log('\n🎉 腳本執行成功')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 腳本執行失敗:', error)
    process.exit(1)
  })
