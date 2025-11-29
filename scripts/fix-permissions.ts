#!/usr/bin/env tsx
/**
 * 修復權限腳本 - 確保 super_admin 和 company_owner 擁有 write_cost 權限
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('\n🔧 修復權限設定\n')
  console.log('='.repeat(60))

  // 1. 查看 super_admin 和 company_owner 角色
  console.log('\n🔍 查詢角色...')
  const { data: roles } = await supabase
    .from('roles')
    .select('id, name, name_zh')
    .in('name', ['super_admin', 'company_owner'])

  roles?.forEach(r => console.log(`   ${r.name_zh} (${r.name}): ${r.id}`))

  // 2. 查看所有權限
  console.log('\n🔍 查詢 products 相關權限...')
  const { data: productPerms } = await supabase
    .from('permissions')
    .select('*')
    .eq('resource', 'products')

  console.log('   現有權限:')
  productPerms?.forEach(p => console.log(`   - ${p.name} (${p.id})`))

  // 找出 products:write_cost
  let writeCostPerm = productPerms?.find(p => p.name === 'products:write_cost')

  // 3. 如果 write_cost 權限不存在，建立它
  if (!writeCostPerm) {
    console.log('\n⚠️ products:write_cost 權限不存在，建立中...')
    const { data: newPerm, error: createError } = await supabase
      .from('permissions')
      .insert({
        name: 'products:write_cost',
        resource: 'products',
        action: 'write_cost',
        description: '修改產品成本'
      })
      .select()
      .single()

    if (createError) {
      console.log(`   ❌ 建立失敗: ${createError.message}`)
      return
    }
    console.log(`   ✅ 建立成功: ${newPerm?.id}`)
    writeCostPerm = newPerm
  }

  // 4. 為 super_admin 和 company_owner 分配 write_cost 權限
  console.log('\n🔄 分配權限...')

  for (const role of roles || []) {
    // 檢查是否已有此權限
    const { data: existing } = await supabase
      .from('role_permissions')
      .select('id')
      .eq('role_id', role.id)
      .eq('permission_id', writeCostPerm?.id)
      .single()

    if (existing) {
      console.log(`   ✅ ${role.name_zh} 已有 write_cost 權限`)
    } else {
      const { error: assignError } = await supabase
        .from('role_permissions')
        .insert({
          role_id: role.id,
          permission_id: writeCostPerm?.id
        })

      if (assignError) {
        console.log(`   ❌ ${role.name_zh} 分配失敗: ${assignError.message}`)
      } else {
        console.log(`   ✅ ${role.name_zh} 已分配 write_cost 權限`)
      }
    }
  }

  // 5. 驗證
  console.log('\n📊 驗證結果...')
  for (const role of roles || []) {
    const { data: perms } = await supabase
      .from('role_permissions')
      .select('permissions(name)')
      .eq('role_id', role.id)

    const permNames = perms?.map((p: { permissions: { name: string } | null }) => p.permissions?.name).filter(Boolean)
    const hasWriteCost = permNames?.includes('products:write_cost')
    const hasReadCost = permNames?.includes('products:read_cost')

    console.log(`\n   ${role.name_zh}:`)
    console.log(`   - read_cost:  ${hasReadCost ? '✅' : '❌'}`)
    console.log(`   - write_cost: ${hasWriteCost ? '✅' : '❌'}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 修復完成！請重新整理頁面測試。')
  console.log('='.repeat(60) + '\n')
}

main().catch(console.error)
