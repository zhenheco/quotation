/**
 * 報稅系統測試腳本
 * 測試營業稅和所得稅 API
 */

import { config } from 'dotenv/config.js'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║              報稅系統測試 - 資料庫檢查                 ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  // 1. 檢查公司資料
  console.log('\n📊 Step 1: 檢查測試公司資料')
  const { data: members, error: memberError } = await db
    .from('company_members')
    .select('company_id, companies(id, name, tax_id)')
    .limit(1)

  if (memberError) {
    console.error('❌ 查詢公司失敗:', memberError.message)
    return
  }

  if (!members || members.length === 0) {
    console.log('⚠️  沒有找到任何公司')
    return
  }

  const company = members[0]
  const companyId = company.company_id
  const companyName = company.companies?.name || 'Unknown'
  const companyTaxId = company.companies?.tax_id || null

  console.log(`✅ 找到公司: ${companyName}`)
  console.log(`   Company ID: ${companyId}`)
  console.log(`   Tax ID: ${companyTaxId || '(未設置)'}`)

  // 2. 檢查發票資料（營業稅需要）
  console.log('\n📄 Step 2: 檢查發票資料')
  const { data: invoices, error: invoiceError } = await db
    .from('acc_invoices')
    .select('id, number, type, date, status, untaxed_amount, tax_amount, total_amount')
    .eq('company_id', companyId)
    .eq('status', 'POSTED')
    .order('date', { ascending: false })
    .limit(10)

  if (invoiceError) {
    console.error('❌ 查詢發票失敗:', invoiceError.message)
  } else {
    console.log(`✅ 找到 ${invoices?.length || 0} 張已過帳發票`)
    if (invoices && invoices.length > 0) {
      console.log('   最新發票:')
      invoices.slice(0, 5).forEach(inv => {
        const icon = inv.type === 'OUTPUT' ? '📤' : '📥'
        console.log(`   ${icon} ${inv.number} - ${inv.date} - $${inv.total_amount}`)
      })
    }
  }

  // 3. 檢查純益率資料（所得稅需要）
  console.log('\n📈 Step 3: 檢查純益率資料')
  const { data: profitRates, error: profitError } = await db
    .from('industry_profit_rates')
    .select('id, industry_code, industry_name, profit_rate, tax_year')
    .eq('tax_year', 2024)
    .limit(5)

  if (profitError) {
    console.error('❌ 查詢純益率失敗:', profitError.message)
  } else {
    console.log(`✅ 找到 ${profitRates?.length || 0} 筆 2024 年度純益率`)
    if (profitRates && profitRates.length > 0) {
      profitRates.forEach(rate => {
        console.log(`   ${rate.industry_code} ${rate.industry_name} - ${(rate.profit_rate * 100).toFixed(1)}%`)
      })
    }
  }

  // 4. 測試營業稅 API 服務
  console.log('\n🧮 Step 4: 測試營業稅計算服務')
  try {
    const { generateForm401 } = await import('./lib/services/accounting/tax-report.service.js')

    if (!companyTaxId) {
      console.log('⚠️  公司未設置統編，跳過營業稅測試')
    } else {
      // 使用當前年度和月份
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const biMonth = Math.ceil(month / 2)

      console.log(`   產生 ${year} 年第 ${biMonth} 期 401 申報書...`)

      const form401 = await generateForm401(
        db,
        companyId,
        companyTaxId,
        companyName,
        year,
        biMonth
      )

      console.log(`✅ 401 申報書產生成功`)
      console.log(`   銷項稅額: $${form401.taxCalculation.outputTax}`)
      console.log(`   進項稅額: $${form401.taxCalculation.inputTax}`)
      console.log(`   應納/退稅額: $${form401.taxCalculation.netTax}`)
      console.log(`   銷項發票: ${form401.summary.totalSalesCount} 張`)
      console.log(`   進項發票: ${form401.summary.totalPurchasesCount} 張`)
    }
  } catch (error) {
    console.error('❌ 營業稅計算失敗:', error.message)
  }

  // 5. 測試所得稅 API 服務
  console.log('\n🧮 Step 5: 測試所得稅擴大書審服務')
  try {
    const { aggregateAnnualRevenue, checkExpandedAuditEligibility } = await import('./lib/services/accounting/expanded-audit-calculator.js')

    const taxYear = 2024
    console.log(`   計算 ${taxYear} 年度營收...`)

    const revenueSummary = await aggregateAnnualRevenue(db, companyId, taxYear)

    console.log(`✅ 年度營收匯總:`)
    console.log(`   總營收: $${revenueSummary.total_revenue}`)
    console.log(`   發票數: ${revenueSummary.invoice_count} 張`)

    const eligibility = checkExpandedAuditEligibility(revenueSummary.total_revenue)
    console.log(`\n✅ 擴大書審資格檢查:`)
    console.log(`   ${eligibility.is_eligible ? '✓ 符合資格' : '✗ 不符合資格'}`)
    console.log(`   收入上限: $${eligibility.details.revenue_limit}`)
    console.log(`   當前營收: $${eligibility.details.total_revenue}`)
  } catch (error) {
    console.error('❌ 所得稅計算失敗:', error.message)
    if (error.stack) {
      console.error(error.stack.split('\n').slice(0, 5).join('\n'))
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║                  測試完成                             ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
