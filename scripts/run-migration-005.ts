#!/usr/bin/env node
/**
 * Migration 005 執行腳本 - Super Admin Setup
 * 使用方式: npx tsx scripts/run-migration-005.ts
 */

// 手動載入環境變數
import { readFileSync } from 'fs';
import { join } from 'path';

// 讀取 .env.local
try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // 移除引號
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (error) {
  console.warn('⚠️  無法讀取 .env.local，使用現有環境變數');
}

import { query, getClient } from '../lib/db/zeabur';

async function runMigration() {
  const client = await getClient();

  try {
    console.log('='.repeat(60));
    console.log('🚀 Migration 005: Super Admin Setup');
    console.log('='.repeat(60));
    console.log('');

    // 讀取 migration 檔案
    const migrationPath = join(
      process.cwd(),
      'migrations',
      '005_super_admin_setup.sql'
    );

    console.log(`📄 讀取檔案: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf-8');

    // 執行 SQL
    console.log('⚙️  執行 SQL...\n');

    // 使用 client 而不是 query，以便看到 NOTICE 訊息
    const result = await client.query(sql);

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Migration 005 執行成功！');
    console.log('='.repeat(60));
    console.log('');
    console.log('📊 已新增/修改的內容：');
    console.log('');
    console.log('  ✓ 超級管理員帳號設定 (acejou27@gmail.com)');
    console.log('  ✓ 跨公司權限檢查函數');
    console.log('    - can_access_company()');
    console.log('    - get_manageable_companies()');
    console.log('    - can_manage_user()');
    console.log('    - can_assign_role()');
    console.log('');
    console.log('  ✓ Row Level Security (RLS) 政策');
    console.log('    - companies (SELECT, INSERT, UPDATE, DELETE)');
    console.log('    - company_members (SELECT, INSERT, UPDATE, DELETE)');
    console.log('    - customers (SELECT, INSERT, UPDATE, DELETE)');
    console.log('    - products (SELECT, INSERT, UPDATE, DELETE)');
    console.log('    - quotations (SELECT, INSERT, UPDATE, DELETE)');
    console.log('');
    console.log('  ✓ 輔助視圖');
    console.log('    - user_with_companies (使用者完整資訊)');
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    console.log('📝 下一步：');
    console.log('  1. 驗證超級管理員設定: SELECT * FROM user_roles WHERE role_id = (SELECT id FROM roles WHERE name = \'super_admin\');');
    console.log('  2. 測試 RLS 政策是否生效');
    console.log('  3. 繼續實作後端服務層');
    console.log('');
    console.log('⚠️  重要提醒：');
    console.log('  • 如果使用 Zeabur PostgreSQL，請確保 acejou27@gmail.com 已註冊');
    console.log('  • 首次登入後，系統會自動獲得超級管理員權限');
    console.log('  • 如需更換超管帳號，請參考文檔說明');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Migration 執行失敗：');
    console.error('');

    if (error.message) {
      console.error('錯誤訊息:', error.message);
    }

    if (error.detail) {
      console.error('詳細資訊:', error.detail);
    }

    if (error.hint) {
      console.error('提示:', error.hint);
    }

    console.error('');
    console.error('完整錯誤:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// 執行
runMigration();
