#!/usr/bin/env tsx
/**
 * 資料庫健康檢查測試腳本
 *
 * 測試項目:
 * 1. Zeabur PostgreSQL 連線測試
 * 2. Supabase 連線測試
 * 3. 基本表查詢測試
 * 4. 外鍵關聯測試
 * 5. 索引存在性測試
 */

import { Pool } from 'pg'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// 顏色輸出
// ============================================================================
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
}

// ============================================================================
// 測試結果追蹤
// ============================================================================
interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  message?: string
  duration?: number
}

const results: TestResult[] = []

function addResult(result: TestResult) {
  results.push(result)
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'
  const statusColor = result.status === 'pass' ? colors.green : result.status === 'fail' ? colors.red : colors.yellow
  console.log(`${icon} ${statusColor(result.name)} ${result.duration ? `(${result.duration}ms)` : ''}`)
  if (result.message) {
    console.log(`   ${result.message}`)
  }
}

// ============================================================================
// Zeabur PostgreSQL 測試
// ============================================================================
async function testZeaburConnection(): Promise<boolean> {
  const start = Date.now()
  console.log(colors.bold('\n📦 測試 Zeabur PostgreSQL 連線'))
  console.log(colors.cyan('─'.repeat(60)))

  try {
    const connectionString = process.env.ZEABUR_POSTGRES_URL

    if (!connectionString) {
      addResult({
        name: 'Zeabur 環境變數',
        status: 'fail',
        message: 'ZEABUR_POSTGRES_URL 未設置',
      })
      return false
    }

    addResult({
      name: 'Zeabur 環境變數',
      status: 'pass',
      message: `連線字串: ${connectionString.replace(/:[^:@]+@/, ':****@')}`,
    })

    const pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
    })

    // 測試連線
    const client = await pool.connect()
    const duration = Date.now() - start
    addResult({
      name: 'Zeabur 資料庫連線',
      status: 'pass',
      duration,
    })

    // 檢查表
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    addResult({
      name: 'Zeabur 表數量',
      status: 'pass',
      message: `找到 ${tablesResult.rows.length} 個表`,
    })

    console.log(colors.blue('\n   表清單:'))
    tablesResult.rows.forEach((row: any) => {
      console.log(`   - ${row.table_name}`)
    })

    // 檢查關鍵表
    const requiredTables = ['customers', 'products', 'quotations', 'quotation_items', 'exchange_rates', 'roles', 'permissions']
    const existingTables = tablesResult.rows.map((r: any) => r.table_name)

    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        addResult({
          name: `表 ${table}`,
          status: 'pass',
        })
      } else {
        addResult({
          name: `表 ${table}`,
          status: 'fail',
          message: '表不存在',
        })
      }
    }

    // 檢查索引
    const indexResult = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('customers', 'products', 'quotations', 'quotation_items')
      ORDER BY tablename, indexname
    `)

    addResult({
      name: 'Zeabur 索引數量',
      status: 'pass',
      message: `找到 ${indexResult.rows.length} 個索引`,
    })

    console.log(colors.blue('\n   關鍵索引:'))
    const tableIndexes = indexResult.rows.reduce((acc: any, row: any) => {
      if (!acc[row.tablename]) acc[row.tablename] = []
      acc[row.tablename].push(row.indexname)
      return acc
    }, {})

    Object.entries(tableIndexes).forEach(([table, indexes]: [string, any]) => {
      console.log(`   ${table}: ${indexes.length} 個索引`)
    })

    // 檢查外鍵
    const fkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `)

    addResult({
      name: 'Zeabur 外鍵數量',
      status: 'pass',
      message: `找到 ${fkResult.rows.length} 個外鍵約束`,
    })

    client.release()
    await pool.end()

    return true
  } catch (error: any) {
    addResult({
      name: 'Zeabur 連線測試',
      status: 'fail',
      message: error.message,
    })
    return false
  }
}

// ============================================================================
// Supabase 測試
// ============================================================================
async function testSupabaseConnection(): Promise<boolean> {
  const start = Date.now()
  console.log(colors.bold('\n🔐 測試 Supabase 連線'))
  console.log(colors.cyan('─'.repeat(60)))

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      addResult({
        name: 'Supabase 環境變數',
        status: 'fail',
        message: 'NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY 未設置',
      })
      return false
    }

    addResult({
      name: 'Supabase 環境變數',
      status: 'pass',
      message: `URL: ${supabaseUrl}`,
    })

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 測試連線 (查詢 customers 表)
    const { data, error } = await supabase
      .from('customers')
      .select('count')
      .limit(1)

    const duration = Date.now() - start

    if (error) {
      // 如果是 RLS 錯誤,也算連線成功(表示表存在但 RLS 阻擋)
      if (error.message.includes('row-level security') || error.code === 'PGRST301') {
        addResult({
          name: 'Supabase 連線',
          status: 'pass',
          message: 'RLS 正常運作 (未登入無法查詢)',
          duration,
        })
      } else {
        addResult({
          name: 'Supabase 連線',
          status: 'fail',
          message: error.message,
          duration,
        })
        return false
      }
    } else {
      addResult({
        name: 'Supabase 連線',
        status: 'pass',
        duration,
      })
    }

    // 測試其他表
    const tables = ['products', 'quotations', 'quotation_items', 'exchange_rates']

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)

      if (error) {
        if (error.message.includes('row-level security') || error.code === 'PGRST301') {
          addResult({
            name: `Supabase 表 ${table}`,
            status: 'pass',
            message: 'RLS 啟用',
          })
        } else {
          addResult({
            name: `Supabase 表 ${table}`,
            status: 'fail',
            message: error.message,
          })
        }
      } else {
        addResult({
          name: `Supabase 表 ${table}`,
          status: 'pass',
        })
      }
    }

    return true
  } catch (error: any) {
    addResult({
      name: 'Supabase 連線測試',
      status: 'fail',
      message: error.message,
    })
    return false
  }
}

// ============================================================================
// 主測試流程
// ============================================================================
async function runTests() {
  console.log(colors.bold('\n🏥 資料庫健康檢查測試'))
  console.log(colors.cyan('='.repeat(60)))
  console.log(`執行時間: ${new Date().toLocaleString('zh-TW')}`)

  const zeaburOk = await testZeaburConnection()
  const supabaseOk = await testSupabaseConnection()

  // 總結
  console.log(colors.bold('\n📊 測試總結'))
  console.log(colors.cyan('='.repeat(60)))

  const passCount = results.filter(r => r.status === 'pass').length
  const failCount = results.filter(r => r.status === 'fail').length
  const skipCount = results.filter(r => r.status === 'skip').length

  console.log(`✅ 通過: ${colors.green(passCount.toString())}`)
  console.log(`❌ 失敗: ${colors.red(failCount.toString())}`)
  console.log(`⚠️  跳過: ${colors.yellow(skipCount.toString())}`)
  console.log(`📝 總計: ${results.length}`)

  console.log('\n' + colors.cyan('─'.repeat(60)))

  if (zeaburOk && supabaseOk) {
    console.log(colors.green(colors.bold('\n✅ 所有資料庫連線正常！')))
    console.log(colors.green('\n系統健康狀態: 良好'))
  } else {
    console.log(colors.red(colors.bold('\n❌ 部分資料庫連線失敗')))
    console.log(colors.yellow('\n請檢查環境變數設定和資料庫狀態'))
    process.exit(1)
  }

  console.log('\n' + colors.cyan('='.repeat(60)))
  console.log(colors.blue('\n詳細報告請參考: DATABASE_HEALTH_CHECK_REPORT.md'))
  console.log('')
}

// 執行測試
runTests().catch((error) => {
  console.error(colors.red('\n❌ 測試執行失敗:'), error)
  process.exit(1)
})
