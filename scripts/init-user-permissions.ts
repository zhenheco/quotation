/**
 * 臨時腳本：為現有用戶初始化權限
 * 使用方式：npx tsx scripts/init-user-permissions.ts <user_id>
 */

import { getD1Client } from '../lib/db/d1-client'
import { assignRoleToUser, getRoleByName } from '../lib/dal/rbac'

async function initUserPermissions(userId: string) {
  // @ts-expect-error - 開發環境使用 mock env
  const db = getD1Client({ DB: globalThis.__DB__ })
  
  // 獲取 admin 角色
  const adminRole = await getRoleByName(db, 'admin')
  
  if (!adminRole) {
    console.error('❌ Admin role not found!')
    console.log('Please run database migrations first.')
    return
  }
  
  console.log(`✅ Found admin role: ${adminRole.id}`)
  
  // 分配角色給用戶
  await assignRoleToUser(db, userId, adminRole.id)
  
  console.log(`✅ Assigned admin role to user: ${userId}`)
  console.log('\n🎉 User permissions initialized successfully!')
}

const userId = process.argv[2]
if (!userId) {
  console.error('❌ Usage: npx tsx scripts/init-user-permissions.ts <user_id>')
  process.exit(1)
}

initUserPermissions(userId).catch(console.error)
