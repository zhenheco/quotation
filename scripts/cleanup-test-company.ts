/**
 * 清理振禾有限公司測試資料
 * Company ID: 9a987505-5044-493c-bb63-cba891bb79df
 */

// 載入環境變數
import 'dotenv-safe/config'
import { getSupabaseClient } from '../lib/db/supabase-client'

const COMPANY_ID = '9a987505-5044-493c-bb63-cba891bb79df'

async function cleanupTestData() {
  const db = getSupabaseClient()

  console.log('🧹 開始清理振禾有限公司測試資料...')
  console.log(`Company ID: ${COMPANY_ID}`)

  try {
    // 1. 獲取公司資訊（記錄用）
    const { data: company } = await db
      .from('companies')
      .select('*')
      .eq('id', COMPANY_ID)
      .single()

    if (!company) {
      console.log('✅ 公司不存在，無需清理')
      return
    }

    console.log(`\n📊 公司資訊:`)
    console.log(`   名稱: ${company.name?.zh || company.name?.en || 'N/A'}`)
    console.log(`   ID: ${company.id}`)

    // 2. 統計即將刪除的資料
    const [
      { count: invoicesCount },
      { count: journalsCount },
      { count: quotationsCount },
      { count: customersCount },
      { count: productsCount },
    ] = await Promise.all([
      db.from('accounting_invoices').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID),
      db.from('accounting_journal_entries').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID),
      db.from('quotations').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID),
      db.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID),
      db.from('products').select('id', { count: 'exact', head: true }).eq('company_id', COMPANY_ID),
    ])

    console.log(`\n📋 即將刪除的資料統計:`)
    console.log(`   發票: ${invoicesCount || 0} 張`)
    console.log(`   傳票: ${journalsCount || 0} 筆`)
    console.log(`   報價單: ${quotationsCount || 0} 份`)
    console.log(`   客戶: ${customersCount || 0} 位`)
    console.log(`   產品: ${productsCount || 0} 個`)

    // 3. 刪除會計發票項目
    console.log('\n🗑️  刪除發票項目...')
    const { error: invoiceItemsError } = await db
      .from('accounting_invoice_items')
      .delete()
      .in('invoice_id',
        (await db.from('accounting_invoices').select('id').eq('company_id', COMPANY_ID))
          .data?.map(i => i.id) || []
      )

    if (invoiceItemsError) console.error('   ❌ 發票項目刪除失敗:', invoiceItemsError)

    // 4. 刪除會計發票
    console.log('🗑️  刪除發票...')
    const { error: invoicesError } = await db
      .from('accounting_invoices')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (invoicesError) console.error('   ❌ 發票刪除失敗:', invoicesError)
    else console.log('   ✅ 發票已刪除')

    // 5. 刪除傳票分錄
    console.log('🗑️  刪除傳票分錄...')
    const { error: journalLinesError } = await db
      .from('accounting_journal_entry_lines')
      .delete()
      .in('entry_id',
        (await db.from('accounting_journal_entries').select('id').eq('company_id', COMPANY_ID))
          .data?.map(i => i.id) || []
      )

    if (journalLinesError) console.error('   ❌ 傳票分錄刪除失敗:', journalLinesError)

    // 6. 刪除傳票
    console.log('🗑️  刪除傳票...')
    const { error: journalsError } = await db
      .from('accounting_journal_entries')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (journalsError) console.error('   ❌ 傳票刪除失敗:', journalsError)
    else console.log('   ✅ 傳票已刪除')

    // 7. 刪除付款記錄
    console.log('🗑️  刪除付款記錄...')
    const { error: paymentsError } = await db
      .from('payments')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (paymentsError) console.error('   ❌ 付款記錄刪除失敗:', paymentsError)
    else console.log('   ✅ 付款記錄已刪除')

    // 8. 刪除報價單項目
    console.log('🗑️  刪除報價單項目...')
    const { error: quotationItemsError } = await db
      .from('quotation_items')
      .delete()
      .in('quotation_id',
        (await db.from('quotations').select('id').eq('company_id', COMPANY_ID))
          .data?.map(i => i.id) || []
      )

    if (quotationItemsError) console.error('   ❌ 報價單項目刪除失敗:', quotationItemsError)

    // 9. 刪除報價單
    console.log('🗑️  刪除報價單...')
    const { error: quotationsError } = await db
      .from('quotations')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (quotationsError) console.error('   ❌ 報價單刪除失敗:', quotationsError)
    else console.log('   ✅ 報價單已刪除')

    // 10. 刪除客戶
    console.log('🗑️  刪除客戶...')
    const { error: customersError } = await db
      .from('customers')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (customersError) console.error('   ❌ 客戶刪除失敗:', customersError)
    else console.log('   ✅ 客戶已刪除')

    // 11. 刪除產品
    console.log('🗑️  刪除產品...')
    const { error: productsError } = await db
      .from('products')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (productsError) console.error('   ❌ 產品刪除失敗:', productsError)
    else console.log('   ✅ 產品已刪除')

    // 12. 刪除供應商
    console.log('🗑️  刪除供應商...')
    const { error: suppliersError } = await db
      .from('suppliers')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (suppliersError) console.error('   ❌ 供應商刪除失敗:', suppliersError)
    else console.log('   ✅ 供應商已刪除')

    // 13. 刪除訂單
    console.log('🗑️  刪除訂單...')
    const { error: ordersError } = await db
      .from('orders')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (ordersError) console.error('   ❌ 訂單刪除失敗:', ordersError)
    else console.log('   ✅ 訂單已刪除')

    // 14. 刪除出貨
    console.log('🗑️  刪除出貨...')
    const { error: shipmentsError } = await db
      .from('shipments')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (shipmentsError) console.error('   ❌ 出貨刪除失敗:', shipmentsError)
    else console.log('   ✅ 出貨已刪除')

    // 15. 刪除合約
    console.log('🗑️  刪除合約...')
    const { error: contractsError } = await db
      .from('contracts')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (contractsError) console.error('   ❌ 合約刪除失敗:', contractsError)
    else console.log('   ✅ 合約已刪除')

    // 16. 刪除訂閱
    console.log('🗑️  刪除訂閱...')
    const { error: subscriptionsError } = await db
      .from('subscriptions')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (subscriptionsError) console.error('   ❌ 訂閱刪除失敗:', subscriptionsError)
    else console.log('   ✅ 訂閱已刪除')

    // 17. 刪除公司設定
    console.log('🗑️  刪除公司設定...')
    const { error: settingsError } = await db
      .from('company_settings')
      .delete()
      .eq('company_id', COMPANY_ID)

    if (settingsError) console.error('   ❌ 公司設定刪除失敗:', settingsError)
    else console.log('   ✅ 公司設定已刪除')

    // 18. 最後刪除公司
    console.log('🗑️  刪除公司...')
    const { error: companyError } = await db
      .from('companies')
      .delete()
      .eq('id', COMPANY_ID)

    if (companyError) {
      console.error('   ❌ 公司刪除失敗:', companyError)
      throw companyError
    }

    console.log('\n✅ 清理完成！振禾有限公司的所有測試資料已刪除')
  } catch (error) {
    console.error('\n❌ 清理過程發生錯誤:', error)
    process.exit(1)
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
