#!/usr/bin/env tsx
/**
 * 執行訂單和出貨單系統 Migration
 *
 * 執行以下 migrations:
 * - 071_create_orders_system.sql
 * - 072_create_shipments_system.sql
 * - 073_acc_invoices_add_order_shipment.sql
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'

// 手動載入 .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const envContent = readFileSync(envPath, 'utf-8')

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        process.env[key] = value
      }
    }
  })
} catch (error) {
  console.log('⚠️  無法載入 .env.local')
}

// 顏色輸出
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
}

// Migration 檔案列表
const migrations = [
  '071_create_orders_system.sql',
  '072_create_shipments_system.sql',
  '073_acc_invoices_add_order_shipment.sql',
]

async function prepareMigrations() {
  console.log(colors.bold('\n🚀 訂單與出貨單系統 Migration 準備工具'))
  console.log(colors.cyan('='.repeat(60)))
  console.log(`執行時間: ${new Date().toLocaleString('zh-TW')}\n`)

  // 讀取並合併所有 migration SQL
  const migrationsDir = resolve(process.cwd(), 'migrations')
  let combinedSQL = ''

  console.log(colors.blue('📖 讀取 migration 檔案...\n'))

  for (const filename of migrations) {
    const filepath = join(migrationsDir, filename)

    if (!existsSync(filepath)) {
      console.error(colors.red(`❌ 找不到檔案: ${filepath}`))
      process.exit(1)
    }

    const sql = readFileSync(filepath, 'utf-8')
    console.log(colors.green(`   ✅ ${filename} (${sql.length} 字元)`))
    combinedSQL += `-- ====== ${filename} ======\n${sql}\n\n`
  }

  console.log(colors.blue(`\n📊 總共 ${combinedSQL.length} 字元 SQL\n`))

  // 寫入合併的 SQL 檔案
  const combinedPath = resolve(process.cwd(), 'migrations/combined_orders_shipments.sql')
  writeFileSync(combinedPath, combinedSQL)
  console.log(colors.green(`✅ 已產生合併檔案: ${combinedPath}\n`))

  // 印出執行說明
  printInstructions()
}

function printInstructions() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'YOUR_PROJECT_REF'

  console.log(colors.cyan('─'.repeat(60)))
  console.log(colors.bold('\n📝 執行步驟:\n'))

  console.log(colors.bold('方法 1: Supabase Dashboard（推薦）'))
  console.log(`1. 開啟 Supabase Dashboard:`)
  console.log(colors.cyan(`   https://supabase.com/dashboard/project/${projectRef}/sql\n`))
  console.log('2. 點擊 "+ New query"')
  console.log('3. 依序執行以下檔案（每個執行完再執行下一個）:')
  for (const filename of migrations) {
    console.log(colors.yellow(`   - migrations/${filename}`))
  }
  console.log('\n   或直接執行合併檔案:')
  console.log(colors.yellow('   - migrations/combined_orders_shipments.sql'))
  console.log('')

  console.log(colors.bold('方法 2: 使用 psql'))
  console.log('如果已安裝 PostgreSQL 並有連線資訊:')
  console.log(colors.cyan('   psql "$DATABASE_URL" -f migrations/combined_orders_shipments.sql\n'))

  console.log(colors.bold('方法 3: 複製到剪貼簿 (macOS)'))
  console.log(colors.cyan('   cat migrations/071_create_orders_system.sql | pbcopy'))
  console.log('   然後貼到 Supabase SQL Editor\n')

  console.log(colors.cyan('─'.repeat(60)))

  console.log(colors.bold('\n📋 Migration 內容摘要:\n'))
  console.log(colors.green('071_create_orders_system.sql'))
  console.log('   - 建立 orders 表（訂單主表）')
  console.log('   - 建立 order_items 表（訂單明細）')
  console.log('   - 建立 order_number_sequences 表')
  console.log('   - 建立 generate_order_number() 函數')
  console.log('   - 建立 create_order_from_quotation() 函數')
  console.log('   - 設定 RLS 政策\n')

  console.log(colors.green('072_create_shipments_system.sql'))
  console.log('   - 建立 shipments 表（出貨單主表）')
  console.log('   - 建立 shipment_items 表（出貨明細）')
  console.log('   - 建立 shipment_number_sequences 表')
  console.log('   - 建立 generate_shipment_number() 函數')
  console.log('   - 建立 create_shipment_from_order() 函數')
  console.log('   - 建立 create_invoice_from_shipment() 函數')
  console.log('   - 設定 RLS 政策\n')

  console.log(colors.green('073_acc_invoices_add_order_shipment.sql'))
  console.log('   - 在 acc_invoices 表新增 order_id 欄位')
  console.log('   - 在 acc_invoices 表新增 shipment_id 欄位')
  console.log('   - 建立相關索引\n')

  console.log(colors.cyan('─'.repeat(60)))
  console.log(colors.bold(colors.green('\n✨ 執行完成後，系統將支援完整的訂單→出貨→發票流程！\n')))
}

// 執行
prepareMigrations().catch((error) => {
  console.error(colors.red('\n❌ 腳本執行失敗:'), error)
  process.exit(1)
})
