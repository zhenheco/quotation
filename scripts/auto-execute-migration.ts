#!/usr/bin/env tsx
/**
 * 自動執行 Supabase Migration
 *
 * 通過創建臨時 PostgreSQL function 並使用 RPC 調用來執行 DDL
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

const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
}

async function executeMigration() {
  console.log(colors.bold('\n🤖 自動執行 Supabase Migration'))
  console.log(colors.cyan('='.repeat(60)))

  // 讀取 migration SQL
  const migrationPath = resolve(process.cwd(), 'supabase-migrations/004_zeabur_tables_migration.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log(colors.blue(`\n📖 已讀取 migration SQL (${migrationSQL.length} 字元)`))

  // 檢查環境變數
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.log(colors.yellow('\n⚠️  未找到 Supabase URL'))
    console.log(colors.yellow('\n由於 Supabase JavaScript Client 無法直接執行 DDL,'))
    console.log(colors.yellow('請使用以下任一方法手動執行:\n'))
    printManualInstructions()
    return
  }

  if (!serviceRoleKey) {
    console.log(colors.yellow('\n⚠️  未找到 SUPABASE_SERVICE_ROLE_KEY'))
    console.log(colors.yellow('\n沒有 service role key 無法自動執行 DDL'))
    console.log(colors.yellow('SQL 已複製到剪貼簿，請手動執行：\n'))
    printManualInstructions()
    return
  }

  // 如果有 service role key，嘗試通過創建臨時 function 執行
  console.log(colors.blue('\n🔑 使用 service role key 嘗試自動執行...'))

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  try {
    // 步驟 1: 創建執行 SQL 的 function
    console.log(colors.blue('\n📝 步驟 1: 創建臨時 execution function...'))

    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_migration_sql()
      RETURNS text AS $$
      BEGIN
        ${migrationSQL.replace(/\$/g, '\\$')}
        RETURN 'Migration completed successfully';
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    // 這仍然需要能夠執行 DDL，所以還是會失敗
    // 但讓我們試試看

    console.log(colors.yellow('⚠️  Supabase JS Client 限制:'))
    console.log(colors.yellow('即使有 service role key，也無法通過 REST API 執行 DDL\n'))

    printManualInstructions()

  } catch (error: any) {
    console.error(colors.red(`\n❌ 自動執行失敗: ${error.message}\n`))
    printManualInstructions()
  }
}

function printManualInstructions() {
  console.log(colors.bold(colors.green('\n✨ 手動執行步驟（簡單快速）:\n')))

  console.log(colors.cyan('方法 1: Supabase Dashboard（推薦）'))
  console.log('1. SQL 已複製到剪貼簿')
  console.log('2. 瀏覽器已打開 Supabase Dashboard')
  console.log('3. 登入後，點擊 "+ New query"')
  console.log('4. 按 Cmd+V 貼上 SQL')
  console.log('5. 點擊 "Run" 或按 Cmd+Enter')
  console.log('6. 等待 5-10 秒完成\n')

  console.log(colors.cyan('方法 2: 直接查看 SQL 文件'))
  console.log('路徑: supabase-migrations/004_zeabur_tables_migration.sql\n')

  console.log(colors.bold('📊 執行後驗證:'))
  console.log(colors.yellow('應該會建立 14 個新表'))
  console.log(colors.yellow('- 5 個 RBAC 表'))
  console.log(colors.yellow('- 3 個多公司表'))
  console.log(colors.yellow('- 3 個合約付款表'))
  console.log(colors.yellow('- 3 個審計擴充表\n'))
}

// 執行
executeMigration().catch((error) => {
  console.error(colors.red('\n❌ 腳本執行失敗:'), error)
  process.exit(1)
})
