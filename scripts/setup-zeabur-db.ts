/**
 * 設定 Zeabur PostgreSQL 資料庫
 * 建立 exchange_rates 表和相關結構
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// 使用 pg 直接連接到 Zeabur PostgreSQL
const { Client } = require('pg')

const connectionString = process.env.ZEABUR_POSTGRES_URL

if (!connectionString) {
  console.error('❌ ZEABUR_POSTGRES_URL 環境變數未設置')
  console.error('請在 .env.local 檔案中設置:')
  console.error('ZEABUR_POSTGRES_URL=postgresql://user:password@host:port/database')
  process.exit(1)
}

async function setupDatabase() {
  console.log('🔧 連接到 Zeabur PostgreSQL...')

  const client = new Client({
    connectionString,
    ssl: false
  })

  try {
    await client.connect()
    console.log('✅ 已連接到資料庫')

    // 手動執行每個 SQL 語句
    console.log('\n📝 執行 SQL 語句...\n')

    // 1. 啟用 UUID extension
    try {
      console.log('1. 啟用 UUID extension...')
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
      console.log('✅ UUID extension 已啟用\n')
    } catch (error: any) {
      console.log(`⚠️  ${error.message}\n`)
    }

    // 2. 建立 exchange_rates 表
    try {
      console.log('2. 建立 exchange_rates 表...')
      await client.query(`
        CREATE TABLE exchange_rates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          from_currency VARCHAR(3) NOT NULL,
          to_currency VARCHAR(3) NOT NULL,
          rate DECIMAL(10, 6) NOT NULL,
          date DATE NOT NULL,
          source VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(from_currency, to_currency, date)
        )
      `)
      console.log('✅ exchange_rates 表建立成功\n')
    } catch (error: any) {
      console.log(`⚠️  ${error.message}\n`)
    }

    // 3. 建立索引
    try {
      console.log('3. 建立索引...')
      await client.query('CREATE INDEX idx_exchange_rates_currencies_date ON exchange_rates(from_currency, to_currency, date)')
      console.log('✅ 索引建立成功\n')
    } catch (error: any) {
      console.log(`⚠️  ${error.message}\n`)
    }

    // 4. 授予權限
    try {
      console.log('4. 授予權限給 root 用戶...')
      await client.query('GRANT ALL PRIVILEGES ON TABLE exchange_rates TO root')
      console.log('✅ 權限授予成功\n')
    } catch (error: any) {
      console.log(`⚠️  ${error.message}\n`)
    }

    // 驗證表是否建立成功
    console.log('🔍 驗證 exchange_rates 表...')
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'exchange_rates'
    `)

    if (result.rows.length > 0) {
      console.log('✅ exchange_rates 表建立成功!')
    } else {
      console.log('❌ exchange_rates 表建立失敗!')
    }

    // 列出所有表
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    console.log('\n📊 資料庫中的表:')
    tables.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`)
    })

  } catch (error) {
    console.error('❌ 錯誤:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n👋 資料庫連接已關閉')
  }
}

setupDatabase()
