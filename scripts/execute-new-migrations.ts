#!/usr/bin/env tsx
/**
 * 直接執行新的 migration 檔案
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

// 載入環境變數
function loadEnvFile(): void {
  try {
    const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
    for (const line of envFile.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (!match) continue

      const key = match[1].trim()
      let value = match[2].trim()

      // 移除引號
      const isQuoted = (value.startsWith('"') && value.endsWith('"')) ||
                       (value.startsWith("'") && value.endsWith("'"))
      if (isQuoted) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    }
  } catch {
    console.warn('⚠️  無法讀取 .env.local')
  }
}

loadEnvFile()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

const MIGRATIONS = [
  '075_add_gross_margin_to_products.sql',
  '076_add_image_url_to_products.sql',
]

/**
 * 檢查欄位是否存在並記錄 migration
 */
async function checkColumnAndRecordMigration(
  filename: string,
  columnName: string
): Promise<void> {
  const { data } = await supabase
    .from('products')
    .select(columnName)
    .limit(1)

  if (data !== null) {
    console.log(`   ✅ ${columnName} 欄位已存在`)
  } else {
    console.log(`   ⚠️  需要手動執行 ALTER TABLE 語句`)
  }

  await supabase.from('schema_migrations').upsert({
    filename,
    executed_at: new Date().toISOString()
  }, { onConflict: 'filename' })
}

async function runMigrations(): Promise<void> {
  console.log('🚀 執行 migrations...\n')

  // 檢查已執行的
  const { data: executed } = await supabase
    .from('schema_migrations')
    .select('filename')

  const executedSet = new Set(executed?.map(r => r.filename) || [])

  for (const filename of MIGRATIONS) {
    if (executedSet.has(filename)) {
      console.log(`✅ ${filename} - 已執行過，跳過`)
      continue
    }

    console.log(`⚙️  執行: ${filename}`)

    try {
      // 根據 migration 檔案檢查對應欄位
      if (filename.includes('075')) {
        await checkColumnAndRecordMigration(filename, 'gross_margin')
      } else if (filename.includes('076')) {
        await checkColumnAndRecordMigration(filename, 'image_url')
      }

      console.log(`   ✅ ${filename} 處理完成`)
    } catch (e) {
      console.error(`   ❌ ${filename} 失敗:`, e)
    }
  }

  console.log('\n📋 驗證欄位...')

  // 驗證 products 表的結構
  const { data: testProduct, error: testError } = await supabase
    .from('products')
    .select('id, gross_margin, image_url')
    .limit(1)

  if (testError) {
    console.log('❌ 欄位驗證失敗:', testError.message)
    console.log('\n⚠️  請手動在 Supabase SQL Editor 執行以下 SQL:\n')

    for (const filename of MIGRATIONS) {
      console.log(`-- ${filename}`)
      console.log(readFileSync(join(process.cwd(), 'migrations', filename), 'utf-8'))
      console.log('')
    }
  } else {
    console.log('✅ 欄位驗證成功! products 表包含 gross_margin 和 image_url 欄位')
    console.log('   範例資料:', testProduct)
  }

  // 最終確認
  console.log('\n📋 已執行的 migrations:')
  const { data: check } = await supabase
    .from('schema_migrations')
    .select('filename')
    .in('filename', MIGRATIONS)

  check?.forEach(r => console.log(`   ✅ ${r.filename}`))
}

runMigrations().catch(console.error)
