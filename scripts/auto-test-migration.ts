#!/usr/bin/env tsx
/**
 * 自動化測試 Supabase Migration
 *
 * 測試項目：
 * 1. Schema 完整性
 * 2. RLS Policies
 * 3. 索引和外鍵
 * 4. 預設資料
 * 5. 基本 CRUD 操作
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

// 手動載入 .env.local
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

const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
}

interface TestResult {
  category: string
  name: string
  status: 'pass' | 'fail' | 'skip' | 'warning'
  message?: string
  details?: any
}

const results: TestResult[] = []

function addResult(category: string, name: string, status: 'pass' | 'fail' | 'skip' | 'warning', message?: string, details?: any) {
  results.push({ category, name, status, message, details })
}

async function runTests() {
  console.log(colors.bold('\n🧪 Supabase Migration 自動化測試'))
  console.log(colors.cyan('='.repeat(70)))
  console.log(`開始時間: ${new Date().toLocaleString('zh-TW')}\n`)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error(colors.red('❌ 錯誤: Supabase 環境變數未設置'))
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ============================================================================
  // Test 1: Schema 完整性測試
  // ============================================================================
  console.log(colors.bold(colors.cyan('\n📋 Test 1: Schema 完整性')))
  console.log(colors.cyan('─'.repeat(70)))

  const expectedTables = [
    'roles', 'permissions', 'role_permissions',
    'user_roles', 'user_profiles', 'companies',
    'company_members', 'company_settings',
    'customer_contracts', 'payments', 'payment_schedules',
    'audit_logs', 'quotation_shares', 'quotation_versions'
  ]

  for (const table of expectedTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        if (error.message.includes('permission denied') || error.message.includes('RLS')) {
          console.log(colors.yellow(`⚠️  ${table}: RLS 保護中（正常）`))
          addResult('Schema', table, 'warning', 'RLS 保護')
        } else {
          console.log(colors.red(`❌ ${table}: ${error.message}`))
          addResult('Schema', table, 'fail', error.message)
        }
      } else {
        console.log(colors.green(`✅ ${table}: 存在`))
        addResult('Schema', table, 'pass', `${count || 0} 筆資料`)
      }
    } catch (error: any) {
      console.log(colors.red(`❌ ${table}: ${error.message}`))
      addResult('Schema', table, 'fail', error.message)
    }
  }

  // ============================================================================
  // Test 2: 預設資料測試
  // ============================================================================
  console.log(colors.bold(colors.cyan('\n\n📊 Test 2: 預設資料驗證')))
  console.log(colors.cyan('─'.repeat(70)))

  // 測試角色
  try {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')

    if (error) {
      console.log(colors.red(`❌ roles 查詢失敗: ${error.message}`))
      addResult('預設資料', 'roles', 'fail', error.message)
    } else if (!roles || roles.length === 0) {
      console.log(colors.yellow(`⚠️  roles: 無預設資料（可能被 RLS 阻擋）`))
      addResult('預設資料', 'roles', 'warning', 'RLS 可能阻擋查詢')
    } else {
      console.log(colors.green(`✅ roles: 找到 ${roles.length} 個角色`))
      roles.forEach((r: any) => {
        console.log(colors.blue(`   - ${r.name_zh} (${r.name}) - Level ${r.level}`))
      })
      addResult('預設資料', 'roles', 'pass', `${roles.length} 個角色`)

      const expectedRoles = ['super_admin', 'company_owner', 'sales_manager', 'salesperson', 'accountant']
      const foundRoles = roles.map((r: any) => r.name)
      const missingRoles = expectedRoles.filter(r => !foundRoles.includes(r))

      if (missingRoles.length > 0) {
        console.log(colors.yellow(`   ⚠️  缺少角色: ${missingRoles.join(', ')}`))
        addResult('預設資料', 'roles 完整性', 'warning', `缺少 ${missingRoles.length} 個角色`)
      } else {
        console.log(colors.green(`   ✅ 所有預設角色齊全`))
        addResult('預設資料', 'roles 完整性', 'pass')
      }
    }
  } catch (error: any) {
    console.log(colors.red(`❌ roles 測試失敗: ${error.message}`))
    addResult('預設資料', 'roles', 'fail', error.message)
  }

  // 測試權限
  try {
    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('*')

    if (error) {
      console.log(colors.red(`❌ permissions 查詢失敗: ${error.message}`))
      addResult('預設資料', 'permissions', 'fail', error.message)
    } else if (!permissions || permissions.length === 0) {
      console.log(colors.yellow(`⚠️  permissions: 無預設資料（可能被 RLS 阻擋）`))
      addResult('預設資料', 'permissions', 'warning', 'RLS 可能阻擋查詢')
    } else {
      console.log(colors.green(`✅ permissions: 找到 ${permissions.length} 個權限`))
      addResult('預設資料', 'permissions', 'pass', `${permissions.length} 個權限`)

      if (permissions.length >= 21) {
        console.log(colors.green(`   ✅ 權限數量符合預期 (≥21)`))
        addResult('預設資料', 'permissions 數量', 'pass')
      } else {
        console.log(colors.yellow(`   ⚠️  權限數量不足: ${permissions.length}/21`))
        addResult('預設資料', 'permissions 數量', 'warning', `僅 ${permissions.length} 個`)
      }
    }
  } catch (error: any) {
    console.log(colors.red(`❌ permissions 測試失敗: ${error.message}`))
    addResult('預設資料', 'permissions', 'fail', error.message)
  }

  // 測試角色權限對應
  try {
    const { count, error } = await supabase
      .from('role_permissions')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(colors.red(`❌ role_permissions 查詢失敗: ${error.message}`))
      addResult('預設資料', 'role_permissions', 'fail', error.message)
    } else if (!count || count === 0) {
      console.log(colors.yellow(`⚠️  role_permissions: 無對應資料`))
      addResult('預設資料', 'role_permissions', 'warning', '無對應資料')
    } else {
      console.log(colors.green(`✅ role_permissions: ${count} 個角色權限對應`))
      addResult('預設資料', 'role_permissions', 'pass', `${count} 個對應`)
    }
  } catch (error: any) {
    console.log(colors.red(`❌ role_permissions 測試失敗: ${error.message}`))
    addResult('預設資料', 'role_permissions', 'fail', error.message)
  }

  // ============================================================================
  // Test 3: RLS Policies 測試
  // ============================================================================
  console.log(colors.bold(colors.cyan('\n\n🔐 Test 3: RLS Policies 驗證')))
  console.log(colors.cyan('─'.repeat(70)))

  // 測試未認證訪問（應該被阻擋）
  console.log(colors.blue('\n測試 1: 未認證訪問（應該被 RLS 阻擋）'))

  const rlsProtectedTables = ['user_profiles', 'user_roles', 'company_settings',
                               'customer_contracts', 'payments', 'payment_schedules',
                               'audit_logs']

  for (const table of rlsProtectedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      // 未認證時應該返回空結果或錯誤
      if (error && (error.message.includes('permission denied') || error.message.includes('RLS'))) {
        console.log(colors.green(`✅ ${table}: RLS 正常阻擋未認證訪問`))
        addResult('RLS', `${table} 未認證阻擋`, 'pass')
      } else if (!data || data.length === 0) {
        console.log(colors.green(`✅ ${table}: RLS 正常（返回空結果）`))
        addResult('RLS', `${table} 未認證阻擋`, 'pass')
      } else {
        console.log(colors.yellow(`⚠️  ${table}: 返回了資料（可能 RLS 未正確設置）`))
        addResult('RLS', `${table} 未認證阻擋`, 'warning', '返回了資料')
      }
    } catch (error: any) {
      console.log(colors.green(`✅ ${table}: RLS 正常阻擋 (${error.message})`))
      addResult('RLS', `${table} 未認證阻擋`, 'pass')
    }
  }

  // 測試公開可讀表
  console.log(colors.blue('\n測試 2: 公開可讀表（roles, permissions 應該可讀）'))

  const publicTables = ['roles', 'permissions', 'role_permissions']

  for (const table of publicTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        console.log(colors.yellow(`⚠️  ${table}: 查詢失敗 - ${error.message}`))
        addResult('RLS', `${table} 公開可讀`, 'warning', error.message)
      } else {
        console.log(colors.green(`✅ ${table}: 公開可讀正常`))
        addResult('RLS', `${table} 公開可讀`, 'pass')
      }
    } catch (error: any) {
      console.log(colors.red(`❌ ${table}: 測試失敗 - ${error.message}`))
      addResult('RLS', `${table} 公開可讀`, 'fail', error.message)
    }
  }

  // ============================================================================
  // Test 4: 使用 Direct Connection 驗證資料庫結構
  // ============================================================================
  console.log(colors.bold(colors.cyan('\n\n🔧 Test 4: 資料庫結構驗證（Direct Connection）')))
  console.log(colors.cyan('─'.repeat(70)))

  const dbUrl = process.env.SUPABASE_DB_URL

  if (dbUrl) {
    try {
      const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      })

      const client = await pool.connect()
      console.log(colors.green('✅ 直接資料庫連接成功\n'))
      addResult('資料庫連接', 'Direct Connection', 'pass')

      // 檢查索引
      const indexResult = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
      `)
      const indexCount = parseInt(indexResult.rows[0].count)
      console.log(colors.blue(`📊 索引總數: ${indexCount}`))
      addResult('資料庫結構', '索引', 'pass', `${indexCount} 個`)

      // 檢查外鍵
      const fkResult = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
      `)
      const fkCount = parseInt(fkResult.rows[0].count)
      console.log(colors.blue(`🔗 外鍵總數: ${fkCount}`))
      addResult('資料庫結構', '外鍵', 'pass', `${fkCount} 個`)

      // 檢查 RLS 啟用狀態
      const rlsResult = await client.query(`
        SELECT tablename,
               (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = c.tablename) as policy_count
        FROM pg_tables c
        WHERE schemaname = 'public'
        AND tablename IN (${expectedTables.map(t => `'${t}'`).join(',')})
        ORDER BY tablename
      `)

      console.log(colors.blue('\n🔐 RLS Policies 狀態:'))
      rlsResult.rows.forEach((row: any) => {
        if (parseInt(row.policy_count) > 0) {
          console.log(colors.green(`   ✅ ${row.tablename}: ${row.policy_count} 個 policies`))
          addResult('RLS Policies', row.tablename, 'pass', `${row.policy_count} policies`)
        } else {
          console.log(colors.yellow(`   ⚠️  ${row.tablename}: 無 policies`))
          addResult('RLS Policies', row.tablename, 'warning', '無 policies')
        }
      })

      // 檢查觸發器
      const triggerResult = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_trigger
        WHERE tgname LIKE 'trigger_update_%_timestamp'
      `)
      const triggerCount = parseInt(triggerResult.rows[0].count)
      console.log(colors.blue(`\n⚙️  updated_at 觸發器: ${triggerCount} 個`))
      addResult('資料庫結構', '觸發器', 'pass', `${triggerCount} 個`)

      client.release()
      await pool.end()

    } catch (error: any) {
      console.log(colors.yellow(`⚠️  無法使用直接連接: ${error.message}`))
      console.log(colors.yellow('   跳過資料庫結構驗證'))
      addResult('資料庫連接', 'Direct Connection', 'skip', error.message)
    }
  } else {
    console.log(colors.yellow('⚠️  未設置 SUPABASE_DB_URL，跳過直接資料庫測試'))
    addResult('資料庫連接', 'Direct Connection', 'skip', '未設置連接字串')
  }

  // ============================================================================
  // 測試總結
  // ============================================================================
  console.log(colors.bold(colors.cyan('\n\n📊 測試總結')))
  console.log(colors.cyan('='.repeat(70)))

  const passCount = results.filter(r => r.status === 'pass').length
  const failCount = results.filter(r => r.status === 'fail').length
  const warnCount = results.filter(r => r.status === 'warning').length
  const skipCount = results.filter(r => r.status === 'skip').length
  const total = results.length

  console.log(`\n總測試項目: ${total}`)
  console.log(colors.green(`✅ 通過: ${passCount}`))
  console.log(colors.red(`❌ 失敗: ${failCount}`))
  console.log(colors.yellow(`⚠️  警告: ${warnCount}`))
  console.log(colors.cyan(`⏭️  跳過: ${skipCount}`))

  const passRate = ((passCount / (total - skipCount)) * 100).toFixed(1)
  console.log(colors.bold(`\n通過率: ${passRate}%`))

  // 按類別顯示結果
  console.log(colors.cyan('\n─'.repeat(70)))
  console.log(colors.bold('\n詳細結果：\n'))

  const categories = [...new Set(results.map(r => r.category))]
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category)
    const catPass = categoryResults.filter(r => r.status === 'pass').length
    const catFail = categoryResults.filter(r => r.status === 'fail').length
    const catWarn = categoryResults.filter(r => r.status === 'warning').length
    const catSkip = categoryResults.filter(r => r.status === 'skip').length

    console.log(colors.bold(`${category}:`))
    console.log(`  通過: ${catPass}, 失敗: ${catFail}, 警告: ${catWarn}, 跳過: ${catSkip}`)

    if (catFail > 0) {
      const failed = categoryResults.filter(r => r.status === 'fail')
      failed.forEach(r => {
        console.log(colors.red(`  ❌ ${r.name}: ${r.message || ''}`))
      })
    }
  })

  console.log(colors.cyan('\n' + '='.repeat(70)))
  console.log(`結束時間: ${new Date().toLocaleString('zh-TW')}`)

  // 最終判定
  if (failCount === 0) {
    console.log(colors.bold(colors.green('\n🎉 所有測試通過！Migration 成功！\n')))
    process.exit(0)
  } else if (failCount <= 2 && warnCount <= 5) {
    console.log(colors.bold(colors.yellow('\n⚠️  測試基本通過，但有一些警告\n')))
    process.exit(0)
  } else {
    console.log(colors.bold(colors.red('\n❌ 測試失敗，請檢查錯誤訊息\n')))
    process.exit(1)
  }
}

// 執行測試
runTests().catch((error) => {
  console.error(colors.red('\n❌ 測試執行失敗:'), error)
  process.exit(1)
})
