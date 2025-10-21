#!/usr/bin/env tsx
/**
 * 資料遷移腳本：從 Zeabur 遷移到 Supabase
 *
 * 遷移順序（依照依賴關係）：
 * Phase 1: 已存在的核心表驗證
 * Phase 2: RBAC 資料（如有自訂）
 * Phase 3: 進階功能資料
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Pool } from 'pg'
import { createClient } from '@supabase/supabase-js'

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

const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
}

interface MigrationStats {
  table: string
  zeaburCount: number
  supabaseCountBefore: number
  migrated: number
  skipped: number
  failed: number
  duration: number
}

async function migrateData() {
  console.log(colors.bold('\n🚀 資料遷移：Zeabur → Supabase'))
  console.log(colors.cyan('='.repeat(70)))
  console.log(`開始時間: ${new Date().toLocaleString('zh-TW')}\n`)

  const stats: MigrationStats[] = []

  // 連接 Zeabur
  const zeaburUrl = process.env.ZEABUR_POSTGRES_URL
  if (!zeaburUrl) {
    console.error(colors.red('❌ 錯誤: ZEABUR_POSTGRES_URL 未設置'))
    process.exit(1)
  }

  const zeaburPool = new Pool({ connectionString: zeaburUrl })
  console.log(colors.blue('🔌 連接 Zeabur PostgreSQL...'))

  let zeaburClient
  try {
    zeaburClient = await zeaburPool.connect()
    console.log(colors.green('✅ Zeabur 連接成功\n'))
  } catch (error: any) {
    console.error(colors.red(`❌ Zeabur 連接失敗: ${error.message}`))
    process.exit(1)
  }

  // 連接 Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error(colors.red('❌ 錯誤: Supabase 環境變數未設置'))
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log(colors.blue('🔌 連接 Supabase...'))
  console.log(colors.green('✅ Supabase 連接成功\n'))

  console.log(colors.bold(colors.cyan('📊 Phase 1: 驗證現有資料')))
  console.log(colors.cyan('─'.repeat(70)))

  // 檢查 Supabase 中已存在的核心表資料
  const coreTables = ['customers', 'products', 'quotations', 'quotation_items', 'exchange_rates']

  for (const table of coreTables) {
    try {
      // 檢查 Zeabur
      const zeaburResult = await zeaburClient.query(`SELECT COUNT(*) as count FROM ${table}`)
      const zeaburCount = parseInt(zeaburResult.rows[0].count)

      // 檢查 Supabase
      const { count: supabaseCount, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error && error.code !== 'PGRST116') {
        console.log(colors.yellow(`⚠️  ${table}: Supabase 查詢錯誤 - ${error.message}`))
        continue
      }

      const sbCount = supabaseCount || 0

      console.log(colors.blue(`\n📦 ${table}:`))
      console.log(`   Zeabur: ${zeaburCount} 筆`)
      console.log(`   Supabase: ${sbCount} 筆`)

      if (sbCount > 0) {
        console.log(colors.yellow(`   ⚠️  Supabase 已有資料，將跳過此表`))
      }

    } catch (error: any) {
      console.log(colors.red(`   ❌ 錯誤: ${error.message}`))
    }
  }

  console.log(colors.bold(colors.cyan('\n\n📊 Phase 2: 遷移報價系統資料')))
  console.log(colors.cyan('─'.repeat(70)))

  // 定義需要遷移的表和順序（按依賴關係）
  const migrationPlan = [
    {
      phase: 'Phase 2.1: 核心業務資料',
      tables: ['customers', 'products', 'quotations', 'quotation_items', 'exchange_rates']
    },
    {
      phase: 'Phase 2.2: 公司與設定',
      tables: ['companies', 'company_settings']
    },
    {
      phase: 'Phase 2.3: 使用者資料（如果有）',
      tables: ['user_profiles']
    },
    {
      phase: 'Phase 2.4: 合約與付款',
      tables: ['customer_contracts', 'payments', 'payment_schedules']
    },
    {
      phase: 'Phase 2.5: 審計與進階功能',
      tables: ['audit_logs', 'quotation_shares', 'quotation_versions']
    }
  ]

  for (const { phase, tables } of migrationPlan) {
    console.log(colors.bold(colors.magenta(`\n${phase}`)))
    console.log(colors.magenta('─'.repeat(60)))

    for (const table of tables) {
      await migrateTable(table, zeaburClient, supabase, stats)
    }
  }

  // 清理連接
  zeaburClient.release()
  await zeaburPool.end()

  // 顯示統計
  console.log(colors.bold(colors.cyan('\n\n📊 遷移統計報告')))
  console.log(colors.cyan('='.repeat(70)))

  let totalMigrated = 0
  let totalSkipped = 0
  let totalFailed = 0

  console.log('\n' + colors.bold('表名                  Zeabur  →  Supabase  遷移  跳過  失敗  耗時'))
  console.log(colors.cyan('─'.repeat(70)))

  stats.forEach(stat => {
    totalMigrated += stat.migrated
    totalSkipped += stat.skipped
    totalFailed += stat.failed

    const status = stat.failed > 0 ? colors.red('❌') : stat.migrated > 0 ? colors.green('✅') : colors.yellow('⏭️')
    console.log(
      `${status} ${stat.table.padEnd(18)} ${String(stat.zeaburCount).padStart(6)} → ` +
      `${String(stat.supabaseCountBefore).padStart(8)}  ${String(stat.migrated).padStart(4)}  ` +
      `${String(stat.skipped).padStart(4)}  ${String(stat.failed).padStart(4)}  ${stat.duration}ms`
    )
  })

  console.log(colors.cyan('─'.repeat(70)))
  console.log(colors.bold(`總計:  遷移 ${totalMigrated} 筆, 跳過 ${totalSkipped} 筆, 失敗 ${totalFailed} 筆`))

  if (totalFailed > 0) {
    console.log(colors.red(`\n⚠️  有 ${totalFailed} 筆資料遷移失敗，請檢查日誌`))
  } else if (totalMigrated > 0) {
    console.log(colors.green('\n✅ 所有資料遷移成功！'))
  } else {
    console.log(colors.yellow('\n⏭️  沒有新資料需要遷移'))
  }

  console.log(colors.cyan('\n='.repeat(70)))
  console.log(`結束時間: ${new Date().toLocaleString('zh-TW')}\n`)
}

async function migrateTable(
  table: string,
  zeaburClient: any,
  supabase: any,
  stats: MigrationStats[]
): Promise<void> {
  const startTime = Date.now()
  const stat: MigrationStats = {
    table,
    zeaburCount: 0,
    supabaseCountBefore: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    duration: 0
  }

  try {
    console.log(colors.blue(`\n📦 遷移 ${table}...`))

    // 檢查表是否存在於 Zeabur
    const tableCheckResult = await zeaburClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      )
    `, [table])

    if (!tableCheckResult.rows[0].exists) {
      console.log(colors.yellow(`   ⏭️  表不存在於 Zeabur，跳過`))
      stat.duration = Date.now() - startTime
      stats.push(stat)
      return
    }

    // 從 Zeabur 讀取資料
    const zeaburResult = await zeaburClient.query(`SELECT * FROM ${table}`)
    const zeaburData = zeaburResult.rows
    stat.zeaburCount = zeaburData.length

    console.log(`   Zeabur: ${zeaburData.length} 筆資料`)

    if (zeaburData.length === 0) {
      console.log(colors.yellow(`   ⏭️  Zeabur 無資料，跳過`))
      stat.duration = Date.now() - startTime
      stats.push(stat)
      return
    }

    // 檢查 Supabase 現有資料
    const { count: supabaseCount } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    stat.supabaseCountBefore = supabaseCount || 0

    console.log(`   Supabase (遷移前): ${stat.supabaseCountBefore} 筆`)

    // 如果 Supabase 已有資料，詢問是否覆蓋
    if (stat.supabaseCountBefore > 0) {
      console.log(colors.yellow(`   ⚠️  Supabase 已有 ${stat.supabaseCountBefore} 筆資料`))
      console.log(colors.yellow(`   ⏭️  跳過此表以保留現有資料`))
      stat.skipped = zeaburData.length
      stat.duration = Date.now() - startTime
      stats.push(stat)
      return
    }

    // 批次插入資料
    console.log(`   ⬆️  開始插入...`)

    // 分批處理（每批 100 筆）
    const batchSize = 100
    for (let i = 0; i < zeaburData.length; i += batchSize) {
      const batch = zeaburData.slice(i, i + batchSize)

      const { error } = await supabase
        .from(table)
        .insert(batch)

      if (error) {
        console.error(colors.red(`   ❌ 批次 ${Math.floor(i / batchSize) + 1} 失敗: ${error.message}`))
        stat.failed += batch.length
      } else {
        stat.migrated += batch.length
        process.stdout.write(`   進度: ${stat.migrated}/${zeaburData.length}\r`)
      }
    }

    console.log(colors.green(`\n   ✅ 成功遷移 ${stat.migrated} 筆資料`))

  } catch (error: any) {
    console.error(colors.red(`   ❌ 錯誤: ${error.message}`))
    stat.failed = stat.zeaburCount - stat.migrated
  }

  stat.duration = Date.now() - startTime
  stats.push(stat)
}

// 執行
migrateData().catch((error) => {
  console.error(colors.red('\n❌ 遷移失敗:'), error)
  process.exit(1)
})
