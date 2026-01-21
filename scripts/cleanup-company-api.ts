/**
 * 清理振禾有限公司測試資料（使用 Supabase REST API）
 * Company ID: 9a987505-5044-493c-bb63-cba891bb79df
 *
 * 執行方式:
 *   pnpm tsx scripts/cleanup-company-api.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 載入環境變數
config({ path: '.env.local' })

const COMPANY_ID = '9a987505-5044-493c-bb63-cba891bb79df'

// 從環境變數獲取
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 環境變數')
  console.error('請確保 .env.local 包含 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupTestData() {
  console.log('🧹 開始清理振禾有限公司測試資料...')
  console.log(`Company ID: ${COMPANY_ID}`)

  try {
    // 1. 獲取公司資訊
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', COMPANY_ID)
      .single()

    if (companyError || !company) {
      console.log('✅ 公司不存在，無需清理')
      return
    }

    const companyName = company.name?.zh || company.name?.en || 'N/A'

    console.log(`\n📊 公司資訊:`)
    console.log(`   名稱: ${companyName}`)
    console.log(`   ID: ${company.id}`)

    // 2. 統計資料
    const [
      { count: invoices },
      { count: journals },
      { count: quotations },
      { count: customers },
      { count: products },
    ] = await Promise.all([
      supabase.from('accounting_invoices').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID),
      supabase.from('accounting_journal_entries').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID),
      supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID),
    ])

    console.log(`\n📋 即將刪除的資料統計:`)
    console.log(`   發票: ${invoices || 0} 張`)
    console.log(`   傳票: ${journals || 0} 筆`)
    console.log(`   報價單: ${quotations || 0} 份`)
    console.log(`   客戶: ${customers || 0} 位`)
    console.log(`   產品: ${products || 0} 個`)

    // 3. 開始刪除
    console.log('\n🗑️ 開始刪除...')

    // 先獲取所有 invoice IDs
    const { data: invoiceList } = await supabase
      .from('accounting_invoices')
      .select('id')
      .eq('company_id', COMPANY_ID)

    if (invoiceList && invoiceList.length > 0) {
      const invoiceIds = invoiceList.map(i => i.id)
      await supabase.from('accounting_invoice_items').delete().in('invoice_id', invoiceIds)
      console.log(`   ✅ 已刪除 ${invoiceList.length} 張發票的項目`)
    }

    const { error: invoicesError } = await supabase
      .from('accounting_invoices')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (invoicesError) console.error('   ❌ 發票刪除失敗:', invoicesError)
    else console.log(`   ✅ 已刪除發票`)

    // 傳票
    const { data: journalList } = await supabase
      .from('accounting_journal_entries')
      .select('id')
      .eq('company_id', COMPANY_ID)

    if (journalList && journalList.length > 0) {
      const journalIds = journalList.map(j => j.id)
      await supabase.from('accounting_journal_entry_lines').delete().in('entry_id', journalIds)
      console.log(`   ✅ 已刪除 ${journalList.length} 筆傳票的分錄`)
    }

    const { error: journalsError } = await supabase
      .from('accounting_journal_entries')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (journalsError) console.error('   ❌ 傳票刪除失敗:', journalsError)
    else console.log(`   ✅ 已刪除傳票`)

    // 報價單項目
    const { data: quotationList } = await supabase
      .from('quotations')
      .select('id')
      .eq('company_id', COMPANY_ID)

    if (quotationList && quotationList.length > 0) {
      const quotationIds = quotationList.map(q => q.id)
      await supabase.from('quotation_items').delete().in('quotation_id', quotationIds)
      console.log(`   ✅ 已刪除 ${quotationList.length} 份報價單的項目`)
    }

    const { error: quotationsError } = await supabase
      .from('quotations')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (quotationsError) console.error('   ❌ 報價單刪除失敗:', quotationsError)
    else console.log(`   ✅ 已刪除報價單`)

    // 其他資料表
    const tables = [
      { name: '付款記錄', table: 'payments' },
      { name: '客戶', table: 'customers' },
      { name: '產品', table: 'products' },
      { name: '供應商', table: 'suppliers' },
      { name: '訂單', table: 'orders' },
      { name: '出貨', table: 'shipments' },
      { name: '合約', table: 'contracts' },
      { name: '訂閱', table: 'subscriptions' },
      { name: '公司設定', table: 'company_settings' },
    ]

    for (const { name, table } of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('company_id', COMPANY_ID)

      if (error) {
        console.error(`   ⚠️ ${name}刪除失敗:`, error.message)
      } else {
        console.log(`   ✅ 已刪除${name}`)
      }
    }

    // 最後刪除公司
    const { error: companyDeleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', COMPANY_ID)

    if (companyDeleteError) {
      console.error('   ❌ 公司刪除失敗:', companyDeleteError)
      throw companyDeleteError
    }

    console.log(`   ✅ 已刪除公司`)
    console.log('\n✅ 清理完成！振禾有限公司的所有測試資料已刪除')

  } catch (error) {
    console.error('\n❌ 清理過程發生錯誤:', error)
    throw error
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
