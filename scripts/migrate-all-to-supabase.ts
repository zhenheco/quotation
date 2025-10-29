#!/usr/bin/env tsx
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

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

const dbUrl = process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not found')
  process.exit(1)
}

async function executeMigrations() {
  console.log('🚀 執行所有 migrations 到 Supabase...\n')

  const { Client } = await import('pg')
  const client = new Client({ connectionString: dbUrl })

  try {
    await client.connect()
    console.log('✅ 連接 Supabase 成功\n')

    const migrationsDir = resolve(process.cwd(), 'migrations')
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`📁 找到 ${files.length} 個 migration 檔案:\n`)

    for (const file of files) {
      if (file.endsWith('.skip')) {
        console.log(`📄 跳過: ${file}\n`)
        continue
      }

      console.log(`📄 執行: ${file}`)
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')

      // 檢查是否包含 CONCURRENTLY
      const hasConcurrent = sql.includes('CONCURRENTLY')

      try {
        if (hasConcurrent) {
          // CONCURRENTLY 需要逐行執行
          const statements = sql.split(';').filter(s => s.trim())
          for (const stmt of statements) {
            if (stmt.trim() && !stmt.trim().startsWith('--')) {
              try {
                await client.query(stmt)
              } catch (err: any) {
                if (!err.message.includes('already exists')) {
                  throw err
                }
              }
            }
          }
          console.log(`   ✅ 成功 (CONCURRENTLY 模式)\n`)
        } else {
          await client.query(sql)
          console.log(`   ✅ 成功\n`)
        }
      } catch (error: any) {
        const ignorable = [
          'already exists',
          'does not exist',
          'duplicate key',
          'relation "exchange_rates" already exists',
          'violates foreign key constraint'
        ]

        if (ignorable.some(msg => error.message.includes(msg))) {
          console.log(`   ⚠️  已存在或可忽略的錯誤，跳過\n`)
        } else {
          console.error(`   ❌ 失敗: ${error.message}\n`)
        }
      }
    }

    console.log('🎉 所有 migrations 執行完成！')
  } catch (error: any) {
    console.error('❌ Migration 失敗:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

executeMigrations()
