/**
 * 檢查 super_admin 角色設定
 */

import { query } from '../lib/db/zeabur';

async function checkAdminRole() {
  console.log('🔍 檢查 roles 表結構...\n');

  try {
    // 檢查 roles 表結構
    const schemaResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'roles'
      ORDER BY ordinal_position
    `);

    console.log('📋 roles 表欄位：');
    schemaResult.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n📊 檢查所有角色...\n');

    // 列出所有角色（使用兩種可能的欄位名稱）
    const rolesResult = await query(`
      SELECT * FROM roles
    `);

    console.log(`找到 ${rolesResult.rows.length} 個角色：`);
    rolesResult.rows.forEach((row: any) => {
      console.log(`  - ID: ${row.id}, 名稱: ${row.role_name || row.name}`);
    });

    console.log('\n👤 檢查 user_profiles 表結構...\n');

    // 檢查 user_profiles 表結構
    const userSchemaResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position
    `);

    console.log('📋 user_profiles 表欄位：');
    userSchemaResult.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n👤 檢查所有用戶...\n');

    // 列出所有用戶
    const allUsersResult = await query(`
      SELECT * FROM user_profiles LIMIT 5
    `);

    console.log(`找到 ${allUsersResult.rows.length} 個用戶（顯示前 5 個）：`);
    allUsersResult.rows.forEach((row: any) => {
      console.log(`  - User ID: ${row.user_id}`);
      console.log(`    欄位: ${Object.keys(row).join(', ')}`);
    });

    console.log('\n👥 檢查所有用戶的角色...\n');

    // 列出所有有 super_admin 角色的用戶
    const superAdminUsers = await query(`
      SELECT
        up.user_id,
        up.full_name,
        up.display_name,
        r.name as role_name,
        r.id as role_id
      FROM user_profiles up
      JOIN user_roles ur ON up.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'super_admin'
    `);

    if (superAdminUsers.rows.length === 0) {
      console.log('⚠️  沒有用戶擁有 super_admin 角色');
      console.log('   需要手動為 acejou27@gmail.com 分配 super_admin 角色');
    } else {
      console.log(`✅ 找到 ${superAdminUsers.rows.length} 個 super_admin：`);
      superAdminUsers.rows.forEach((row: any) => {
        console.log(`  - User ID: ${row.user_id}`);
        console.log(`    名稱: ${row.full_name || row.display_name || '(未設定)'}`);
        console.log(`    角色: ${row.role_name}`);
      });
    }

    console.log('\n👤 檢查所有用戶及其角色...\n');

    // 列出所有用戶及其角色
    const allUserRoles = await query(`
      SELECT
        up.user_id,
        up.full_name,
        up.display_name,
        STRING_AGG(r.name, ', ') as roles
      FROM user_profiles up
      LEFT JOIN user_roles ur ON up.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY up.user_id, up.full_name, up.display_name
      LIMIT 10
    `);

    console.log(`找到 ${allUserRoles.rows.length} 個用戶：`);
    allUserRoles.rows.forEach((row: any) => {
      console.log(`  - ${row.full_name || row.display_name || row.user_id}`);
      console.log(`    角色: ${row.roles || '(無角色)'}`);
    });

    console.log('\n✨ 檢查完成\n');

  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  }
}

// 執行腳本
checkAdminRole()
  .then(() => {
    console.log('✅ 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 腳本執行失敗:', error);
    process.exit(1);
  });
