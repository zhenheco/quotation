#!/usr/bin/env tsx
/**
 * 通過 Supabase HTTP API 執行 migrations
 */

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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function executeSQL(sql: string): Promise<void> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HTTP ${response.status}: ${error}`)
  }
}

async function createExecSqlFunction() {
  console.log('📝 建立 exec_sql 輔助函數...')

  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
`

  try {
    await executeSQL(createFunctionSQL)
    console.log('✅ exec_sql 函數已建立\n')
  } catch (error) {
    console.log('⚠️  exec_sql 函數可能已存在或無法建立，繼續執行...\n')
  }
}

async function runMigrations() {
  console.log('🚀 開始執行 migrations 通過 HTTP API...\n')

  try {
    // 先建立輔助函數
    await createExecSqlFunction()

    // 讀取所有 migration 檔案
    const migrationFiles = readdirSync(join(process.cwd(), 'migrations'))
      .filter(f => f.endsWith('.sql') && !f.includes('SUPABASE_INIT_ALL'))
      .sort()

    console.log(`📄 找到 ${migrationFiles.length} 個 migration 檔案\n`)

    for (const file of migrationFiles) {
      const migrationPath = join(process.cwd(), 'migrations', file)
      console.log(`⚙️  執行: ${file}`)

      const sql = readFileSync(migrationPath, 'utf-8')

      try {
        await executeSQL(sql)
        console.log(`   ✅ ${file} 完成`)
      } catch (err) {
        console.error(`   ❌ ${file} 失敗:`)
        console.error(err)
        throw err
      }
    }

    console.log('\n✅ 所有 migrations 執行成功！')

  } catch (error) {
    console.error('\n❌ Migration 執行失敗')
    console.error(error)
    console.log('\n📋 備用方案：')
    console.log('執行: cat migrations/SUPABASE_INIT_ALL.sql')
    console.log('然後在 Supabase SQL Editor 中手動執行')
    process.exit(1)
  }
}

runMigrations()
