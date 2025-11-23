#!/usr/bin/env tsx
/**
 * 使用 Supabase SDK 執行 migrations
 * 當 Direct connection 無法連接時使用
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSql(sql: string) {
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql })

  if (error) {
    // 如果 exec_sql 函式不存在，嘗試直接執行（可能需要分段）
    console.warn('⚠️  exec_sql 函式不可用，請使用 Supabase SQL Editor 手動執行')
    throw error
  }

  return data
}

async function runMigrations() {
  console.log('🚀 開始執行 migrations...\n')

  try {
    // 讀取所有 migration 檔案
    const migrationFiles = readdirSync(join(process.cwd(), 'migrations'))
      .filter(f => f.endsWith('.sql') && f !== 'SUPABASE_INIT_ALL.sql')
      .sort()

    console.log(`📄 找到 ${migrationFiles.length} 個 migration 檔案\n`)

    for (const file of migrationFiles) {
      const migrationPath = join(process.cwd(), 'migrations', file)
      console.log(`⚙️  執行: ${file}`)

      const sql = readFileSync(migrationPath, 'utf-8')

      try {
        await executeSql(sql)
        console.log(`   ✅ ${file} 完成`)
      } catch (err) {
        console.error(`   ❌ ${file} 失敗:`, err)
        console.log('\n⚠️  請改用 Supabase SQL Editor 手動執行')
        console.log(`   檔案位置: migrations/${file}`)
        process.exit(1)
      }
    }

    console.log('\n✅ 所有 migrations 執行成功！')

  } catch (error) {
    console.error('\n❌ Migration 執行失敗：')
    console.error(error)
    console.log('\n📋 請改用以下方法：')
    console.log('1. 前往 Supabase Dashboard → SQL Editor')
    console.log('2. 執行檔案: migrations/SUPABASE_INIT_ALL.sql')
    process.exit(1)
  }
}

runMigrations()
