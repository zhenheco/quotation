#!/usr/bin/env tsx

/**
 * 執行 share_tokens migration
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// 手動載入環境變數
const envPath = join(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const [, key, value] = match
    process.env[key.trim()] = value.trim()
  }
})

import { getZeaburPool } from '../lib/db/zeabur'

async function applyMigration() {
  const pool = getZeaburPool()

  try {
    console.log('🔧 開始執行 share_tokens migration...\n')

    // 讀取 migration 文件（Zeabur 版本，不包含 RLS）
    const migrationPath = join(
      __dirname,
      '../supabase-migrations/003_add_share_tokens_zeabur.sql'
    )
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration 文件讀取成功')
    console.log('📊 開始執行 SQL...\n')

    // 執行 migration
    await pool.query(migrationSQL)

    console.log('✅ Migration 執行成功！')
    console.log('\n已創建：')
    console.log('  • share_tokens 表')
    console.log('  • 相關索引')
    console.log('  • RLS 政策')
    console.log('  • generate_share_token() 函數')

    // 驗證表是否存在
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'share_tokens'
      );
    `)

    if (checkTable.rows[0].exists) {
      console.log('\n✅ 驗證通過：share_tokens 表已成功創建')
    } else {
      console.log('\n❌ 錯誤：share_tokens 表創建失敗')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Migration 執行失敗:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

applyMigration()
