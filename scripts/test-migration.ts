#!/usr/bin/env node
/**
 * Migration 測試腳本
 * 使用方式: npm run test:migration
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '../lib/db/zeabur';

async function testMigration() {
  try {
    console.log('🧪 開始測試 migration...\n');

    // 讀取測試檔案
    const testPath = join(
      process.cwd(),
      'migrations',
      '004_test_migration.sql'
    );

    console.log(`📄 讀取測試檔案: ${testPath}`);
    const sql = readFileSync(testPath, 'utf-8');

    // 執行測試 SQL
    console.log('⚙️  執行測試...\n');
    const results = await query(sql);

    // 顯示測試結果
    console.log('📊 測試結果：\n');

    if (Array.isArray(results)) {
      results.forEach((result: any, index: number) => {
        if (result.rows && result.rows.length > 0) {
          console.log(`測試 ${index + 1}:`);
          result.rows.forEach((row: any) => {
            console.log(`  ${JSON.stringify(row)}`);
          });
          console.log('');
        }
      });
    }

    console.log('✅ 所有測試通過！');
    console.log('\n📝 Migration 驗證成功，可以開始使用新功能。');

  } catch (error) {
    console.error('\n❌ 測試失敗：');
    console.error(error);
    process.exit(1);
  }
}

testMigration();
