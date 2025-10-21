#!/usr/bin/env tsx
/**
 * 使用 Supabase JavaScript Client 執行 Migration
 *
 * 由於 Supabase JS client 不支援執行 DDL，此腳本會：
 * 1. 嘗試使用 REST API
 * 2. 如果失敗，提供替代方案
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
  console.log(colors.bold('\n🚀 使用 Supabase Client 執行 Migration'))
  console.log(colors.cyan('='.repeat(60)))
  console.log(`執行時間: ${new Date().toLocaleString('zh-TW')}\n`)

  // 檢查環境變數
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error(colors.red('❌ 錯誤: Supabase 環境變數未設置'))
    process.exit(1)
  }

  // 讀取 migration SQL
  const migrationPath = resolve(process.cwd(), 'supabase-migrations/004_zeabur_tables_migration.sql')
  console.log(colors.blue(`📖 讀取 migration 文件...`))

  let migrationSQL: string
  try {
    migrationSQL = readFileSync(migrationPath, 'utf-8')
    const lines = migrationSQL.split('\n').length
    console.log(colors.green(`✅ 讀取成功 (${lines} 行)\n`))
  } catch (error: any) {
    console.error(colors.red(`❌ 無法讀取 migration 文件: ${error.message}`))
    process.exit(1)
  }

  // 使用 service role key (如果有) 或 anon key
  const key = serviceRoleKey || supabaseKey
  const keyType = serviceRoleKey ? 'service role key' : 'anon key'

  console.log(colors.blue(`🔑 使用 ${keyType}`))

  if (!serviceRoleKey) {
    console.log(colors.yellow('\n⚠️  警告: 未找到 service role key'))
    console.log(colors.yellow('使用 anon key 可能無法執行 DDL 語句\n'))
  }

  const supabase = createClient(supabaseUrl, key)

  console.log(colors.bold('🔧 嘗試執行 migration...'))
  console.log(colors.cyan('─'.repeat(60)))

  try {
    // Supabase JS client 的 rpc 方法可以執行 SQL
    // 但需要先創建一個 database function

    // 方法 1: 嘗試使用 REST API 直接執行
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: migrationSQL
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()
    console.log(colors.green('\n✅ Migration 執行成功！'))
    console.log(result)

  } catch (error: any) {
    console.log(colors.yellow('\n⚠️  直接執行失敗（預期行為）'))
    console.log(colors.yellow(`原因: ${error.message}\n`))

    console.log(colors.bold('📝 Supabase JS Client 不支援直接執行 DDL'))
    console.log(colors.cyan('\n請使用以下方式之一執行 migration:\n'))

    console.log(colors.bold('方法 1: Supabase Dashboard（推薦）✨'))
    console.log('步驟:')
    console.log('1. 打開: https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/editor')
    console.log('2. 登入您的 Supabase 帳號')
    console.log('3. 點擊 "New query"')
    console.log('4. 複製貼上以下文件的完整內容:')
    console.log(colors.cyan(`   ${migrationPath}`))
    console.log('5. 點擊 "Run" 或按 Cmd/Ctrl + Enter\n')

    console.log(colors.bold('方法 2: 使用 psql（需要資料庫密碼）'))
    console.log('1. 從 Supabase Dashboard > Settings > Database 取得連接字串')
    console.log('2. 執行:')
    console.log(colors.cyan(`   psql "[YOUR_DATABASE_URL]" < ${migrationPath}\n`))

    console.log(colors.bold('方法 3: 複製 SQL 到剪貼簿'))
    console.log(colors.cyan('   pbcopy < supabase-migrations/004_zeabur_tables_migration.sql'))
    console.log('   然後貼到 Supabase Dashboard\n')

    // 顯示 SQL 的前幾行
    console.log(colors.bold('Migration SQL 預覽:'))
    console.log(colors.cyan('─'.repeat(60)))
    const preview = migrationSQL.split('\n').slice(0, 20).join('\n')
    console.log(preview)
    console.log(colors.cyan('─'.repeat(60)))
    console.log(colors.yellow(`... 還有 ${migrationSQL.split('\n').length - 20} 行\n`))
  }
}

// 執行
executeMigration().catch((error) => {
  console.error(colors.red('\n❌ 腳本執行失敗:'), error)
  process.exit(1)
})
