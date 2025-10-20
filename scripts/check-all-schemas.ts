/**
 * 檢查數據庫中的所有 schema 和表
 */

import { query } from '../lib/db/zeabur';

async function checkAllSchemas() {
  console.log('\n🔍 檢查數據庫中的所有 schema 和表\n');

  try {
    // 查詢所有 schema
    console.log('📋 步驟 1: 查詢所有 schema...\n');

    const schemasResult = await query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);

    console.log(`找到 ${schemasResult.rows.length} 個 schema：`);
    schemasResult.rows.forEach((row: any) => {
      console.log(`  - ${row.schema_name}`);
    });

    // 查詢每個 schema 中的表
    console.log('\n📊 步驟 2: 查詢每個 schema 中的表...\n');

    for (const schemaRow of schemasResult.rows) {
      const schemaName = schemaRow.schema_name;

      const tablesResult = await query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `, [schemaName]);

      console.log(`\nSchema: ${schemaName} (${tablesResult.rows.length} 個表)`);
      tablesResult.rows.forEach((row: any) => {
        console.log(`  - ${row.table_name}`);
      });
    }

    // 嘗試查詢 auth.users（如果存在）
    console.log('\n\n🔐 步驟 3: 嘗試查詢 auth.users...\n');

    try {
      const authUsersResult = await query(`
        SELECT email, created_at
        FROM auth.users
        ORDER BY created_at DESC
        LIMIT 10
      `);

      console.log('✅ auth.users 表存在！');
      console.log(`找到 ${authUsersResult.rows.length} 個用戶：\n`);
      authUsersResult.rows.forEach((row: any, index: number) => {
        console.log(`${index + 1}. ${row.email}`);
        console.log(`   建立時間: ${row.created_at}`);
      });
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        console.log('❌ auth.users 表不存在於此數據庫中');
        console.log('   Supabase Auth 數據可能在不同的數據庫中');
      } else {
        throw error;
      }
    }

    console.log('\n✨ 檢查完成\n');

  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  }
}

// 執行腳本
checkAllSchemas()
  .then(() => {
    console.log('✅ 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 腳本執行失敗:', error);
    process.exit(1);
  });
