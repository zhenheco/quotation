#!/usr/bin/env tsx
/**
 * 執行 Supabase Migration 腳本
 *
 * 此腳本會執行 supabase-migrations/004_zeabur_tables_migration.sql
 * 在 Supabase 資料庫中創建所有缺少的表
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
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
  console.log(colors.bold('\n🚀 執行 Supabase Migration'))
  console.log(colors.cyan('='.repeat(60)))
  console.log(`執行時間: ${new Date().toLocaleString('zh-TW')}\n`)

  // 檢查環境變數
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error(colors.red('❌ 錯誤: NEXT_PUBLIC_SUPABASE_URL 未設置'))
    process.exit(1)
  }

  if (!supabaseServiceKey) {
    console.log(colors.yellow('⚠️  未找到 SUPABASE_SERVICE_ROLE_KEY'))
    console.log(colors.yellow('\n此腳本需要 service role key 才能執行 DDL 語句'))
    console.log(colors.cyan('\n替代方案:'))
    console.log('1. 在 .env.local 中添加 SUPABASE_SERVICE_ROLE_KEY')
    console.log('2. 使用 Supabase Dashboard 的 SQL Editor 手動執行')
    console.log('3. 使用 Supabase CLI: supabase db push\n')

    console.log(colors.bold('手動執行步驟:'))
    console.log('1. 打開 Supabase Dashboard: https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby')
    console.log('2. 進入 SQL Editor')
    console.log('3. 複製 supabase-migrations/004_zeabur_tables_migration.sql 的內容')
    console.log('4. 貼上並執行\n')

    const migrationPath = resolve(process.cwd(), 'supabase-migrations/004_zeabur_tables_migration.sql')
    console.log(colors.blue(`Migration 文件位置: ${migrationPath}\n`))

    return
  }

  console.log(colors.green('✅ 環境變數檢查通過'))
  console.log(`   URL: ${supabaseUrl}`)
  console.log(`   Service Key: ${supabaseServiceKey.substring(0, 20)}...\n`)

  // 讀取 migration SQL
  const migrationPath = resolve(process.cwd(), 'supabase-migrations/004_zeabur_tables_migration.sql')
  console.log(colors.blue(`📖 讀取 migration 文件: ${migrationPath}`))

  let migrationSQL: string
  try {
    migrationSQL = readFileSync(migrationPath, 'utf-8')
    console.log(colors.green(`✅ Migration 文件讀取成功 (${migrationSQL.length} 字元)\n`))
  } catch (error: any) {
    console.error(colors.red(`❌ 無法讀取 migration 文件: ${error.message}`))
    process.exit(1)
  }

  // 創建 Supabase client (使用 service role key)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log(colors.bold('🔧 開始執行 migration...'))
  console.log(colors.cyan('─'.repeat(60)))

  try {
    // 注意: Supabase JS client 不支援直接執行 DDL
    // 我們需要使用 rpc 或 REST API
    console.log(colors.yellow('\n⚠️  Supabase JS client 不支援直接執行 DDL 語句'))
    console.log(colors.yellow('請使用以下方式之一執行 migration:\n'))

    console.log(colors.bold('方法 1: Supabase Dashboard (推薦)'))
    console.log('1. 訪問: https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/editor')
    console.log('2. 點擊 "New query"')
    console.log('3. 複製貼上 migration SQL 並執行\n')

    console.log(colors.bold('方法 2: Supabase CLI'))
    console.log('1. 安裝 CLI: npm install -g supabase')
    console.log('2. 登入: supabase login')
    console.log('3. 連接專案: supabase link --project-ref nxlqtnnssfzzpbyfjnby')
    console.log('4. 執行: supabase db push\n')

    console.log(colors.bold('方法 3: PostgreSQL 直接連線'))
    console.log('如果有 PostgreSQL connection string (需要 pooler 或 direct connection):')
    console.log('psql "postgresql://postgres:[password]@db.nxlqtnnssfzzpbyfjnby.supabase.co:5432/postgres" < supabase-migrations/004_zeabur_tables_migration.sql\n')

    console.log(colors.cyan('─'.repeat(60)))
    console.log(colors.blue('\n💡 建議: 使用 Supabase Dashboard 的 SQL Editor 最為簡單安全\n'))

  } catch (error: any) {
    console.error(colors.red('\n❌ Migration 執行失敗:'), error.message)
    if (error.hint) {
      console.error(colors.yellow(`提示: ${error.hint}`))
    }
    process.exit(1)
  }
}

// 執行
executeMigration().catch((error) => {
  console.error(colors.red('\n❌ 腳本執行失敗:'), error)
  process.exit(1)
})
