#!/usr/bin/env tsx
/**
 * 角色分配腳本
 *
 * 使用方式：
 *   pnpm tsx scripts/assign-role.ts <email> <role_name>
 *
 * 範例：
 *   pnpm tsx scripts/assign-role.ts acejou27@gmail.com super_admin
 *   pnpm tsx scripts/assign-role.ts user@example.com company_owner
 *
 * 可用角色：
 *   - super_admin    (總管理員)   - 最高權限，可設定成本和分配角色
 *   - company_owner  (公司負責人) - 公司級管理，可設定成本
 *   - sales_manager  (業務主管)   - 銷售團隊管理
 *   - salesperson    (業務人員)   - 基本銷售權限
 *   - accountant     (會計)       - 財務管理，可讀取成本
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 載入環境變數
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const VALID_ROLES = ['super_admin', 'company_owner', 'sales_manager', 'salesperson', 'accountant']

async function assignRole(email: string, roleName: string) {
  console.log('\n🔐 角色分配工具\n')
  console.log('='.repeat(50))

  // 驗證角色名稱
  if (!VALID_ROLES.includes(roleName)) {
    console.error(`❌ 無效的角色名稱: ${roleName}`)
    console.log(`   可用角色: ${VALID_ROLES.join(', ')}`)
    process.exit(1)
  }

  // 使用 Service Role Key（有完整權限）
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // 步驟 1: 查詢使用者
  console.log(`\n📧 查詢使用者: ${email}`)
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()

  if (userError) {
    console.error(`❌ 查詢使用者失敗: ${userError.message}`)
    process.exit(1)
  }

  const user = users.find(u => u.email === email)
  if (!user) {
    console.error(`❌ 找不到使用者: ${email}`)
    console.log('\n可用的使用者:')
    users.slice(0, 10).forEach(u => console.log(`   - ${u.email}`))
    process.exit(1)
  }

  console.log(`✅ 找到使用者`)
  console.log(`   ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   建立時間: ${user.created_at}`)

  // 步驟 2: 查詢角色
  console.log(`\n🎭 查詢角色: ${roleName}`)
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('*')
    .eq('name', roleName)
    .single()

  if (roleError || !role) {
    console.error(`❌ 找不到角色: ${roleName}`)
    console.log(`   錯誤: ${roleError?.message}`)
    process.exit(1)
  }

  console.log(`✅ 找到角色`)
  console.log(`   ID: ${role.id}`)
  console.log(`   名稱: ${role.name_zh} (${role.name})`)
  console.log(`   等級: ${role.level}`)

  // 步驟 3: 檢查現有角色
  console.log(`\n📋 檢查現有角色...`)
  const { data: existingRoles, error: existingError } = await supabase
    .from('user_roles')
    .select(`
      id,
      role_id,
      created_at,
      roles (
        name,
        name_zh,
        level
      )
    `)
    .eq('user_id', user.id)

  if (existingError) {
    console.log(`⚠️ 查詢現有角色失敗: ${existingError.message}`)
  } else if (existingRoles && existingRoles.length > 0) {
    console.log(`   現有角色:`)
    existingRoles.forEach((ur: { roles: { name_zh: string; name: string; level: number } | null }) => {
      if (ur.roles) {
        console.log(`   - ${ur.roles.name_zh} (${ur.roles.name}, 等級 ${ur.roles.level})`)
      }
    })

    // 檢查是否已有該角色
    const hasRole = existingRoles.some((ur: { role_id: string }) => ur.role_id === role.id)
    if (hasRole) {
      console.log(`\n✅ 使用者已經擁有 ${roleName} 角色，無需變更`)
      process.exit(0)
    }
  } else {
    console.log(`   無現有角色`)
  }

  // 步驟 4: 分配角色
  console.log(`\n🔄 分配角色: ${roleName}`)

  // 先刪除現有角色（如果有的話）
  if (existingRoles && existingRoles.length > 0) {
    console.log(`   移除現有角色...`)
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.log(`⚠️ 移除現有角色失敗: ${deleteError.message}`)
    }
  }

  // 插入新角色
  const { data: newUserRole, error: insertError } = await supabase
    .from('user_roles')
    .insert({
      user_id: user.id,
      role_id: role.id,
      assigned_by: user.id
    })
    .select()
    .single()

  if (insertError) {
    console.error(`❌ 分配角色失敗: ${insertError.message}`)
    process.exit(1)
  }

  console.log(`✅ 角色分配成功！`)
  console.log(`   記錄 ID: ${newUserRole.id}`)

  // 步驟 5: 驗證權限
  console.log(`\n📊 驗證權限...`)
  const { data: permissions, error: permError } = await supabase
    .from('role_permissions')
    .select(`
      permissions (
        name,
        resource,
        action
      )
    `)
    .eq('role_id', role.id)

  if (permError) {
    console.log(`⚠️ 查詢權限失敗: ${permError.message}`)
  } else if (permissions) {
    console.log(`   ${roleName} 角色擁有的權限:`)
    const permList = permissions.map((p: { permissions: { name: string } | null }) => p.permissions?.name).filter(Boolean)
    permList.forEach((p: string) => console.log(`   - ${p}`))

    // 檢查成本權限
    const hasCostRead = permList.includes('products:read_cost')
    const hasCostWrite = permList.includes('products:write_cost')
    console.log(`\n   成本權限:`)
    console.log(`   - 讀取成本: ${hasCostRead ? '✅' : '❌'}`)
    console.log(`   - 修改成本: ${hasCostWrite ? '✅' : '❌'}`)
  }

  console.log('\n' + '='.repeat(50))
  console.log(`🎉 完成！使用者 ${email} 現在是 ${role.name_zh}`)
  console.log('='.repeat(50) + '\n')
}

// 主程式
const args = process.argv.slice(2)

if (args.length === 0) {
  // 預設執行：將 acejou27@gmail.com 設為 super_admin
  assignRole('acejou27@gmail.com', 'super_admin').catch(console.error)
} else if (args.length === 2) {
  const [email, roleName] = args
  assignRole(email, roleName).catch(console.error)
} else {
  console.log('使用方式: pnpm tsx scripts/assign-role.ts <email> <role_name>')
  console.log('')
  console.log('可用角色:')
  console.log('  - super_admin    (總管理員)')
  console.log('  - company_owner  (公司負責人)')
  console.log('  - sales_manager  (業務主管)')
  console.log('  - salesperson    (業務人員)')
  console.log('  - accountant     (會計)')
  console.log('')
  console.log('範例:')
  console.log('  pnpm tsx scripts/assign-role.ts acejou27@gmail.com super_admin')
  process.exit(1)
}
