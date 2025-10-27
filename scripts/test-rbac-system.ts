#!/usr/bin/env tsx
/**
 * RBAC 權限系統完整測試
 *
 * 測試項目：
 * 1. Roles (角色) CRUD
 * 2. Permissions (權限) CRUD
 * 3. Role-Permission (角色權限關聯) 管理
 * 4. User Profiles (使用者資料) CRUD
 * 5. User Roles (使用者角色) 分配
 * 6. 權限檢查邏輯
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
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  details?: any
}

const results: TestResult[] = []

// 儲存建立的資料 ID，用於清理
const createdIds = {
  roles: [] as string[],
  permissions: [] as string[],
  rolePermissions: [] as string[],
  userProfiles: [] as string[],
  userRoles: [] as string[]
}

async function testRbacSystem() {
  console.log('🔐 開始測試 RBAC 權限系統\n')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 登入測試使用者
  console.log('📋 步驟 0: 登入測試帳號')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'TestPassword123!'
  })

  if (signInError || !signInData.user) {
    console.log(`❌ 登入失敗: ${signInError?.message}\n`)
    return
  }

  console.log(`✅ 登入成功 (User ID: ${signInData.user.id})\n`)
  const userId = signInData.user.id

  // ========================================
  // 測試 1: Roles CRUD
  // ========================================
  console.log('='.repeat(60))
  console.log('👥 測試 Roles (角色) CRUD 操作')
  console.log('='.repeat(60) + '\n')

  // 1.1 建立角色
  console.log('📋 測試 1.1: 建立角色 (CREATE)')
  const timestamp = Date.now()
  const roleData = {
    name: `sales_manager_${timestamp}`,
    name_zh: '銷售經理',
    name_en: 'Sales Manager',
    level: 30,
    description: '負責銷售團隊管理和業績追蹤'
  }

  const { data: createdRole, error: createRoleError } = await supabase
    .from('roles')
    .insert(roleData)
    .select()
    .single()

  if (createRoleError) {
    results.push({
      name: '建立角色',
      status: 'FAIL',
      message: '建立失敗',
      details: createRoleError
    })
    console.log(`❌ 建立失敗: ${createRoleError.message}\n`)
  } else {
    createdIds.roles.push(createdRole.id)
    results.push({
      name: '建立角色',
      status: 'PASS',
      message: '建立成功',
      details: { id: createdRole.id, name: createdRole.name }
    })
    console.log(`✅ 建立成功`)
    console.log(`   ID: ${createdRole.id}`)
    console.log(`   名稱: ${createdRole.name_zh} (${createdRole.name})`)
    console.log(`   等級: ${createdRole.level}\n`)
  }

  // 1.2 讀取角色
  if (createdIds.roles.length > 0) {
    console.log('📋 測試 1.2: 讀取角色 (READ)')
    const { data: readRole, error: readRoleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', createdIds.roles[0])
      .single()

    if (readRoleError) {
      results.push({
        name: '讀取角色',
        status: 'FAIL',
        message: '讀取失敗',
        details: readRoleError
      })
      console.log(`❌ 讀取失敗: ${readRoleError.message}\n`)
    } else {
      results.push({
        name: '讀取角色',
        status: 'PASS',
        message: '讀取成功',
        details: { id: readRole.id, name: readRole.name }
      })
      console.log(`✅ 讀取成功`)
      console.log(`   名稱: ${readRole.name_zh}`)
      console.log(`   等級: ${readRole.level}\n`)
    }
  }

  // 1.3 更新角色
  if (createdIds.roles.length > 0) {
    console.log('📋 測試 1.3: 更新角色 (UPDATE)')
    const { data: updatedRole, error: updateRoleError } = await supabase
      .from('roles')
      .update({
        description: '負責銷售團隊管理、業績追蹤和客戶關係維護（已更新）',
        level: 35
      })
      .eq('id', createdIds.roles[0])
      .select()
      .single()

    if (updateRoleError) {
      results.push({
        name: '更新角色',
        status: 'FAIL',
        message: '更新失敗',
        details: updateRoleError
      })
      console.log(`❌ 更新失敗: ${updateRoleError.message}\n`)
    } else {
      results.push({
        name: '更新角色',
        status: 'PASS',
        message: '更新成功',
        details: { id: updatedRole.id, level: updatedRole.level }
      })
      console.log(`✅ 更新成功`)
      console.log(`   新等級: ${updatedRole.level}`)
      console.log(`   新描述: ${updatedRole.description}\n`)
    }
  }

  // ========================================
  // 測試 2: Permissions CRUD
  // ========================================
  console.log('='.repeat(60))
  console.log('🔑 測試 Permissions (權限) CRUD 操作')
  console.log('='.repeat(60) + '\n')

  // 2.1 建立權限
  console.log('📋 測試 2.1: 建立權限 (CREATE)')
  const permissionData = {
    name: `quotation.create_${timestamp}`,
    name_zh: '建立報價單',
    name_en: 'Create Quotation',
    category: 'quotation',
    description: '允許建立新的報價單'
  }

  const { data: createdPermission, error: createPermError } = await supabase
    .from('permissions')
    .insert(permissionData)
    .select()
    .single()

  if (createPermError) {
    results.push({
      name: '建立權限',
      status: 'FAIL',
      message: '建立失敗',
      details: createPermError
    })
    console.log(`❌ 建立失敗: ${createPermError.message}\n`)
  } else {
    createdIds.permissions.push(createdPermission.id)
    results.push({
      name: '建立權限',
      status: 'PASS',
      message: '建立成功',
      details: { id: createdPermission.id, name: createdPermission.name }
    })
    console.log(`✅ 建立成功`)
    console.log(`   ID: ${createdPermission.id}`)
    console.log(`   名稱: ${createdPermission.name_zh} (${createdPermission.name})`)
    console.log(`   分類: ${createdPermission.category}\n`)
  }

  // 2.2 讀取權限
  if (createdIds.permissions.length > 0) {
    console.log('📋 測試 2.2: 讀取權限 (READ)')
    const { data: readPermission, error: readPermError } = await supabase
      .from('permissions')
      .select('*')
      .eq('id', createdIds.permissions[0])
      .single()

    if (readPermError) {
      results.push({
        name: '讀取權限',
        status: 'FAIL',
        message: '讀取失敗',
        details: readPermError
      })
      console.log(`❌ 讀取失敗: ${readPermError.message}\n`)
    } else {
      results.push({
        name: '讀取權限',
        status: 'PASS',
        message: '讀取成功',
        details: { id: readPermission.id, name: readPermission.name }
      })
      console.log(`✅ 讀取成功`)
      console.log(`   名稱: ${readPermission.name_zh}`)
      console.log(`   分類: ${readPermission.category}\n`)
    }
  }

  // ========================================
  // 測試 3: Role-Permission 關聯
  // ========================================
  console.log('='.repeat(60))
  console.log('🔗 測試 Role-Permission (角色權限關聯) 管理')
  console.log('='.repeat(60) + '\n')

  // 3.1 分配權限給角色
  if (createdIds.roles.length > 0 && createdIds.permissions.length > 0) {
    console.log('📋 測試 3.1: 分配權限給角色')
    const { data: rolePermission, error: assignPermError } = await supabase
      .from('role_permissions')
      .insert({
        role_id: createdIds.roles[0],
        permission_id: createdIds.permissions[0]
      })
      .select()
      .single()

    if (assignPermError) {
      results.push({
        name: '分配權限給角色',
        status: 'FAIL',
        message: '分配失敗',
        details: assignPermError
      })
      console.log(`❌ 分配失敗: ${assignPermError.message}\n`)
    } else {
      createdIds.rolePermissions.push(rolePermission.id)
      results.push({
        name: '分配權限給角色',
        status: 'PASS',
        message: '分配成功',
        details: { id: rolePermission.id }
      })
      console.log(`✅ 分配成功`)
      console.log(`   關聯 ID: ${rolePermission.id}\n`)
    }
  }

  // 3.2 查詢角色的所有權限
  if (createdIds.roles.length > 0) {
    console.log('📋 測試 3.2: 查詢角色的所有權限')
    const { data: rolePermissions, error: queryPermError } = await supabase
      .from('role_permissions')
      .select(`
        id,
        role_id,
        permission_id,
        permissions (
          name,
          name_zh,
          category
        )
      `)
      .eq('role_id', createdIds.roles[0])

    if (queryPermError) {
      results.push({
        name: '查詢角色權限',
        status: 'FAIL',
        message: '查詢失敗',
        details: queryPermError
      })
      console.log(`❌ 查詢失敗: ${queryPermError.message}\n`)
    } else {
      results.push({
        name: '查詢角色權限',
        status: 'PASS',
        message: '查詢成功',
        details: { count: rolePermissions?.length }
      })
      console.log(`✅ 查詢成功`)
      console.log(`   找到 ${rolePermissions?.length} 個權限`)
      rolePermissions?.forEach((rp: any) => {
        console.log(`   - ${rp.permissions?.name_zh} (${rp.permissions?.name})`)
      })
      console.log()
    }
  }

  // ========================================
  // 測試 4: User Profiles CRUD
  // ========================================
  console.log('='.repeat(60))
  console.log('👤 測試 User Profiles (使用者資料) CRUD 操作')
  console.log('='.repeat(60) + '\n')

  // 4.1 建立使用者資料
  console.log('📋 測試 4.1: 建立使用者資料 (CREATE)')
  const userProfileData = {
    user_id: userId,
    full_name: '測試使用者',
    display_name: '測試君',
    phone: '+886-912-345-678',
    department: '銷售部',
    is_active: true
  }

  const { data: createdProfile, error: createProfileError } = await supabase
    .from('user_profiles')
    .insert(userProfileData)
    .select()
    .single()

  if (createProfileError) {
    results.push({
      name: '建立使用者資料',
      status: 'FAIL',
      message: '建立失敗',
      details: createProfileError
    })
    console.log(`❌ 建立失敗: ${createProfileError.message}\n`)
  } else {
    createdIds.userProfiles.push(createdProfile.id)
    results.push({
      name: '建立使用者資料',
      status: 'PASS',
      message: '建立成功',
      details: { id: createdProfile.id, name: createdProfile.full_name }
    })
    console.log(`✅ 建立成功`)
    console.log(`   ID: ${createdProfile.id}`)
    console.log(`   姓名: ${createdProfile.full_name}`)
    console.log(`   部門: ${createdProfile.department}\n`)
  }

  // 4.2 讀取使用者資料
  if (createdIds.userProfiles.length > 0) {
    console.log('📋 測試 4.2: 讀取使用者資料 (READ)')
    const { data: readProfile, error: readProfileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (readProfileError) {
      results.push({
        name: '讀取使用者資料',
        status: 'FAIL',
        message: '讀取失敗',
        details: readProfileError
      })
      console.log(`❌ 讀取失敗: ${readProfileError.message}\n`)
    } else {
      results.push({
        name: '讀取使用者資料',
        status: 'PASS',
        message: '讀取成功',
        details: { name: readProfile.full_name }
      })
      console.log(`✅ 讀取成功`)
      console.log(`   姓名: ${readProfile.full_name}`)
      console.log(`   電話: ${readProfile.phone}\n`)
    }
  }

  // ========================================
  // 測試 5: User Roles 分配
  // ========================================
  console.log('='.repeat(60))
  console.log('🎭 測試 User Roles (使用者角色) 分配')
  console.log('='.repeat(60) + '\n')

  // 5.1 分配角色給使用者
  if (createdIds.roles.length > 0) {
    console.log('📋 測試 5.1: 分配角色給使用者')
    const { data: userRole, error: assignRoleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: createdIds.roles[0],
        assigned_by: userId,
        is_active: true
      })
      .select()
      .single()

    if (assignRoleError) {
      results.push({
        name: '分配角色給使用者',
        status: 'FAIL',
        message: '分配失敗',
        details: assignRoleError
      })
      console.log(`❌ 分配失敗: ${assignRoleError.message}\n`)
    } else {
      createdIds.userRoles.push(userRole.id)
      results.push({
        name: '分配角色給使用者',
        status: 'PASS',
        message: '分配成功',
        details: { id: userRole.id }
      })
      console.log(`✅ 分配成功`)
      console.log(`   關聯 ID: ${userRole.id}`)
      console.log(`   是否啟用: ${userRole.is_active}\n`)
    }
  }

  // 5.2 查詢使用者的所有角色
  console.log('📋 測試 5.2: 查詢使用者的所有角色')
  const { data: userRoles, error: queryRolesError } = await supabase
    .from('user_roles')
    .select(`
      id,
      is_active,
      roles (
        name,
        name_zh,
        level
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (queryRolesError) {
    results.push({
      name: '查詢使用者角色',
      status: 'FAIL',
      message: '查詢失敗',
      details: queryRolesError
    })
    console.log(`❌ 查詢失敗: ${queryRolesError.message}\n`)
  } else {
    results.push({
      name: '查詢使用者角色',
      status: 'PASS',
      message: '查詢成功',
      details: { count: userRoles?.length }
    })
    console.log(`✅ 查詢成功`)
    console.log(`   找到 ${userRoles?.length} 個角色`)
    userRoles?.forEach((ur: any) => {
      console.log(`   - ${ur.roles?.name_zh} (等級: ${ur.roles?.level})`)
    })
    console.log()
  }

  // 5.3 查詢使用者的所有權限（通過角色）
  console.log('📋 測試 5.3: 查詢使用者的所有權限（通過角色）')
  const { data: userPermissions, error: queryUserPermsError } = await supabase
    .from('user_roles')
    .select(`
      roles (
        name,
        role_permissions (
          permissions (
            name,
            name_zh,
            category
          )
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (queryUserPermsError) {
    results.push({
      name: '查詢使用者權限',
      status: 'FAIL',
      message: '查詢失敗',
      details: queryUserPermsError
    })
    console.log(`❌ 查詢失敗: ${queryUserPermsError.message}\n`)
  } else {
    // 收集所有權限
    const allPermissions = new Set<string>()
    userPermissions?.forEach((ur: any) => {
      ur.roles?.role_permissions?.forEach((rp: any) => {
        allPermissions.add(rp.permissions?.name_zh)
      })
    })

    results.push({
      name: '查詢使用者權限',
      status: 'PASS',
      message: '查詢成功',
      details: { count: allPermissions.size }
    })
    console.log(`✅ 查詢成功`)
    console.log(`   使用者擁有 ${allPermissions.size} 個權限`)
    allPermissions.forEach(perm => {
      console.log(`   - ${perm}`)
    })
    console.log()
  }

  // ========================================
  // 清理測試資料
  // ========================================
  console.log('='.repeat(60))
  console.log('🗑️  清理測試資料')
  console.log('='.repeat(60) + '\n')

  // 刪除順序很重要（避免外鍵約束錯誤）
  // 1. user_roles (依賴 users 和 roles)
  if (createdIds.userRoles.length > 0) {
    console.log('清理 user_roles...')
    for (const id of createdIds.userRoles) {
      await supabase.from('user_roles').delete().eq('id', id)
    }
    console.log('✅ user_roles 已清理')
  }

  // 2. user_profiles (依賴 users)
  if (createdIds.userProfiles.length > 0) {
    console.log('清理 user_profiles...')
    for (const id of createdIds.userProfiles) {
      await supabase.from('user_profiles').delete().eq('id', id)
    }
    console.log('✅ user_profiles 已清理')
  }

  // 3. role_permissions (依賴 roles 和 permissions)
  if (createdIds.rolePermissions.length > 0) {
    console.log('清理 role_permissions...')
    for (const id of createdIds.rolePermissions) {
      await supabase.from('role_permissions').delete().eq('id', id)
    }
    console.log('✅ role_permissions 已清理')
  }

  // 4. permissions
  if (createdIds.permissions.length > 0) {
    console.log('清理 permissions...')
    for (const id of createdIds.permissions) {
      await supabase.from('permissions').delete().eq('id', id)
    }
    console.log('✅ permissions 已清理')
  }

  // 5. roles
  if (createdIds.roles.length > 0) {
    console.log('清理 roles...')
    for (const id of createdIds.roles) {
      await supabase.from('roles').delete().eq('id', id)
    }
    console.log('✅ roles 已清理')
  }

  console.log()

  // ========================================
  // 測試結果摘要
  // ========================================
  console.log('='.repeat(60))
  console.log('📊 RBAC 測試結果摘要')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length

  console.log(`\n總測試數: ${results.length}`)
  console.log(`✅ 通過: ${passed}`)
  console.log(`❌ 失敗: ${failed}`)
  console.log(`\n成功率: ${((passed / results.length) * 100).toFixed(1)}%\n`)

  // 分組顯示結果
  console.log('='.repeat(60))
  console.log('📝 詳細結果')
  console.log('='.repeat(60))

  const categories = {
    '角色管理': ['建立角色', '讀取角色', '更新角色'],
    '權限管理': ['建立權限', '讀取權限'],
    '角色權限關聯': ['分配權限給角色', '查詢角色權限'],
    '使用者資料': ['建立使用者資料', '讀取使用者資料'],
    '使用者角色': ['分配角色給使用者', '查詢使用者角色', '查詢使用者權限']
  }

  Object.entries(categories).forEach(([category, testNames]) => {
    console.log(`\n${category}:`)
    testNames.forEach(name => {
      const result = results.find(r => r.name === name)
      if (result) {
        const icon = result.status === 'PASS' ? '✅' : '❌'
        console.log(`  ${icon} ${result.name} - ${result.message}`)
      }
    })
  })

  // 最終判斷
  console.log('\n' + '='.repeat(60))
  if (failed === 0) {
    console.log('🎉 所有 RBAC 測試通過！權限系統功能正常！')
  } else {
    console.log('⚠️  部分測試失敗，請檢查錯誤訊息')
  }
  console.log('='.repeat(60) + '\n')

  // 登出
  await supabase.auth.signOut()
  console.log('✅ 已登出測試帳號\n')
}

// 執行測試
testRbacSystem().catch(console.error)
