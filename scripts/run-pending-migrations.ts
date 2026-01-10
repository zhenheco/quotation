#!/usr/bin/env tsx
/**
 * 執行待處理的 migration 檔案
 * 用法: pnpm tsx scripts/run-pending-migrations.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

// 載入環境變數
try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
} catch (error) {
  console.warn('⚠️  無法讀取 .env.local')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

// 待執行的 migration 檔案（按順序）
const PENDING_MIGRATIONS = [
  '070_upgrade_company_to_professional.sql',
  '071_create_orders_system.sql',
  '072_create_shipments_system.sql',
  '073_acc_invoices_add_order_shipment.sql',
  '074_add_orders_shipments_permissions.sql',
]

async function checkMigrationStatus(): Promise<string[]> {
  console.log('📋 檢查已執行的 migration...\n')

  const { data, error } = await supabase
    .from('schema_migrations')
    .select('filename')

  if (error) {
    console.warn('⚠️  無法查詢 schema_migrations 表:', error.message)
    return []
  }

  const executed = new Set(data?.map(r => r.filename) || [])
  return PENDING_MIGRATIONS.filter(f => !executed.has(f))
}

async function executeMigration(filename: string): Promise<boolean> {
  console.log(`⚙️  執行: ${filename}`)

  try {
    const sql = readFileSync(join(process.cwd(), 'migrations', filename), 'utf-8')

    // 使用 Supabase RPC 執行 SQL（需要 exec_sql 函數）
    const { error } = await supabase.rpc('exec_sql', { query: sql })

    if (error) {
      // 如果 exec_sql 不存在，輸出 SQL 讓用戶手動執行
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`   ⚠️  exec_sql 函數不存在，請在 Supabase SQL Editor 手動執行`)
        console.log(`   📄 檔案路徑: migrations/${filename}`)
        return false
      }
      throw error
    }

    console.log(`   ✅ ${filename} 完成`)
    return true
  } catch (error) {
    console.error(`   ❌ ${filename} 失敗:`, error)
    return false
  }
}

async function main() {
  console.log('🚀 開始執行待處理的 migrations\n')
  console.log('============================================================\n')

  const pending = await checkMigrationStatus()

  if (pending.length === 0) {
    console.log('✅ 沒有待執行的 migration！')
    return
  }

  console.log(`📋 待執行的 migration (${pending.length} 個):`)
  pending.forEach(f => console.log(`   - ${f}`))
  console.log('')

  let success = 0
  let failed = 0

  for (const filename of pending) {
    const result = await executeMigration(filename)
    if (result) {
      success++
    } else {
      failed++
      // 如果一個失敗，停止執行後續（因為可能有依賴關係）
      console.log('\n⚠️  停止執行，請先解決上述問題')
      break
    }
  }

  console.log('\n============================================================')
  console.log(`📊 結果: ${success} 成功, ${failed} 失敗`)

  if (failed > 0) {
    console.log('\n📋 手動執行方式:')
    console.log('1. 前往 Supabase Dashboard > SQL Editor')
    console.log('2. 依序執行以下 migration 檔案:')
    pending.forEach(f => console.log(`   - migrations/${f}`))
    console.log('\n3. 執行完成後，重新執行驗證: pnpm tsx scripts/verify-schema-sync.ts')
  }
}

main().catch(console.error)
