#!/usr/bin/env node
import { readFileSync } from 'fs'
import { join } from 'path'

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
  console.warn('⚠️  無法讀取 .env.local，使用現有環境變數')
}

import { query } from '../lib/db/zeabur'

async function applyMigration() {
  try {
    console.log('🚀 開始執行 migration 016_ensure_products_base_price.sql...\n')

    const migrationPath = join(
      process.cwd(),
      'migrations',
      '016_ensure_products_base_price.sql'
    )

    console.log(`📄 讀取檔案: ${migrationPath}`)
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('⚙️  執行 SQL...\n')
    await query(sql)

    console.log('✅ Migration 執行成功！\n')

    const result = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'products'
      AND column_name IN ('base_price', 'base_currency', 'unit_price', 'currency')
      ORDER BY column_name
    `)

    console.log('📊 products 表格欄位狀態：')
    console.table(result.rows)

    const sampleData = await query(`
      SELECT id, sku, base_price, base_currency
      FROM products
      LIMIT 3
    `)

    if (sampleData.rows.length > 0) {
      console.log('\n📝 範例資料（前 3 筆）：')
      console.table(sampleData.rows)
    }

  } catch (error) {
    console.error('\n❌ Migration 執行失敗：')
    console.error(error)
    process.exit(1)
  }
}

applyMigration()
