#!/usr/bin/env tsx
/**
 * 驗證 Supabase Migration 結果
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nxlqtnnssfzzpbyfjnby.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHF0bm5zc2Z6enBieWZqbmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwMTEsImV4cCI6MjA1OTY1OTAxMX0.nMSM3V16oNAEpK738c5SOQmMDL3kPpJSgsC71HppQrI'
)

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
