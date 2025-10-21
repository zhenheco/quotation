#!/usr/bin/env tsx
/**
 * 使用 PostgreSQL 直接連接執行 Migration
 *
 * 此腳本會使用 pg 連接 Supabase PostgreSQL
 * 並執行 004_zeabur_tables_migration.sql
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Pool } from 'pg'

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

async function executeMigration() {
  console.log(colors.bold('\n🚀 執行 Supabase Migration (PostgreSQL)'))
  console.log(colors.cyan('='.repeat(60)))
  console.log(`執行時間: ${new Date().toLocaleString('zh-TW')}\n`)

  // 檢查環境變數
  const supabaseDbUrl = process.env.SUPABASE_DB_URL

  if (!supabaseDbUrl) {
    console.log(colors.yellow('⚠️  未找到 SUPABASE_DB_URL'))
    console.log(colors.yellow('\n請在 .env.local 中添加 Supabase PostgreSQL 連接字串:'))
    console.log(colors.cyan('SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres'))
    console.log(colors.cyan('\n或使用 Transaction pooler URL:'))
    console.log(colors.cyan('SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres\n'))

    console.log(colors.bold('獲取連接字串的方法:'))
    console.log('1. 訪問 Supabase Dashboard')
    console.log('2. Project Settings > Database')
    console.log('3. 複製 "Connection string" (Transaction 模式)\n')

    console.log(colors.bold('或使用 Supabase Dashboard 手動執行:'))
    console.log('1. 打開: https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/editor')
    console.log('2. 進入 SQL Editor')
    console.log('3. 執行 supabase-migrations/004_zeabur_tables_migration.sql\n')

    return
  }

  console.log(colors.green('✅ 找到 SUPABASE_DB_URL'))

  // 讀取 migration SQL
  const migrationPath = resolve(process.cwd(), 'supabase-migrations/004_zeabur_tables_migration.sql')
  console.log(colors.blue(`\n📖 讀取 migration 文件...`))

  let migrationSQL: string
  try {
    migrationSQL = readFileSync(migrationPath, 'utf-8')
    const lines = migrationSQL.split('\n').length
    console.log(colors.green(`✅ 讀取成功 (${lines} 行, ${migrationSQL.length} 字元)\n`))
  } catch (error: any) {
    console.error(colors.red(`❌ 無法讀取 migration 文件: ${error.message}`))
    process.exit(1)
  }

  // 連接 Supabase PostgreSQL
  console.log(colors.blue('🔌 連接 Supabase PostgreSQL...'))

  const pool = new Pool({
    connectionString: supabaseDbUrl,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
  })

  let client
  try {
    client = await pool.connect()
    console.log(colors.green('✅ 連接成功\n'))
  } catch (error: any) {
    console.error(colors.red(`❌ 連接失敗: ${error.message}`))
    console.error(colors.yellow('\n請檢查:'))
    console.error('1. SUPABASE_DB_URL 是否正確')
    console.error('2. 密碼是否正確')
    console.error('3. 網路連接是否正常\n')
    process.exit(1)
  }

  try {
    console.log(colors.bold('🔧 開始執行 migration...'))
    console.log(colors.cyan('─'.repeat(60)))

    // 開始交易
    await client.query('BEGIN')
    console.log(colors.blue('📦 開始交易'))

    // 執行 SQL
    const startTime = Date.now()
    await client.query(migrationSQL)
    const duration = Date.now() - startTime

    // 提交交易
    await client.query('COMMIT')
    console.log(colors.green(`✅ 交易提交成功 (耗時 ${duration}ms)\n`))

    // 驗證結果
    console.log(colors.bold('🔍 驗證建立的表...'))
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'roles', 'permissions', 'role_permissions', 'user_roles', 'user_profiles',
        'companies', 'company_members', 'company_settings',
        'customer_contracts', 'payments', 'payment_schedules',
        'audit_logs', 'quotation_shares', 'quotation_versions'
      )
      ORDER BY table_name
    `)

    console.log(colors.green(`✅ 找到 ${result.rows.length} 個新建立的表:`))
    result.rows.forEach((row: any) => {
      console.log(`   - ${row.table_name}`)
    })

    // 檢查索引
    const indexResult = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `)
    console.log(colors.green(`\n✅ 總索引數: ${indexResult.rows[0].count}`))

    // 檢查外鍵
    const fkResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND constraint_type = 'FOREIGN KEY'
    `)
    console.log(colors.green(`✅ 總外鍵數: ${fkResult.rows[0].count}`))

    console.log(colors.bold('\n' + colors.green('🎉 Migration 執行成功！')))
    console.log(colors.cyan('='.repeat(60)))
    console.log(colors.green('\n✅ Schema 同步完成'))
    console.log(colors.blue('📝 下一步: 執行資料遷移\n'))

  } catch (error: any) {
    // 回滾交易
    await client.query('ROLLBACK')
    console.error(colors.red('\n❌ Migration 執行失敗，已回滾'))
    console.error(colors.red(`錯誤: ${error.message}`))

    if (error.detail) {
      console.error(colors.yellow(`詳細: ${error.detail}`))
    }
    if (error.hint) {
      console.error(colors.yellow(`提示: ${error.hint}`))
    }

    console.error(colors.yellow('\n可能的原因:'))
    console.error('1. 表已存在')
    console.error('2. 權限不足')
    console.error('3. SQL 語法錯誤\n')

    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// 執行
executeMigration().catch((error) => {
  console.error(colors.red('\n❌ 腳本執行失敗:'), error)
  process.exit(1)
})
