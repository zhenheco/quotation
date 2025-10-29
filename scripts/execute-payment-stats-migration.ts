#!/usr/bin/env tsx
import { readFileSync } from 'fs'
import { resolve } from 'path'

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

const migrationSQL = readFileSync(
  resolve(process.cwd(), 'migrations/007_add_payment_statistics_function.sql'),
  'utf-8'
)

const dbUrl = process.env.ZEABUR_POSTGRES_URL || process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('❌ Database URL not found')
  console.error('   Please set ZEABUR_POSTGRES_URL or SUPABASE_DB_URL')
  process.exit(1)
}

async function executeMigration() {
  console.log('🚀 執行 migration...')

  const { Client } = await import('pg')
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('✅ 連接成功')

    await client.query(migrationSQL)
    console.log('✅ Migration 執行成功')
  } catch (error: any) {
    console.error('❌ 執行失敗:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

executeMigration()
