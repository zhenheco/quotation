#!/usr/bin/env tsx
/**
 * 權限檢查腳本
 *
 * 使用方式：
 *   pnpm tsx scripts/check-permissions.ts <email>
 *
 * 範例：
 *   pnpm tsx scripts/check-permissions.ts acejou27@gmail.com
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
  console.error('❌ 缺少環境變數')
  process.exit(1)
}

async function checkPermissions(email: string) {
  console.log('\n🔍 權限檢查工具\n')
  console.log('='.repeat(60))

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 查詢使用者
  console.log(`\n📧 使用者: ${email}`)
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const user = users.find(u => u.email === email)

  if (!user) {
    console.error(`❌ 找不到使用者: ${email}`)
    process.exit(1)
  }

  console.log(`   ID: ${user.id}`)

  // 查詢角色
  console.log(`\n🎭 角色:`)
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select(`
      roles (
        name,
        name_zh,
        level
      )
    `)
    .eq('user_id', user.id)

  if (!userRoles || userRoles.length === 0) {
    console.log(`   ⚠️ 無角色`)
  } else {
    userRoles.forEach((ur: { roles: { name_zh: string; name: string; level: number } | null }) => {
      if (ur.roles) {
        console.log(`   ✅ ${ur.roles.name_zh} (${ur.roles.name}, 等級 ${ur.roles.level})`)
      }
    })
  }

  // 查詢完整權限
  console.log(`\n🔑 權限清單:`)
  const { data: permissions } = await supabase
    .from('user_roles')
    .select(`
      roles (
        role_permissions (
          permissions (
            name,
            resource,
            action
          )
        )
      )
    `)
    .eq('user_id', user.id)

  const allPermissions = new Set<string>()
  const permissionsByResource: Record<string, string[]> = {}

  permissions?.forEach((ur: { roles: { role_permissions: { permissions: { name: string; resource: string; action: string } | null }[] } | null }) => {
    ur.roles?.role_permissions?.forEach(rp => {
      if (rp.permissions) {
        allPermissions.add(rp.permissions.name)
        const resource = rp.permissions.resource
        if (!permissionsByResource[resource]) {
          permissionsByResource[resource] = []
        }
        permissionsByResource[resource].push(rp.permissions.action)
      }
    })
  })

  // 按資源分組顯示
  Object.entries(permissionsByResource).sort().forEach(([resource, actions]) => {
    console.log(`\n   📁 ${resource}:`)
    actions.sort().forEach(action => {
      const icon = action.includes('cost') ? '💰' : '✓'
      console.log(`      ${icon} ${action}`)
    })
  })

  // 成本權限摘要
  console.log('\n' + '='.repeat(60))
  console.log('💰 成本權限摘要:')
  console.log(`   讀取成本 (read_cost):  ${allPermissions.has('products:read_cost') ? '✅ 有權限' : '❌ 無權限'}`)
  console.log(`   修改成本 (write_cost): ${allPermissions.has('products:write_cost') ? '✅ 有權限' : '❌ 無權限'}`)
  console.log('='.repeat(60) + '\n')
}

// 主程式
const email = process.argv[2] || 'acejou27@gmail.com'
checkPermissions(email).catch(console.error)
