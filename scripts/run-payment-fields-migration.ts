#!/usr/bin/env tsx
/**
 * 執行付款欄位 migration
 *
 * 此腳本會執行 015_add_quotation_payment_fields.sql
 * 為 quotations 表新增 payment_method 和 payment_notes 欄位
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// 手動載入環境變數
try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
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

import { Pool } from 'pg';

async function runMigration() {
  let pool: Pool | null = null;

  try {
    console.log('🚀 開始執行付款欄位 migration...\n');

    // 建立資料庫連接
    const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL 或 SUPABASE_DB_URL 環境變數未設定');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('📡 已連接到資料庫');

    // 讀取 migration 檔案
    const migrationPath = join(
      process.cwd(),
      'migrations',
      '015_add_quotation_payment_fields.sql'
    );

    console.log(`📄 讀取檔案: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf-8');

    // 執行 SQL
    console.log('⚙️  執行 SQL...');
    await pool.query(sql);

    console.log('\n✅ Migration 執行成功！');
    console.log('\n📊 已新增的欄位：');
    console.log('  • quotations.payment_method (VARCHAR(50) NULL)');
    console.log('  • quotations.payment_notes (TEXT NULL)');
    console.log('\n💡 支援的付款方式：');
    console.log('  • cash (現金)');
    console.log('  • bank_transfer (銀行匯款)');
    console.log('  • ach_transfer (ACH/電子轉帳)');
    console.log('  • credit_card (信用卡)');
    console.log('  • check (支票)');
    console.log('  • cryptocurrency (虛擬幣)');
    console.log('  • other (其他)');

  } catch (error) {
    console.error('\n❌ Migration 執行失敗：');
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n📡 資料庫連接已關閉');
    }
  }
}

runMigration();
