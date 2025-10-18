#!/usr/bin/env node
/**
 * Migration 執行腳本
 * 使用方式: npm run migrate
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

import { query } from '../lib/db/zeabur';

async function runMigration() {
  try {
    console.log('🚀 開始執行 migration...\n');

    // 讀取 migration 檔案
    const migrationPath = join(
      process.cwd(),
      'migrations',
      '004_contracts_and_payments_enhancement.sql'
    );

    console.log(`📄 讀取檔案: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf-8');

    // 執行 SQL
    console.log('⚙️  執行 SQL...');
    await query(sql);

    console.log('\n✅ Migration 執行成功！');
    console.log('\n📊 已新增/修改的內容：');
    console.log('  • quotations 表：新增合約和收款欄位');
    console.log('  • customer_contracts 表：新增下次應收資訊');
    console.log('  • payments 表：新增付款頻率和逾期追蹤');
    console.log('  • payment_schedules 表：新增逾期和提醒欄位');
    console.log('  • 5 個自動化觸發器');
    console.log('  • 4 個資料庫函式');
    console.log('  • 3 個實用視圖');
    console.log('  • 14 個效能索引');

    console.log('\n📝 下一步：');
    console.log('  1. 執行測試: npm run test:migration');
    console.log('  2. 查看使用指南: docs/PAYMENT_COLLECTION_USAGE.md');
    console.log('  3. 開始開發 API 端點');

  } catch (error) {
    console.error('\n❌ Migration 執行失敗：');
    console.error(error);
    process.exit(1);
  }
}

runMigration();
