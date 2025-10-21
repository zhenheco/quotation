#!/usr/bin/env tsx
/**
 * Schema 差異分析腳本
 *
 * 比對 Zeabur 和 Supabase 的 schema，識別需要同步的內容
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Pool } from 'pg'
import { createClient } from '@supabase/supabase-js'

// 載入環境變數
try {
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
} catch (error) {
  console.log('⚠️  無法載入 .env.local')
}

// 顏色
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
}

// 報價系統的表（需要遷移）
const QUOTATION_TABLES = [
  // 核心業務表
  'customers',
  'products',
  'quotations',
  'quotation_items',
  'exchange_rates',
  // RBAC 系統
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'user_profiles',
  // 進階功能
  'companies',
  'company_members',
  'company_settings',
  'customer_contracts',
  'payments',
  'payment_schedules',
  'audit_logs',
  // 擴充功能
  'quotation_shares',
  'quotation_versions',
]

interface TableInfo {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

interface IndexInfo {
  tablename: string
  indexname: string
  indexdef: string
}

interface ForeignKeyInfo {
  table_name: string
  column_name: string
  foreign_table_name: string
  foreign_column_name: string
  constraint_name: string
}

async function analyzeZeaburSchema(pool: Pool) {
  console.log(colors.bold('\n📦 分析 Zeabur Schema'))
  console.log(colors.cyan('─'.repeat(60)))

  // 獲取表結構
  const tablesResult = await pool.query<TableInfo>(`
    SELECT
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = ANY($1::text[])
    ORDER BY table_name, ordinal_position
  `, [QUOTATION_TABLES])

  // 獲取索引
  const indexesResult = await pool.query<IndexInfo>(`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = ANY($1::text[])
    ORDER BY tablename, indexname
  `, [QUOTATION_TABLES])

  // 獲取外鍵
  const fkResult = await pool.query<ForeignKeyInfo>(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = ANY($1::text[])
    ORDER BY tc.table_name, kcu.column_name
  `, [QUOTATION_TABLES])

  // 按表分組
  const tablesByName = new Map<string, TableInfo[]>()
  tablesResult.rows.forEach(row => {
    if (!tablesByName.has(row.table_name)) {
      tablesByName.set(row.table_name, [])
    }
    tablesByName.get(row.table_name)!.push(row)
  })

  console.log(colors.green(`✅ 找到 ${tablesByName.size} 個報價系統表`))
  console.log(colors.green(`✅ ${indexesResult.rows.length} 個索引`))
  console.log(colors.green(`✅ ${fkResult.rows.length} 個外鍵約束\n`))

  return {
    tables: tablesByName,
    indexes: indexesResult.rows,
    foreignKeys: fkResult.rows
  }
}

async function analyzeSupabaseSchema() {
  console.log(colors.bold('\n🔐 分析 Supabase Schema'))
  console.log(colors.cyan('─'.repeat(60)))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // 注意：這裡我們無法直接查詢 information_schema（需要 service role key）
  // 我們需要使用 Supabase 的 MCP server 或讀取 schema 文件

  console.log(colors.yellow('⚠️  Supabase schema 分析需要 service role key'))
  console.log(colors.yellow('⚠️  將從 supabase-schema.sql 讀取 schema\n'))

  const schemaPath = resolve(process.cwd(), 'supabase-schema.sql')
  const schemaContent = readFileSync(schemaPath, 'utf-8')

  // 解析 CREATE TABLE 語句
  const createTableRegex = /CREATE TABLE (?:IF NOT EXISTS )?(\w+)\s*\(([\s\S]*?)\);/gi
  const tables = new Set<string>()

  let match
  while ((match = createTableRegex.exec(schemaContent)) !== null) {
    tables.add(match[1])
  }

  console.log(colors.green(`✅ Supabase 現有 ${tables.size} 個表`))
  Array.from(tables).sort().forEach(table => {
    console.log(`   - ${table}`)
  })

  return { tables: Array.from(tables) }
}

async function compareSchemas(zeaburSchema: any, supabaseSchema: any) {
  console.log(colors.bold('\n🔍 Schema 差異分析'))
  console.log(colors.cyan('='.repeat(60)))

  const zeaburTables = Array.from(zeaburSchema.tables.keys()).sort()
  const supabaseTables = supabaseSchema.tables.sort()

  // 找出缺少的表
  const missingTables = zeaburTables.filter(t => !supabaseTables.includes(t))
  const existingTables = zeaburTables.filter(t => supabaseTables.includes(t))

  console.log(colors.bold('\n📊 表分類'))
  console.log(colors.cyan('─'.repeat(60)))

  if (existingTables.length > 0) {
    console.log(colors.green(`\n✅ Supabase 已存在的表 (${existingTables.length}):)`))
    existingTables.forEach(table => {
      const colCount = zeaburSchema.tables.get(table)?.length || 0
      console.log(`   ${colors.green('✓')} ${table} (${colCount} 個欄位)`)
    })
  }

  if (missingTables.length > 0) {
    console.log(colors.red(`\n❌ Supabase 缺少的表 (${missingTables.length}):`))
    missingTables.forEach(table => {
      const colCount = zeaburSchema.tables.get(table)?.length || 0
      console.log(`   ${colors.red('✗')} ${table} (${colCount} 個欄位)`)
    })
  }

  // 詳細顯示缺少的表結構
  if (missingTables.length > 0) {
    console.log(colors.bold('\n📝 需要建立的表結構'))
    console.log(colors.cyan('='.repeat(60)))

    missingTables.forEach(tableName => {
      const columns = zeaburSchema.tables.get(tableName) || []
      console.log(colors.yellow(`\n${tableName}:`))
      columns.forEach((col: TableInfo) => {
        const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL'
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
        console.log(`  - ${col.column_name}: ${col.data_type}${nullable}${defaultVal}`)
      })

      // 顯示相關索引
      const tableIndexes = zeaburSchema.indexes.filter((idx: IndexInfo) => idx.tablename === tableName)
      if (tableIndexes.length > 0) {
        console.log(colors.blue(`  索引 (${tableIndexes.length}):`))
        tableIndexes.forEach((idx: IndexInfo) => {
          console.log(`  - ${idx.indexname}`)
        })
      }

      // 顯示相關外鍵
      const tableFKs = zeaburSchema.foreignKeys.filter((fk: ForeignKeyInfo) => fk.table_name === tableName)
      if (tableFKs.length > 0) {
        console.log(colors.blue(`  外鍵 (${tableFKs.length}):`))
        tableFKs.forEach((fk: ForeignKeyInfo) => {
          console.log(`  - ${fk.column_name} → ${fk.foreign_table_name}(${fk.foreign_column_name})`)
        })
      }
    })
  }

  // 分析資料量
  console.log(colors.bold('\n📊 資料量估算'))
  console.log(colors.cyan('='.repeat(60)))
  console.log(colors.yellow('\n需要手動查詢 Zeabur 資料量:'))
  zeaburTables.forEach(table => {
    console.log(`  SELECT '${table}' as table_name, COUNT(*) as count FROM ${table};`)
  })

  // 總結
  console.log(colors.bold('\n📋 遷移總結'))
  console.log(colors.cyan('='.repeat(60)))
  console.log(`${colors.green('✅')} Supabase 已有表: ${existingTables.length} 個`)
  console.log(`${colors.red('❌')} 需要建立的表: ${missingTables.length} 個`)
  console.log(`${colors.blue('📦')} 需要遷移索引: ${zeaburSchema.indexes.length} 個`)
  console.log(`${colors.blue('🔗')} 需要建立外鍵: ${zeaburSchema.foreignKeys.length} 個`)

  return {
    existing: existingTables,
    missing: missingTables,
    summary: {
      existingCount: existingTables.length,
      missingCount: missingTables.length,
      indexCount: zeaburSchema.indexes.length,
      foreignKeyCount: zeaburSchema.foreignKeys.length
    }
  }
}

async function main() {
  console.log(colors.bold('\n🔍 Zeabur → Supabase Schema 差異分析'))
  console.log(colors.cyan('='.repeat(60)))
  console.log(`執行時間: ${new Date().toLocaleString('zh-TW')}\n`)

  try {
    // 連接 Zeabur
    const pool = new Pool({
      connectionString: process.env.ZEABUR_POSTGRES_URL,
      ssl: false
    })

    // 分析兩邊的 schema
    const zeaburSchema = await analyzeZeaburSchema(pool)
    const supabaseSchema = await analyzeSupabaseSchema()

    // 比對差異
    const comparison = await compareSchemas(zeaburSchema, supabaseSchema)

    await pool.end()

    console.log(colors.bold('\n✅ 分析完成！'))
    console.log(colors.cyan('='.repeat(60)))
    console.log(colors.green('\n下一步:'))
    console.log('1. 執行 Schema 同步腳本建立缺少的表')
    console.log('2. 執行資料遷移腳本')
    console.log('3. 驗證遷移結果\n')

  } catch (error: any) {
    console.error(colors.red('\n❌ 分析失敗:'), error.message)
    process.exit(1)
  }
}

main()
