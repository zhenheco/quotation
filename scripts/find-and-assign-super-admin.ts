/**
 * 查找最近登入的用戶並分配 super_admin 角色
 */

import { query } from '../lib/db/zeabur';

async function findAndAssignSuperAdmin() {
  console.log('\n🔍 查找最近登入的用戶並分配 super_admin 角色\n');

  try {
    // 步驟 1: 查詢最近登入或建立的用戶
    console.log('📊 步驟 1: 查詢最近的用戶（按登入時間排序）...\n');

    const recentUsersResult = await query(`
      SELECT
        up.user_id,
        up.full_name,
        up.display_name,
        up.created_at,
        up.last_login_at,
        STRING_AGG(r.name, ', ') as roles
      FROM user_profiles up
      LEFT JOIN user_roles ur ON up.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY up.user_id, up.full_name, up.display_name, up.created_at, up.last_login_at
      ORDER BY COALESCE(up.last_login_at, up.created_at) DESC
      LIMIT 10
    `);

    if (recentUsersResult.rows.length === 0) {
      console.log('❌ 找不到任何用戶');
      return;
    }

    console.log(`找到 ${recentUsersResult.rows.length} 個最近的用戶：\n`);
    recentUsersResult.rows.forEach((row: any, index: number) => {
      const lastActivity = row.last_login_at || row.created_at;
      console.log(`${index + 1}. ${row.full_name || row.display_name || '(未設定)'}`);
      console.log(`   User ID: ${row.user_id}`);
      console.log(`   角色: ${row.roles || '(無角色)'}`);
      console.log(`   最近活動: ${lastActivity}`);
      console.log('');
    });

    // 步驟 2: 選擇最近的用戶（假設就是剛登入的）
    const targetUser = recentUsersResult.rows[0];

    console.log('🎯 選擇最近活動的用戶作為目標：');
    console.log(`   名稱: ${targetUser.full_name || targetUser.display_name || '(未設定)'}`);
    console.log(`   User ID: ${targetUser.user_id}`);
    console.log(`   當前角色: ${targetUser.roles || '(無角色)'}\n`);

    // 檢查是否已經有 super_admin 角色
    if (targetUser.roles && targetUser.roles.includes('super_admin')) {
      console.log('✅ 此用戶已經擁有 super_admin 角色！\n');
      return;
    }

    // 步驟 3: 獲取 super_admin 角色 ID
    console.log('🎭 步驟 2: 獲取 super_admin 角色...\n');

    const roleResult = await query(`
      SELECT id, name FROM roles WHERE name = 'super_admin'
    `);

    if (roleResult.rows.length === 0) {
      console.log('❌ 找不到 super_admin 角色');
      return;
    }

    const superAdminRole = roleResult.rows[0];
    console.log(`✅ 找到 super_admin 角色: ${superAdminRole.id}\n`);

    // 步驟 4: 分配 super_admin 角色
    console.log('🎁 步驟 3: 分配 super_admin 角色...\n');

    await query(`
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `, [targetUser.user_id, superAdminRole.id, targetUser.user_id]);

    console.log('✅ super_admin 角色已成功分配！\n');

    // 步驟 5: 驗證
    console.log('✅ 步驟 4: 驗證角色分配...\n');

    const verifyResult = await query(`
      SELECT r.name as role_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
    `, [targetUser.user_id]);

    console.log(`   ${targetUser.full_name || targetUser.display_name || targetUser.user_id} 的角色：`);
    verifyResult.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.role_name}`);
    });

    console.log('\n🎉 完成！現在可以訪問超級管理員控制台了：');
    console.log('   http://localhost:3001/admin\n');

  } catch (error) {
    console.error('\n❌ 錯誤:', error);
    throw error;
  }
}

// 執行腳本
findAndAssignSuperAdmin()
  .then(() => {
    console.log('✅ 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 腳本執行失敗:', error);
    process.exit(1);
  });
