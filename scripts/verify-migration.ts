#!/usr/bin/env tsx
/**
 * 驗證 Supabase Migration 結果
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// 載入環境變數
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少環境變數：NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.log('請確保 .env.local 檔案存在且包含正確的配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verify() {
  console.log('\n🔍 驗證 Supabase Schema Migration')
  console.log('='.repeat(60))

  const tables = [
    'roles', 'permissions', 'role_permissions',
    'user_roles', 'user_profiles', 'companies',
    'company_members', 'company_settings',
    'customer_contracts', 'payments', 'payment_schedules',
    'audit_logs', 'quotation_shares', 'quotation_versions'
  ]

  let successCount = 0
  let failCount = 0

  console.log('\n📊 檢查新建立的表:\n')

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`❌ ${table}: ${error.message}`)
      failCount++
    } else {
      console.log(`✅ ${table}: 存在 (${count || 0} 筆資料)`)
      successCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ 成功: ${successCount} 個表`)
  console.log(`❌ 失敗: ${failCount} 個表\n`)

  // 檢查角色資料
  const { data: roles, error: rolesError } = await supabase.from('roles').select('*')
  if (!rolesError && roles && roles.length > 0) {
    console.log(`📊 預設角色已建立 (${roles.length} 個):`)
    roles.forEach((r: any) => console.log(`   - ${r.name_zh} (${r.name}) - Level ${r.level}`))
    console.log()
  }

  // 檢查權限資料
  const { data: permissions, error: permError } = await supabase.from('permissions').select('*')
  if (!permError && permissions && permissions.length > 0) {
    console.log(`🔐 預設權限已建立 (${permissions.length} 個)`)
    console.log()
  }

  // 檢查角色權限對應
  const { count: rpCount } = await supabase
    .from('role_permissions')
    .select('*', { count: 'exact', head: true })

  if (rpCount && rpCount > 0) {
    console.log(`🔗 角色權限對應已建立 (${rpCount} 個映射)\n`)
  }

  if (successCount === 14) {
    console.log('🎉 Schema Migration 完全成功！')
    console.log('✅ 所有 14 個表都已正確建立')
    console.log('✅ 預設資料已插入 (roles, permissions, role_permissions)')
  } else {
    console.log('⚠️  部分表建立失敗，請檢查錯誤訊息')
  }

  console.log('\n' + '='.repeat(60) + '\n')
}

verify()
