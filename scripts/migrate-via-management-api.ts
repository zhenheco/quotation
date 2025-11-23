#!/usr/bin/env tsx
/**
 * 使用 Supabase Management API 執行 migrations
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const accessToken = process.env.SUPABASE_ACCESS_TOKEN!
const projectRef = 'oubsycwrxzkuviakzahi'

if (!accessToken) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

async function executeSQL(sql: string): Promise<void> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HTTP ${response.status}: ${error}`)
  }

  const result = await response.json()
  return result
}

async function runMigrations() {
  const startFrom = process.argv[2]
  console.log('🚀 開始執行 migrations 通過 Management API...\n')

  try {
    let migrationFiles = readdirSync(join(process.cwd(), 'migrations'))
      .filter(f => f.endsWith('.sql') && !f.includes('SUPABASE_INIT_ALL'))
      .sort()

    if (startFrom) {
      const startIndex = migrationFiles.indexOf(startFrom)
      if (startIndex === -1) {
        console.error(`❌ 找不到檔案: ${startFrom}`)
        process.exit(1)
      }
      migrationFiles = migrationFiles.slice(startIndex)
      console.log(`📌 從 ${startFrom} 開始執行\n`)
    }

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
    process.exit(1)
  }
}

runMigrations()
