/**
 * 為指定用戶分配 super_admin 角色
 *
 * 使用方式：
 * npx tsx scripts/assign-super-admin.ts [user_id]
 *
 * 如果不提供 user_id，會列出所有用戶讓你選擇
 */

import { query } from '../lib/db/zeabur';

async function assignSuperAdmin(userId?: string) {
  console.log(`\n🔐 為用戶分配 super_admin 角色\n`);

  try {
    // 步驟 1: 如果沒有提供 user_id，列出所有用戶
    if (!userId) {
      console.log('📋 步驟 1: 列出所有用戶...\n');

      const usersResult = await query(`
        SELECT
          up.user_id,
          up.full_name,
          up.display_name,
          up.created_at,
          STRING_AGG(r.name, ', ') as roles
        FROM user_profiles up
        LEFT JOIN user_roles ur ON up.user_id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        GROUP BY up.user_id, up.full_name, up.display_name, up.created_at
        ORDER BY up.created_at ASC
      `);

      if (usersResult.rows.length === 0) {
        console.log('⚠️  沒有找到任何用戶');
        console.log('   請先透過 Google OAuth 登入: http://localhost:3001/login\n');
        return;
      }

      console.log(`找到 ${usersResult.rows.length} 個用戶：\n`);
      usersResult.rows.forEach((row: any, index: number) => {
        console.log(`${index + 1}. User ID: ${row.user_id}`);
        console.log(`   名稱: ${row.full_name || row.display_name || '(未設定)'}`);
        console.log(`   角色: ${row.roles || '(無角色)'}`);
        console.log('');
      });

      console.log('請使用以下命令為特定用戶分配 super_admin 角色：');
      console.log('npx tsx scripts/assign-super-admin.ts <user_id>\n');
      return;
    }

    console.log(`📊 步驟 1: 檢查用戶資料...`);
    console.log(`   User ID: ${userId}\n`);

    const profileResult = await query(
      `SELECT * FROM user_profiles WHERE user_id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      console.log('❌ user_profiles 中找不到此用戶');
      console.log('   請確認 user_id 是否正確\n');
      return;
    }

    const profile = profileResult.rows[0];
    console.log('✅ 找到用戶:');
    console.log(`   - 名稱: ${profile.full_name || profile.display_name || '(未設定)'}`);

    // 步驟 2: 獲取 super_admin 角色 ID
    console.log('\n🎭 步驟 2: 獲取 super_admin 角色...');

    const roleResult = await query(
      `SELECT id, name FROM roles WHERE name = 'super_admin'`
    );

    if (roleResult.rows.length === 0) {
      console.log('❌ 找不到 super_admin 角色');
      console.log('   請確認數據庫中已建立 super_admin 角色');
      return;
    }

    const superAdminRole = roleResult.rows[0];
    console.log(`✅ 找到 super_admin 角色:`);
    console.log(`   - Role ID: ${superAdminRole.id}`);
    console.log(`   - Role Name: ${superAdminRole.name}`);

    // 步驟 3: 檢查用戶是否已有此角色
    console.log('\n👤 步驟 3: 檢查現有角色...');

    const existingRoleResult = await query(
      `SELECT ur.*, r.name as role_name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );

    if (existingRoleResult.rows.length > 0) {
      console.log(`   現有角色: ${existingRoleResult.rows.map((r: any) => r.role_name).join(', ')}`);

      const hasSuperAdmin = existingRoleResult.rows.some((r: any) => r.role_name === 'super_admin');
      if (hasSuperAdmin) {
        console.log('\n✅ 用戶已經擁有 super_admin 角色！');
        return;
      }
    } else {
      console.log('   此用戶目前沒有任何角色');
    }

    // 步驟 4: 分配 super_admin 角色
    console.log('\n🎁 步驟 4: 分配 super_admin 角色...');

    await query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, superAdminRole.id, userId] // assigned_by 設為自己
    );

    console.log('✅ super_admin 角色已成功分配！');

    // 步驟 5: 驗證
    console.log('\n✅ 步驟 5: 驗證角色分配...');

    const verifyResult = await query(
      `SELECT r.name as role_name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );

    console.log(`   ${profile.full_name || profile.display_name || userId} 的角色:`);
    verifyResult.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.role_name}`);
    });

    console.log('\n🎉 完成！現在可以訪問超級管理員控制台了:');
    console.log('   http://localhost:3001/admin\n');

  } catch (error) {
    console.error('\n❌ 錯誤:', error);
    throw error;
  }
}

// 執行腳本
const targetUserId = process.argv[2];

assignSuperAdmin(targetUserId)
  .then(() => {
    console.log('✅ 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 腳本執行失敗:', error);
    process.exit(1);
  });
