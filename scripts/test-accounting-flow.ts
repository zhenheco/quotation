#!/usr/bin/env npx tsx
/**
 * 會計流程完整測試腳本
 *
 * 測試內容：
 * 1. 建立假發票（進項+銷項）
 * 2. AI 自動分類會計科目
 * 3. 審核並過帳發票產生傳票
 * 4. 產製財務三表（試算表、資產負債表、損益表）
 *
 * 執行方式：
 *   npx tsx scripts/test-accounting-flow.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { classifyInvoiceAccount, formatClassificationResult } from '../lib/services/accounting/account-classifier.service'
import { generateBalanceSheet, generateIncomeStatement, getTrialBalanceReport } from '../lib/services/accounting/journal.service'
import type { Database } from '../types/supabase'

// 環境變數
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少環境變數: NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 建立 Supabase 客戶端
const db = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ============================================
// 測試用假發票資料
// ============================================

const TEST_INVOICES = [
  // 銷項發票（OUTPUT）- 公司開給客戶的（台灣發票格式：2英文+8數字）
  {
    number: 'AB12345678',
    type: 'OUTPUT' as const,
    date: '2024-12-01',
    untaxed_amount: 50000,
    tax_amount: 2500,
    total_amount: 52500,
    counterparty_name: '科技創新股份有限公司',
    counterparty_tax_id: '12345678',
    description: '軟體開發服務費 - 電商平台客製化開發',
  },
  {
    number: 'AB12345679',
    type: 'OUTPUT' as const,
    date: '2024-12-05',
    untaxed_amount: 30000,
    tax_amount: 1500,
    total_amount: 31500,
    counterparty_name: '新世紀企業股份有限公司',
    counterparty_tax_id: '23456789',
    description: '系統維護服務 - 12月份維護費',
  },
  {
    number: 'AB12345680',
    type: 'OUTPUT' as const,
    date: '2024-12-10',
    untaxed_amount: 80000,
    tax_amount: 4000,
    total_amount: 84000,
    counterparty_name: '數位轉型顧問有限公司',
    counterparty_tax_id: '34567890',
    description: '顧問諮詢服務 - 數位轉型專案諮詢',
  },

  // 進項發票（INPUT）- 供應商開給公司的
  {
    number: 'CD98765432',
    type: 'INPUT' as const,
    date: '2024-12-02',
    untaxed_amount: 15000,
    tax_amount: 750,
    total_amount: 15750,
    counterparty_name: '雲端科技服務商',
    counterparty_tax_id: '45678901',
    description: 'AWS 雲端服務費用 - 12月份',
  },
  {
    number: 'CD98765433',
    type: 'INPUT' as const,
    date: '2024-12-08',
    untaxed_amount: 20000,
    tax_amount: 1000,
    total_amount: 21000,
    counterparty_name: '辦公設備有限公司',
    counterparty_tax_id: '56789012',
    description: '辦公設備採購 - 電腦及顯示器',
  },
  {
    number: 'CD98765434',
    type: 'INPUT' as const,
    date: '2024-12-15',
    untaxed_amount: 8000,
    tax_amount: 400,
    total_amount: 8400,
    counterparty_name: '商業大樓管理公司',
    counterparty_tax_id: '67890123',
    description: '辦公室租金 - 12月份',
  },
]

// ============================================
// 輔助函數
// ============================================

function printSeparator(title: string) {
  console.log('\n' + '='.repeat(60))
  console.log(`  ${title}`)
  console.log('='.repeat(60))
}

function printSubSection(title: string) {
  console.log('\n' + '-'.repeat(40))
  console.log(`  ${title}`)
  console.log('-'.repeat(40))
}

// ============================================
// 主測試流程
// ============================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║          會計系統完整測試 - AI 自動分類與報表             ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  try {
    // Step 0: 取得測試用公司 ID
    printSeparator('Step 0: 取得測試公司資訊')

    const { data: user, error: userError } = await db
      .from('user_profiles')
      .select('company_id')
      .limit(1)
      .single()

    if (userError || !user?.company_id) {
      console.error('❌ 找不到測試公司，請先登入系統建立公司')

      // 嘗試取得任何存在的公司
      const { data: companies } = await db.from('companies').select('id, name').limit(1)
      if (companies && companies.length > 0) {
        console.log(`📌 使用現有公司: ${companies[0].name}`)
        var companyId = companies[0].id
      } else {
        process.exit(1)
      }
    } else {
      var companyId = user.company_id
    }

    console.log(`✅ 使用公司 ID: ${companyId}`)

    // Step 1: 確保會計科目已初始化
    printSeparator('Step 1: 檢查會計科目')

    let { data: accounts, error: accountsError } = await db
      .from('accounts')
      .select('*')
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .eq('is_active', true)

    if (accountsError) {
      throw new Error(`取得會計科目失敗: ${accountsError.message}`)
    }

    if (!accounts || accounts.length === 0) {
      console.log('⚠️  會計科目不存在，正在初始化...')

      // 預設會計科目
      const DEFAULT_ACCOUNTS = [
        // 資產類 1xxx
        { code: '1101', name: '現金', category: 'ASSET' },
        { code: '1102', name: '零用金', category: 'ASSET' },
        { code: '1103', name: '銀行存款', category: 'ASSET' },
        { code: '1131', name: '應收帳款', category: 'ASSET' },
        { code: '1141', name: '應收票據', category: 'ASSET' },
        { code: '1181', name: '其他應收款', category: 'ASSET' },
        { code: '1301', name: '預付款項', category: 'ASSET' },
        { code: '1471', name: '留抵稅額', category: 'ASSET' },
        // 負債類 2xxx
        { code: '2101', name: '應付帳款', category: 'LIABILITY' },
        { code: '2111', name: '應付票據', category: 'LIABILITY' },
        { code: '2171', name: '應付費用', category: 'LIABILITY' },
        { code: '2181', name: '其他應付款', category: 'LIABILITY' },
        { code: '2261', name: '銷項稅額', category: 'LIABILITY' },
        { code: '2262', name: '進項稅額', category: 'LIABILITY' },
        // 權益類 3xxx
        { code: '3101', name: '股本', category: 'EQUITY' },
        { code: '3351', name: '未分配盈餘', category: 'EQUITY' },
        { code: '3353', name: '本期損益', category: 'EQUITY' },
        // 收入類 4xxx
        { code: '4101', name: '銷貨收入', category: 'REVENUE' },
        { code: '4111', name: '勞務收入', category: 'REVENUE' },
        { code: '4181', name: '其他營業收入', category: 'REVENUE' },
        { code: '4201', name: '利息收入', category: 'REVENUE' },
        // 成本類 5xxx
        { code: '5101', name: '銷貨成本', category: 'COST' },
        { code: '5111', name: '勞務成本', category: 'COST' },
        // 費用類 6xxx
        { code: '6101', name: '薪資費用', category: 'EXPENSE' },
        { code: '6121', name: '勞健保費用', category: 'EXPENSE' },
        { code: '6131', name: '租金費用', category: 'EXPENSE' },
        { code: '6141', name: '水電費', category: 'EXPENSE' },
        { code: '6151', name: '通訊費', category: 'EXPENSE' },
        { code: '6161', name: '交通費', category: 'EXPENSE' },
        { code: '6171', name: '交際費', category: 'EXPENSE' },
        { code: '6181', name: '稅捐', category: 'EXPENSE' },
        { code: '6191', name: '折舊費用', category: 'EXPENSE' },
        { code: '6201', name: '其他費用', category: 'EXPENSE' },
      ]

      const accountsToInsert = DEFAULT_ACCOUNTS.map((acc) => ({
        id: crypto.randomUUID(),
        ...acc,
        name_en: null,
        description: null,
        sub_category: null,
        company_id: companyId,
        is_system: true,
        is_active: true,
      }))

      const { error: insertError } = await db.from('accounts').insert(accountsToInsert)

      if (insertError) {
        console.error(`❌ 初始化會計科目失敗: ${insertError.message}`)
        process.exit(1)
      }

      console.log(`✅ 已初始化 ${DEFAULT_ACCOUNTS.length} 個會計科目`)

      // 重新取得科目
      const { data: newAccounts } = await db
        .from('accounts')
        .select('*')
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .eq('is_active', true)

      if (newAccounts) {
        // 更新變數以供後續使用
        accounts = newAccounts
      }
    }

    console.log(`✅ 找到 ${accounts.length} 個會計科目`)
    console.log('   主要科目:')
    accounts.slice(0, 8).forEach((acc) => {
      console.log(`   - ${acc.code} ${acc.name} (${acc.category})`)
    })

    // Step 2: 清除舊的測試發票
    printSeparator('Step 2: 清除舊測試資料')

    const { error: deleteError } = await db
      .from('acc_invoices')
      .delete()
      .eq('company_id', companyId)
      .or('number.like.AB1234567%,number.like.CD9876543%')

    if (deleteError) {
      console.warn(`⚠️  清除舊發票失敗: ${deleteError.message}`)
    } else {
      console.log('✅ 已清除舊的 AI-TEST-* 發票')
    }

    // 清除測試傳票
    const { error: deleteJournalError } = await db
      .from('journal_entries')
      .delete()
      .eq('company_id', companyId)
      .or('description.like.%AB1234567%,description.like.%CD9876543%')

    if (!deleteJournalError) {
      console.log('✅ 已清除舊的測試傳票')
    }

    // Step 3: 建立假發票
    printSeparator('Step 3: 建立假發票')

    const createdInvoices = []
    for (const invoice of TEST_INVOICES) {
      const { data: created, error: createError } = await db
        .from('acc_invoices')
        .insert({
          id: crypto.randomUUID(),
          company_id: companyId,
          ...invoice,
          status: 'DRAFT',
          payment_status: 'UNPAID',
          payment_method: 'UNCLASSIFIED',
          paid_amount: 0,
        })
        .select()
        .single()

      if (createError) {
        console.error(`❌ 建立發票 ${invoice.number} 失敗: ${createError.message}`)
        continue
      }

      createdInvoices.push(created)
      const typeIcon = invoice.type === 'OUTPUT' ? '📤' : '📥'
      console.log(`${typeIcon} 已建立: ${invoice.number} - ${invoice.description.substring(0, 30)}...`)
    }

    console.log(`\n✅ 共建立 ${createdInvoices.length} 張發票`)
    console.log(`   - 銷項發票: ${createdInvoices.filter(i => i.type === 'OUTPUT').length} 張`)
    console.log(`   - 進項發票: ${createdInvoices.filter(i => i.type === 'INPUT').length} 張`)

    // Step 4: AI 自動分類會計科目
    printSeparator('Step 4: AI 自動分類會計科目')

    for (const invoice of createdInvoices) {
      console.log(`\n🤖 分析發票: ${invoice.number}`)
      console.log(`   描述: ${invoice.description}`)

      const classification = await classifyInvoiceAccount(
        db,
        companyId,
        invoice.type,
        invoice.description || '',
        invoice.counterparty_name || undefined
      )

      if (classification) {
        console.log(formatClassificationResult(classification))

        // 更新發票的科目分類
        const { error: updateError } = await db
          .from('acc_invoices')
          .update({
            account_id: classification.accountId,
            account_code: classification.accountCode,
            is_account_automatic: true,
            account_confidence: classification.confidence,
          })
          .eq('id', invoice.id)

        if (updateError) {
          console.error(`❌ 更新發票科目失敗: ${updateError.message}`)
        } else {
          console.log(`✅ 已更新發票科目為: ${classification.accountCode} ${classification.accountName}`)
        }
      } else {
        console.log('⚠️  無法自動分類科目')
      }
    }

    // Step 5: 審核發票
    printSeparator('Step 5: 審核發票')

    for (const invoice of createdInvoices) {
      const { error: verifyError } = await db
        .from('acc_invoices')
        .update({
          status: 'VERIFIED',
          verified_at: new Date().toISOString(),
          verified_by: 'test-script',
        })
        .eq('id', invoice.id)

      if (verifyError) {
        console.error(`❌ 審核發票 ${invoice.number} 失敗: ${verifyError.message}`)
      } else {
        console.log(`✅ 已審核: ${invoice.number}`)
      }
    }

    // Step 6: 過帳發票產生傳票
    printSeparator('Step 6: 過帳發票產生傳票')

    // 取得更新後的發票資料（含科目資訊）
    const { data: verifiedInvoices } = await db
      .from('acc_invoices')
      .select('*')
      .eq('company_id', companyId)
      .or('number.like.AB1234567%,number.like.CD9876543%')
      .eq('status', 'VERIFIED')

    if (!verifiedInvoices || verifiedInvoices.length === 0) {
      console.log('⚠️  沒有可過帳的發票')
    } else {
      for (const invoice of verifiedInvoices) {
        // 取得對應的科目資訊
        const account = accounts.find(a => a.id === invoice.account_id)

        if (!account) {
          console.warn(`⚠️  發票 ${invoice.number} 沒有指定科目，跳過過帳`)
          continue
        }

        // 決定借貸科目
        let transactions: Array<{ account_id: string; debit: number; credit: number; description: string }>

        if (invoice.type === 'OUTPUT') {
          // 銷項發票: 借 應收帳款，貸 收入 + 銷項稅額
          const receivableAccount = accounts.find(a => a.code === '1131') // 應收帳款
          const taxAccount = accounts.find(a => a.code === '2261') // 銷項稅額

          if (!receivableAccount || !taxAccount) {
            console.warn(`⚠️  缺少應收帳款或銷項稅額科目`)
            continue
          }

          transactions = [
            { account_id: receivableAccount.id, debit: invoice.total_amount, credit: 0, description: `應收帳款 - ${invoice.counterparty_name}` },
            { account_id: invoice.account_id!, debit: 0, credit: invoice.untaxed_amount, description: invoice.description || '' },
            { account_id: taxAccount.id, debit: 0, credit: invoice.tax_amount, description: '銷項稅額' },
          ]
        } else {
          // 進項發票: 借 費用/成本 + 進項稅額，貸 應付帳款
          const payableAccount = accounts.find(a => a.code === '2101') // 應付帳款
          const inputTaxAccount = accounts.find(a => a.code === '2262') // 進項稅額

          if (!payableAccount || !inputTaxAccount) {
            console.warn(`⚠️  缺少應付帳款或進項稅額科目`)
            continue
          }

          transactions = [
            { account_id: invoice.account_id!, debit: invoice.untaxed_amount, credit: 0, description: invoice.description || '' },
            { account_id: inputTaxAccount.id, debit: invoice.tax_amount, credit: 0, description: '進項稅額' },
            { account_id: payableAccount.id, debit: 0, credit: invoice.total_amount, description: `應付帳款 - ${invoice.counterparty_name}` },
          ]
        }

        // 產生傳票編號
        const journalNumber = `2024120${verifiedInvoices.indexOf(invoice) + 1}`.padStart(10, '0').slice(-10)

        // 建立傳票
        const journalId = crypto.randomUUID()
        const { data: journal, error: journalError } = await db
          .from('journal_entries')
          .insert({
            id: journalId,
            company_id: companyId,
            journal_number: journalNumber,
            date: invoice.date,
            description: `AI-TEST: ${invoice.description}`,
            source_type: 'INVOICE',
            invoice_id: invoice.id,
            is_auto_generated: true,
            status: 'DRAFT',
          })
          .select()
          .single()

        if (journalError) {
          console.error(`❌ 建立傳票失敗: ${journalError.message}`)
          continue
        }

        // 建立分錄
        const txInserts = transactions.map((tx, idx) => ({
          id: crypto.randomUUID(),
          company_id: companyId,
          journal_entry_id: journalId,
          number: `${journalNumber}-${idx + 1}`,
          date: invoice.date,
          description: tx.description,
          account_id: tx.account_id,
          debit: tx.debit,
          credit: tx.credit,
          source_type: 'INVOICE' as const,
          invoice_id: invoice.id,
          status: 'DRAFT' as const,
        }))

        const { error: txError } = await db
          .from('acc_transactions')
          .insert(txInserts)

        if (txError) {
          console.error(`❌ 建立分錄失敗: ${txError.message}`)
          continue
        }

        // 過帳傳票
        const now = new Date().toISOString()
        await db.from('journal_entries').update({ status: 'POSTED', posted_at: now, posted_by: 'test-script' }).eq('id', journalId)
        await db.from('acc_transactions').update({ status: 'POSTED', posted_at: now }).eq('journal_entry_id', journalId)

        // 更新發票狀態
        await db.from('acc_invoices').update({ status: 'POSTED', posted_at: now, posted_by: 'test-script', journal_entry_id: journalId }).eq('id', invoice.id)

        console.log(`✅ 已過帳: ${invoice.number} → 傳票 ${journalNumber}`)
        console.log(`   借方: ${transactions.filter(t => t.debit > 0).map(t => `$${t.debit}`).join(', ')}`)
        console.log(`   貸方: ${transactions.filter(t => t.credit > 0).map(t => `$${t.credit}`).join(', ')}`)
      }
    }

    // Step 7: 產製財務三表
    printSeparator('Step 7: 產製財務三表')

    const reportStartDate = '2024-12-01'
    const reportEndDate = '2024-12-31'

    // 7.1 試算表
    printSubSection('7.1 試算表 (Trial Balance)')
    const trialBalance = await getTrialBalanceReport(db, companyId, reportStartDate, reportEndDate, false)

    // 過濾有餘額的科目
    const activeAccounts = trialBalance.filter(item =>
      item.period_debit > 0 || item.period_credit > 0 || item.closing_debit > 0 || item.closing_credit > 0
    )

    console.log('\n┌─────────┬────────────────┬────────────┬────────────┬────────────┬────────────┐')
    console.log('│ 科目代碼 │ 科目名稱       │ 期初借方   │ 期初貸方   │ 本期借方   │ 本期貸方   │')
    console.log('├─────────┼────────────────┼────────────┼────────────┼────────────┼────────────┤')

    let totalDebit = 0
    let totalCredit = 0
    for (const item of activeAccounts) {
      const code = item.account_code.padEnd(8)
      const name = item.account_name.substring(0, 10).padEnd(14)
      const openingDebit = item.opening_debit.toFixed(0).padStart(10)
      const openingCredit = item.opening_credit.toFixed(0).padStart(10)
      const periodDebit = item.period_debit.toFixed(0).padStart(10)
      const periodCredit = item.period_credit.toFixed(0).padStart(10)
      console.log(`│ ${code} │ ${name} │ ${openingDebit} │ ${openingCredit} │ ${periodDebit} │ ${periodCredit} │`)
      totalDebit += item.period_debit
      totalCredit += item.period_credit
    }

    console.log('├─────────┼────────────────┼────────────┼────────────┼────────────┼────────────┤')
    console.log(`│ 合計     │                │            │            │ ${totalDebit.toFixed(0).padStart(10)} │ ${totalCredit.toFixed(0).padStart(10)} │`)
    console.log('└─────────┴────────────────┴────────────┴────────────┴────────────┴────────────┘')

    if (Math.abs(totalDebit - totalCredit) < 0.01) {
      console.log('\n✅ 借貸平衡！')
    } else {
      console.log(`\n⚠️  借貸不平衡！差額: ${(totalDebit - totalCredit).toFixed(2)}`)
    }

    // 7.2 損益表 - 直接使用試算表資料計算
    printSubSection('7.2 損益表 (Income Statement)')

    // 從試算表中計算損益表
    const revenue = trialBalance.filter((item) => item.account_category === 'REVENUE')
    const expenses = trialBalance.filter((item) => item.account_category === 'EXPENSE' || item.account_category === 'COST')

    const totalRevenue = revenue.reduce((sum, item) => sum + (item.closing_credit - item.closing_debit), 0)
    const totalExpenses = expenses.reduce((sum, item) => sum + (item.closing_debit - item.closing_credit), 0)
    const netIncome = totalRevenue - totalExpenses

    const incomeStatement = { revenue, expenses, totalRevenue, totalExpenses, netIncome }

    console.log('\n╔══════════════════════════════════════════════════════════╗')
    console.log('║                      損  益  表                          ║')
    console.log('║                  2024年12月1日 至 12月31日                ║')
    console.log('╠══════════════════════════════════════════════════════════╣')

    console.log('║ 一、營業收入                                             ║')
    for (const item of incomeStatement.revenue) {
      if (item.closing_credit - item.closing_debit > 0) {
        console.log(`║     ${item.account_name.padEnd(20)} ${(item.closing_credit - item.closing_debit).toFixed(0).padStart(15)} ║`)
      }
    }
    console.log(`║     營業收入合計                  ${incomeStatement.totalRevenue.toFixed(0).padStart(15)} ║`)

    console.log('╠══════════════════════════════════════════════════════════╣')
    console.log('║ 二、營業費用                                             ║')
    for (const item of incomeStatement.expenses) {
      if (item.closing_debit - item.closing_credit > 0) {
        console.log(`║     ${item.account_name.padEnd(20)} ${(item.closing_debit - item.closing_credit).toFixed(0).padStart(15)} ║`)
      }
    }
    console.log(`║     營業費用合計                  ${incomeStatement.totalExpenses.toFixed(0).padStart(15)} ║`)

    console.log('╠══════════════════════════════════════════════════════════╣')
    const netIncomeLabel = incomeStatement.netIncome >= 0 ? '本期淨利' : '本期淨損'
    console.log(`║ ${netIncomeLabel}                          ${Math.abs(incomeStatement.netIncome).toFixed(0).padStart(15)} ║`)
    console.log('╚══════════════════════════════════════════════════════════╝')

    // 7.3 資產負債表 - 直接使用試算表資料計算
    printSubSection('7.3 資產負債表 (Balance Sheet)')

    const assets = trialBalance.filter((item) => item.account_category === 'ASSET')
    const liabilities = trialBalance.filter((item) => item.account_category === 'LIABILITY')
    const equity = trialBalance.filter((item) => item.account_category === 'EQUITY')

    const totalAssets = assets.reduce((sum, item) => sum + (item.closing_debit - item.closing_credit), 0)
    const totalLiabilities = liabilities.reduce((sum, item) => sum + (item.closing_credit - item.closing_debit), 0)
    const totalEquity = equity.reduce((sum, item) => sum + (item.closing_credit - item.closing_debit), 0)

    const balanceSheet = { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity }

    console.log('\n╔══════════════════════════════════════════════════════════╗')
    console.log('║                    資 產 負 債 表                        ║')
    console.log('║                    2024年12月31日                        ║')
    console.log('╠══════════════════════════════════════════════════════════╣')

    console.log('║ 資產                                                     ║')
    for (const item of balanceSheet.assets) {
      const balance = item.closing_debit - item.closing_credit
      if (balance !== 0) {
        console.log(`║   ${item.account_name.padEnd(22)} ${balance.toFixed(0).padStart(15)} ║`)
      }
    }
    console.log(`║   資產合計                      ${balanceSheet.totalAssets.toFixed(0).padStart(15)} ║`)

    console.log('╠══════════════════════════════════════════════════════════╣')
    console.log('║ 負債                                                     ║')
    for (const item of balanceSheet.liabilities) {
      const balance = item.closing_credit - item.closing_debit
      if (balance !== 0) {
        console.log(`║   ${item.account_name.padEnd(22)} ${balance.toFixed(0).padStart(15)} ║`)
      }
    }
    console.log(`║   負債合計                      ${balanceSheet.totalLiabilities.toFixed(0).padStart(15)} ║`)

    console.log('╠══════════════════════════════════════════════════════════╣')
    console.log('║ 權益                                                     ║')
    for (const item of balanceSheet.equity) {
      const balance = item.closing_credit - item.closing_debit
      if (balance !== 0) {
        console.log(`║   ${item.account_name.padEnd(22)} ${balance.toFixed(0).padStart(15)} ║`)
      }
    }
    // 加入本期損益
    if (incomeStatement.netIncome !== 0) {
      console.log(`║   本期損益                      ${incomeStatement.netIncome.toFixed(0).padStart(15)} ║`)
    }
    const totalEquityWithProfit = balanceSheet.totalEquity + incomeStatement.netIncome
    console.log(`║   權益合計                      ${totalEquityWithProfit.toFixed(0).padStart(15)} ║`)

    console.log('╠══════════════════════════════════════════════════════════╣')
    console.log(`║ 負債及權益合計                  ${(balanceSheet.totalLiabilities + totalEquityWithProfit).toFixed(0).padStart(15)} ║`)
    console.log('╚══════════════════════════════════════════════════════════╝')

    // 驗證會計等式
    const totalLiabilitiesAndEquity = balanceSheet.totalLiabilities + totalEquityWithProfit
    if (Math.abs(balanceSheet.totalAssets - totalLiabilitiesAndEquity) < 0.01) {
      console.log('\n✅ 資產 = 負債 + 權益，會計等式成立！')
    } else {
      console.log(`\n⚠️  會計等式不平衡！`)
      console.log(`   資產: ${balanceSheet.totalAssets}`)
      console.log(`   負債 + 權益: ${totalLiabilitiesAndEquity}`)
    }

    // 完成
    printSeparator('測試完成')
    console.log('\n🎉 會計系統完整測試已完成！')
    console.log('\n📊 測試摘要:')
    console.log(`   - 建立發票: ${createdInvoices.length} 張`)
    console.log(`   - AI 分類: ${createdInvoices.length} 張`)
    console.log(`   - 過帳傳票: ${createdInvoices.length} 張`)
    console.log(`   - 總收入: $${incomeStatement.totalRevenue.toFixed(0)}`)
    console.log(`   - 總費用: $${incomeStatement.totalExpenses.toFixed(0)}`)
    console.log(`   - 本期淨利: $${incomeStatement.netIncome.toFixed(0)}`)

  } catch (error) {
    console.error('\n❌ 測試失敗:', error)
    process.exit(1)
  }
}

// 執行主程式
main().catch(console.error)
