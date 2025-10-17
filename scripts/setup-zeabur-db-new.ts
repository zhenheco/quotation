#!/usr/bin/env tsx

/**
 * Zeabur PostgreSQL Schema 設置腳本
 * 使用 Node.js + pg 客戶端執行
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

// 手動載入 .env.local
const envPath = join(process.cwd(), '.env.local')
if (readFileSync(envPath, 'utf-8')) {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=')
        process.env[key] = value
      }
    }
  })
}

const connectionString = process.env.ZEABUR_POSTGRES_URL

if (!connectionString) {
  console.error('❌ ZEABUR_POSTGRES_URL 環境變數未設置')
  console.error('')
  console.error('請在 .env.local 中設置：')
  console.error('ZEABUR_POSTGRES_URL=postgresql://user:password@host:port/database')
  console.error('')
  process.exit(1)
}

// 遮蔽密碼顯示
const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@')

console.log('🔧 Zeabur PostgreSQL 業務數據庫設置')
console.log('========================================')
console.log('')
console.log(`📡 連接到: ${maskedUrl}`)
console.log('')

async function setupDatabase() {
  const client = new Client({
    connectionString,
    ssl: false // Zeabur 內網連接不需要 SSL
  })

  try {
    // 測試連接
    console.log('🔍 測試連接...')
    await client.connect()
    console.log('✅ 連接成功！')
    console.log('')

    // 讀取 SQL 文件
    console.log('📋 讀取 Schema 文件...')
    const sqlPath = join(process.cwd(), 'supabase-migrations', 'zeabur-schema.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    console.log(`✅ 已載入 ${sql.split('\n').length} 行 SQL`)
    console.log('')

    // 執行 SQL
    console.log('⚙️  執行 Schema...')
    console.log('即將：')
    console.log('  • 刪除所有現有業務表（如有）')
    console.log('  • 重建表結構（無 Supabase 依賴）')
    console.log('  • 創建索引和觸發器')
    console.log('')

    await client.query(sql)

    console.log('')
    console.log('==========================================')
    console.log('✅ Zeabur PostgreSQL 設置完成！')
    console.log('==========================================')
    console.log('')
    console.log('創建的表：')
    console.log('  ✅ customers (客戶表)')
    console.log('  ✅ products (產品表)')
    console.log('  ✅ quotations (報價單表)')
    console.log('  ✅ quotation_items (報價單項目表)')
    console.log('  ✅ exchange_rates (匯率表)')
    console.log('')

    // 驗證表已創建
    console.log('🔍 驗證表結構...')
    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `)

    console.log('')
    console.log('數據庫中的表：')
    result.rows.forEach(row => {
      console.log(`  • ${row.tablename}`)
    })
    console.log('')

    console.log('下一步：')
    console.log('  1. 重啟開發服務：')
    console.log('     rm -rf .next && npm run dev')
    console.log('')
    console.log('  2. 測試功能：')
    console.log('     http://localhost:3000/zh/customers')
    console.log('     http://localhost:3000/zh/products')
    console.log('     http://localhost:3000/zh/quotations')
    console.log('')

  } catch (error) {
    console.error('')
    console.error('❌ 設置失敗！')
    console.error('')

    if (error instanceof Error) {
      console.error('錯誤訊息：', error.message)

      // 提供具體的錯誤建議
      if (error.message.includes('connect')) {
        console.error('')
        console.error('可能原因：')
        console.error('  1. Zeabur PostgreSQL 服務未運行')
        console.error('  2. 網路連接問題')
        console.error('  3. 防火牆阻擋')
      } else if (error.message.includes('authentication')) {
        console.error('')
        console.error('可能原因：')
        console.error('  1. 密碼錯誤')
        console.error('  2. 用戶名錯誤')
      } else if (error.message.includes('permission')) {
        console.error('')
        console.error('可能原因：')
        console.error('  1. 用戶權限不足')
        console.error('  2. 需要使用管理員帳號')
      }
    }

    console.error('')
    process.exit(1)
  } finally {
    await client.end()
  }
}

setupDatabase()
